import { AuditService } from "../../core/services/audit-service.js";
import { IdentityRiskLevel, AuditAction } from "@calltest/shared-types";
import { randomUUID, createHash } from "node:crypto";

export interface UserIdentityRecord {
  id: string;
  userId: string;
  identityVersion: number;
  deviceFingerprints: string[];
  installFingerprints: string[];
  riskLevel: IdentityRiskLevel;
  riskSignals: string[];
  clusterId?: string;
  createdAt: Date;
  updatedAt: Date;
  status: "ACTIVE" | "WATCH" | "RESTRICTED";
}

export interface IdentityRiskCluster {
  id: string;
  relatedUserIds: string[];
  sharedSignals: string[];
  confidence: number; // 0–1
  riskLevel: IdentityRiskLevel;
  status: "INVESTIGATING" | "CONFIRMED" | "DISMISSED";
  createdAt: Date;
}

// In-memory persistent stores
const identitiesStore = new Map<string, UserIdentityRecord>(); // userId -> record
const clustersStore = new Map<string, IdentityRiskCluster>(); // clusterId -> record
const completedCampaignsRegistry = new Set<string>(); // "userId:campaignId"

export class UserIdentityService {
  /**
   * Resets in-memory stores for testing isolation.
   */
  public static _clearStore(): void {
    identitiesStore.clear();
    clustersStore.clear();
    completedCampaignsRegistry.clear();
  }

  /**
   * Hashes sensitive device/install identifiers with SHA-256 for Zero-PII storage.
   */
  public static hashFingerprint(raw: string): string {
    return createHash("sha256").update(raw.trim()).digest("hex");
  }

