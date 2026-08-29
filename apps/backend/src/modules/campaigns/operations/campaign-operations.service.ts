import { prisma } from "../../../core/database/prisma.js";
import { CampaignHealthService } from "../../campaign-health/service.js";
import { ParticipationVerificationService } from "../../participation/service.js";
import {
  AttemptStatus,
  CampaignRisk,
  CampaignStatus,
  GoogleGroupValidationStatus,
  PlayStoreValidationStatus,
  TesterStatus,
} from "@calltest/shared-types";
import { NotFoundError } from "../../../core/errors/app-error.js";

export interface MissionProgressSummary {
  totalMissions: number;
  totalAttempts: number;
  completedAttempts: number;
  completionRate: number;
}

export interface CampaignOperationsSummary {
  campaignId: string;
  campaignName: string;
  appId: string;
  appName: string;
  packageName: string;
  status: CampaignStatus;
  durationDays: number;
  daysElapsed: number;
  daysRemaining: number;
  startsAt: Date | null;
  endsAt: Date | null;
  expectedEndAt: Date | null;
  targetActiveTesters: number;
  assignedTestersCount: number;
  installationClaimedCount: number;
  installationVerifiedCount: number;
  participationVerifiedCount: number;
  pendingVerificationCount: number;
  activeTestersCount: number;
  lowActivityTestersCount: number;
  abandonedTestersCount: number;
  completedTestersCount: number;
  replacementCount: number;
  missionProgress: MissionProgressSummary;
  missionsSummary: {
    totalMissions: number;
    completedAttempts: number;
    pendingAttempts: number;
    rejectedAttempts: number;
  };
  health: {
    risk: CampaignRisk;
    score: number;
    replacementNeeded: number;
    canAddTesters: boolean;
  };
  storeValidationStatus: PlayStoreValidationStatus;
  groupValidationStatus: GoogleGroupValidationStatus;
  developerConfirmedLinksTest: boolean;
  publicVerifiedAt: Date | null;
}

export class CampaignOperationsService {
  /**
   * Aggregates real-time operational metrics for a campaign dashboard.
   */
  public static async getCampaignOperationsSummary(campaignId: string): Promise<CampaignOperationsSummary> {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        app: true,
        campaignTesters: {
          include: {
            missionAttempts: true,
          },
        },
        missions: true,
      },
    });

    if (!campaign) {
      throw new NotFoundError("Campaign not found");
    }

    // 1. Calculate Days Elapsed and Days Remaining
    const now = new Date();
    let daysElapsed = 0;
    let daysRemaining = campaign.durationDays;
    let expectedEndAt: Date | null = campaign.endsAt;

    if (campaign.startsAt) {
      const startMs = campaign.startsAt.getTime();
      const nowMs = now.getTime();
      const elapsedMs = Math.max(0, nowMs - startMs);
      daysElapsed = Math.min(campaign.durationDays, Math.floor(elapsedMs / (1000 * 60 * 60 * 24)));
      daysRemaining = Math.max(0, campaign.durationDays - daysElapsed);

      if (!expectedEndAt) {
        expectedEndAt = new Date(startMs + campaign.durationDays * 24 * 60 * 60 * 1000);
      }
    }

    // 2. Tester Breakdown
    let activeCount = 0;
    let lowActivityCount = 0;
    let abandonedCount = 0;
    let completedCount = 0;
    let replacementCount = 0;
    let totalAttempts = 0;
    let completedAttempts = 0;

    for (const ct of campaign.campaignTesters) {
      if (ct.status === TesterStatus.ACTIVE) activeCount++;
      else if (ct.status === TesterStatus.LOW_ACTIVITY) lowActivityCount++;
      else if (ct.status === TesterStatus.ABANDONED) abandonedCount++;
      else if (ct.status === TesterStatus.COMPLETED) completedCount++;

      if (ct.isReplacement) {
        replacementCount++;
      }

      totalAttempts += ct.missionAttempts.length;
      completedAttempts += ct.missionAttempts.filter(
        (a) => a.status === AttemptStatus.VALIDATED || a.status === AttemptStatus.SUBMITTED,
      ).length;
    }

    // 3. Mission Progress
    const totalMissions = campaign.missions.length;
    const potentialExpectedAttempts = Math.max(1, activeCount * totalMissions);
    const completionRate = Math.min(
      100,
      Math.round((completedAttempts / potentialExpectedAttempts) * 100),
    );

    // 4. Delegate to CampaignHealthService and ParticipationVerificationService
    const [healthResult, partSummary] = await Promise.all([
      CampaignHealthService.calculateHealth(campaignId),
      ParticipationVerificationService.getCampaignParticipationSummary(campaignId),
    ]);

    return {
      campaignId: campaign.id,
      campaignName: campaign.name,
      appId: campaign.app.id,
      appName: campaign.app.name,
      packageName: campaign.app.packageName,
      status: campaign.status as unknown as CampaignStatus,
      durationDays: campaign.durationDays,
      daysElapsed,
      daysRemaining,
      startsAt: campaign.startsAt,
      endsAt: campaign.endsAt,
      expectedEndAt,
      targetActiveTesters: campaign.targetTesters,
      assignedTestersCount: partSummary.assignedTestersCount,
      installationClaimedCount: partSummary.installationClaimedCount,
      installationVerifiedCount: partSummary.installationVerifiedCount,
      participationVerifiedCount: partSummary.participationVerifiedCount,
      pendingVerificationCount: partSummary.pendingVerificationCount,
      activeTestersCount: activeCount,
      lowActivityTestersCount: lowActivityCount,
      abandonedTestersCount: abandonedCount,
      completedTestersCount: completedCount,
      replacementCount,
      missionProgress: {
        totalMissions,
        totalAttempts,
        completedAttempts,
        completionRate,
      },
      missionsSummary: partSummary.missionsSummary,
      health: {
        risk: healthResult.campaignRisk,
        score: healthResult.activityRate,
        replacementNeeded: healthResult.replacementNeed,
        canAddTesters: healthResult.availableCapacity > 0,
      },
      storeValidationStatus: campaign.storeValidationStatus as unknown as PlayStoreValidationStatus,
      groupValidationStatus: campaign.groupValidationStatus as unknown as GoogleGroupValidationStatus,
      developerConfirmedLinksTest: campaign.developerConfirmedLinksTest,
      publicVerifiedAt: campaign.publicVerifiedAt,
    };
  }
}
