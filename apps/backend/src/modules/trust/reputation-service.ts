import { prisma } from "../../core/database/prisma.js";
import { AuditService } from "../../core/services/audit-service.js";
import {
  AuditAction,
  ReputationStatus,
  TrustRank,
  UserStatus,
} from "@calltest/shared-types";
import { TrustProfileService } from "./trust-profile-service.js";

export interface UserReputationSummary {
  userId: string;
  reputationStatus: ReputationStatus;
  trustRank: TrustRank;
  trustScore: number;
  activeRestrictions: string[];
}

export class ReputationService {
  /**
   * Retrieves comprehensive reputation and restriction details for a user.
   */
  public static async getReputation(userId: string): Promise<UserReputationSummary> {
    const profile = await TrustProfileService.getOrCreateProfile(userId);

    const activeRestrictions: string[] = [];
    switch (profile.reputationStatus) {
      case ReputationStatus.WATCH:
        activeRestrictions.push("MONITORED_MATCHING");
        break;
      case ReputationStatus.RESTRICTED:
        activeRestrictions.push("REDUCED_CAPACITY", "MANUAL_REVIEW_REQUIRED");
        break;
      case ReputationStatus.SUSPENDED:
        activeRestrictions.push("NO_NEW_ASSIGNMENTS", "ACCOUNT_SUSPENDED");
        break;
      case ReputationStatus.BANNED:
        activeRestrictions.push("PERMANENTLY_BLOCKED", "ACCOUNT_BANNED");
        break;
      case ReputationStatus.NORMAL:
      default:
        break;
    }

    return {
      userId,
      reputationStatus: profile.reputationStatus as unknown as ReputationStatus,
      trustRank: profile.trustRank as unknown as TrustRank,
      trustScore: profile.trustScore,
      activeRestrictions,
    };
  }

  /**
   * Updates user reputation status with audit logging and user state synchronization.
   */
  public static async updateReputation(params: {
    userId: string;
    newStatus: ReputationStatus;
    reason: string;
    actorId?: string;
    context?: { ipAddress?: string; userAgent?: string };
  }) {
    const { userId, newStatus, reason, actorId, context } = params;

    const profile = await TrustProfileService.getOrCreateProfile(userId);
    const previousStatus = profile.reputationStatus;

    if (previousStatus === newStatus) {
      return profile;
    }

    await prisma.$transaction(async (tx) => {
      await tx.trustProfile.update({
        where: { userId },
        data: { reputationStatus: newStatus },
      });

      if (newStatus === ReputationStatus.BANNED) {
        await tx.user.update({
          where: { id: userId },
          data: { status: UserStatus.BANNED },
        });
      } else if (newStatus === ReputationStatus.SUSPENDED) {
        await tx.user.update({
          where: { id: userId },
          data: { status: UserStatus.SUSPENDED },
        });
      } else if (previousStatus === ReputationStatus.SUSPENDED && newStatus === ReputationStatus.NORMAL) {
        await tx.user.update({
          where: { id: userId },
          data: { status: UserStatus.ACTIVE },
        });
      }
    });

    await AuditService.log({
      userId: actorId || userId,
      action: AuditAction.REPUTATION_CHANGED,
      entityName: "TrustProfile",
      entityId: userId,
      changes: {
        previousStatus,
        newStatus,
        reason,
      },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    return {
      userId,
      previousStatus,
      newStatus,
      reason,
    };
  }
}