  /**
   * Retrieves or initializes a stable logical UserIdentity.
   * INVARIANT: Reinstalling app does NOT create a new logical identity.
   */
  public static async getOrCreateIdentity(
    userId: string,
    context?: {
      deviceFingerprint?: string;
      installFingerprint?: string;
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<UserIdentityRecord> {
    let identity = identitiesStore.get(userId);

    const hashedDevice = context?.deviceFingerprint ? this.hashFingerprint(context.deviceFingerprint) : undefined;
    const hashedInstall = context?.installFingerprint ? this.hashFingerprint(context.installFingerprint) : undefined;

    if (!identity) {
      identity = {
        id: randomUUID(),
        userId,
        identityVersion: 1,
        deviceFingerprints: hashedDevice ? [hashedDevice] : [],
        installFingerprints: hashedInstall ? [hashedInstall] : [],
        riskLevel: IdentityRiskLevel.LOW_RISK,
        riskSignals: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        status: "ACTIVE",
      };

      identitiesStore.set(userId, identity);

      await AuditService.log({
        userId,
        action: AuditAction.IDENTITY_CREATED,
        entityName: "UserIdentity",
        entityId: identity.id,
        changes: { identityVersion: 1, riskLevel: IdentityRiskLevel.LOW_RISK },
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      });
    } else {
      // Update existing identity with new fingerprints if encountered
      let updated = false;
      if (hashedDevice && !identity.deviceFingerprints.includes(hashedDevice)) {
        identity.deviceFingerprints.push(hashedDevice);
        updated = true;
      }
      if (hashedInstall && !identity.installFingerprints.includes(hashedInstall)) {
        identity.installFingerprints.push(hashedInstall);
        updated = true;
      }
      if (updated) {
        identity.updatedAt = new Date();
      }
    }

    return identity;
  }

  /**
   * Analyzes signals for related accounts / multi-account farming.
   * INVARIANT: Shared IP/network alone NEVER creates a cluster or marks multi-account abuse.
   * INVARIANT: A risk signal NEVER results in an automated ban.
   */
  public static async detectRelatedAccounts(params: {
    userId: string;
    deviceFingerprint?: string;
    installFingerprint?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<{ isMultiAccountSuspected: boolean; cluster?: IdentityRiskCluster; riskLevel: IdentityRiskLevel }> {
    const currentIdentity = await this.getOrCreateIdentity(params.userId, params);

    if (!params.deviceFingerprint && !params.installFingerprint) {
      return { isMultiAccountSuspected: false, riskLevel: currentIdentity.riskLevel };
    }

    const hashedDevice = params.deviceFingerprint ? this.hashFingerprint(params.deviceFingerprint) : undefined;
    const hashedInstall = params.installFingerprint ? this.hashFingerprint(params.installFingerprint) : undefined;

    const collidingUserIds: string[] = [];
    const sharedSignals: string[] = [];

    for (const [otherUserId, otherIdentity] of identitiesStore.entries()) {
      if (otherUserId === params.userId) continue;

      let matched = false;
      if (hashedDevice && otherIdentity.deviceFingerprints.includes(hashedDevice)) {
        collidingUserIds.push(otherUserId);
        sharedSignals.push("SAME_DEVICE_FINGERPRINT");
        matched = true;
      }
      if (hashedInstall && otherIdentity.installFingerprints.includes(hashedInstall)) {
        collidingUserIds.push(otherUserId);
        sharedSignals.push("SAME_INSTALL_FINGERPRINT");
        matched = true;
      }

      if (matched && !otherIdentity.riskSignals.includes("MULTI_ACCOUNT_SIGNAL")) {
        otherIdentity.riskSignals.push("MULTI_ACCOUNT_SIGNAL");
        otherIdentity.riskLevel = IdentityRiskLevel.MEDIUM_RISK;
      }
    }

    if (collidingUserIds.length > 0) {
      const allClusterUsers = Array.from(new Set([params.userId, ...collidingUserIds]));

      // Create or update IdentityRiskCluster
      const clusterId = currentIdentity.clusterId || randomUUID();
      const cluster: IdentityRiskCluster = {
        id: clusterId,
        relatedUserIds: allClusterUsers,
        sharedSignals: Array.from(new Set(sharedSignals)),
        confidence: 0.85,
        riskLevel: IdentityRiskLevel.MEDIUM_RISK,
        status: "INVESTIGATING",
        createdAt: new Date(),
      };

      clustersStore.set(clusterId, cluster);

      currentIdentity.clusterId = clusterId;
      currentIdentity.riskLevel = IdentityRiskLevel.MEDIUM_RISK;
      if (!currentIdentity.riskSignals.includes("MULTI_ACCOUNT_SIGNAL")) {
        currentIdentity.riskSignals.push("MULTI_ACCOUNT_SIGNAL");
      }

      await AuditService.log({
        userId: params.userId,
        action: AuditAction.RISK_SIGNAL_CREATED,
        entityName: "IdentityRiskCluster",
        entityId: clusterId,
        changes: {
          collidingUsersCount: allClusterUsers.length,
          sharedSignals: cluster.sharedSignals,
          riskLevel: IdentityRiskLevel.MEDIUM_RISK,
        },
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      });

      return {
        isMultiAccountSuspected: true,
        cluster,
        riskLevel: IdentityRiskLevel.MEDIUM_RISK,
      };
    }

    return {
      isMultiAccountSuspected: false,
      riskLevel: currentIdentity.riskLevel,
    };
  }

  /**
   * Idempotently records a campaign completion for a tester.
   * INVARIANT: A single campaign can only increment progression ONCE for a given user.
   */
  public static async recordCampaignCompletion(
    userId: string,
    campaignId: string
  ): Promise<{ alreadyRecorded: boolean; totalUniqueCompletions: number }> {
    const key = `${userId}:${campaignId}`;

    if (completedCampaignsRegistry.has(key)) {
      await AuditService.log({
        userId,
        campaignId,
        action: AuditAction.DUPLICATE_PROGRESS_ATTEMPT,
        entityName: "CampaignCompletion",
        entityId: key,
        changes: { duplicate: true },
      });

      const userTotal = this.countUserCompletedCampaigns(userId);
      return { alreadyRecorded: true, totalUniqueCompletions: userTotal };
    }

    completedCampaignsRegistry.add(key);
    const userTotal = this.countUserCompletedCampaigns(userId);

    await AuditService.log({
      userId,
      campaignId,
      action: AuditAction.CAMPAIGN_COMPLETION_COUNTED,
      entityName: "CampaignCompletion",
      entityId: key,
      changes: { totalUniqueCompletions: userTotal },
    });

    return { alreadyRecorded: false, totalUniqueCompletions: userTotal };
  }

  /**
   * Counts unique completed campaigns for a user.
   */
  public static countUserCompletedCampaigns(userId: string): number {
    let count = 0;
    const prefix = `${userId}:`;
    for (const key of completedCampaignsRegistry) {
      if (key.startsWith(prefix)) {
        count++;
      }
    }
    return count;
  }

  /**
   * Calculates deterministic matching score incorporating Progression Tier, Developer Priority, and Risk Signals.
   * INVARIANT: 100% NEW pool produces valid positive scores > 0 and does not block V1 campaigns.
   */
  public static calculateMatchingScore(params: {
    candidate: {
      userId: string;
      reliabilityScore: number;
      progressionTier: "NEW" | "ACTIVE" | "RELIABLE" | "HIGHLY_RELIABLE";
      riskLevel?: IdentityRiskLevel;
    };
    developerBonusMultiplier?: number;
  }): {
    matchScore: number;
    progressionMultiplier: number;
    riskMultiplier: number;
    developerPriorityMultiplier: number;
  } {
    const { candidate } = params;

    // 1. Progression Tier Multipliers
    let progressionMultiplier = 1.0;
    if (candidate.progressionTier === "HIGHLY_RELIABLE") {
      progressionMultiplier = 1.5;
    } else if (candidate.progressionTier === "RELIABLE") {
      progressionMultiplier = 1.35;
    } else if (candidate.progressionTier === "ACTIVE") {
      progressionMultiplier = 1.15;
    } else {
      progressionMultiplier = 1.0; // NEW tier
    }

    // 2. Risk Level Multipliers (Risk reduces priority, never automated bans)
    let riskMultiplier = 1.0;
    if (candidate.riskLevel === IdentityRiskLevel.HIGH_RISK) {
      riskMultiplier = 0.5;
    } else if (candidate.riskLevel === IdentityRiskLevel.MEDIUM_RISK) {
      riskMultiplier = 0.8;
    } else if (candidate.riskLevel === IdentityRiskLevel.REVIEW_REQUIRED) {
      riskMultiplier = 0.3;
    } else {
      riskMultiplier = 1.0; // LOW_RISK
    }

    // 3. Developer Priority Bonus (Reward responsible developer participation)
    const developerPriorityMultiplier = params.developerBonusMultiplier || 1.0;

    // Base score computed from reliability
    const baseScore = Math.max(10, candidate.reliabilityScore);

    const matchScore = Math.round(
      baseScore * progressionMultiplier * riskMultiplier * developerPriorityMultiplier
    );

    return {
      matchScore,
      progressionMultiplier,
      riskMultiplier,
      developerPriorityMultiplier,
    };
  }
}
