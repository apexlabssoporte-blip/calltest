import { prisma } from "../../core/database/prisma.js";
import { env } from "../../core/config/env.js";
import {
  AttemptStatus,
  CampaignRisk,
  TesterStatus,
} from "@calltest/shared-types";
import { NotFoundError } from "../../core/errors/app-error.js";

export interface CampaignHealthMetrics {
  campaignId: string;
  targetActiveTesters: number;
  maxActiveTesters: number;
  activeTesters: number;
  lowActivityTesters: number;
  abandonedTesters: number;
  completedTesters: number;
  totalEnrolledTesters: number;
  missionCompletionRate: number;
  activityRate: number;
  replacementNeed: number;
  availableCapacity: number;
  campaignRisk: CampaignRisk;
}

export class CampaignHealthService {
  /**
   * Calculates real-time health metrics, risk classification, and controlled replacement needs for a campaign.
   */
  public static async calculateHealth(
    campaignId: string,
  ): Promise<CampaignHealthMetrics> {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        campaignTesters: true,
        missions: true,
      },
    });

    if (!campaign) {
      throw new NotFoundError("Campaign not found");
    }

    const testers = campaign.campaignTesters;

    // 1. Participant count breakdowns strictly separating ACTIVE from LOW_ACTIVITY and ABANDONED
    let activeTesters = 0;
    let lowActivityTesters = 0;
    let abandonedTesters = 0;
    let completedTesters = 0;
    let totalScoreSum = 0;
    let scoredTestersCount = 0;

    for (const t of testers) {
      if (t.status === TesterStatus.ACTIVE) {
        activeTesters++;
        totalScoreSum += t.activityScore;
        scoredTestersCount++;
      } else if (t.status === TesterStatus.LOW_ACTIVITY) {
        lowActivityTesters++;
        totalScoreSum += t.activityScore;
        scoredTestersCount++;
      } else if (t.status === TesterStatus.ABANDONED) {
        abandonedTesters++;
      } else if (t.status === TesterStatus.COMPLETED) {
        completedTesters++;
      }
    }

    const totalEnrolledTesters =
      activeTesters + lowActivityTesters + completedTesters +
      testers.filter((t) => t.status === TesterStatus.INVITED).length;

    // 2. Average activity rate of active and low activity participants
    const activityRate =
      scoredTestersCount > 0
        ? Math.round((totalScoreSum / scoredTestersCount) * 10) / 10
        : 100.0;

    // 3. Mission completion rate across campaign
    const totalMissions = campaign.missions.length;
    const validatedAttempts = await prisma.missionAttempt.count({
      where: {
        mission: { campaignId },
        status: AttemptStatus.VALIDATED,
      },
    });

    const expectedMissionCompletions = totalMissions * Math.max(1, activeTesters);
    const missionCompletionRate =
      totalMissions > 0
        ? Math.round(
            Math.min(1.0, validatedAttempts / Math.max(1, expectedMissionCompletions)) *
              100,
          ) / 100
        : 1.0;

    // 4. Replacement Need Calculation:
    // Controlled replacement: Target is 12 active testers.
    // If activeTesters >= targetTesters (12), replacementNeed is 0.
    // If activeTesters < targetTesters, replacementNeed = min(target - active, max - active).
    const targetTesters = campaign.targetTesters; // 12
    const maxTesters = campaign.maxTesters;       // 15

    let replacementNeed = 0;
    if (activeTesters < targetTesters) {
      replacementNeed = Math.min(
        targetTesters - activeTesters,
        Math.max(0, maxTesters - activeTesters),
      );
    }

    const availableCapacity = Math.max(0, maxTesters - activeTesters);

    // 5. Campaign Risk Classification
    let campaignRisk: CampaignRisk;

    if (
      activeTesters >= targetTesters &&
      activityRate >= env.HEALTH_THRESHOLD_HEALTHY_ACTIVITY &&
      abandonedTesters === 0
    ) {
      campaignRisk = CampaignRisk.HEALTHY;
    } else if (
      activeTesters <= env.HEALTH_THRESHOLD_CRITICAL_ACTIVE ||
      abandonedTesters >= 3
    ) {
      campaignRisk = CampaignRisk.CRITICAL;
    } else if (
      activeTesters <= env.HEALTH_THRESHOLD_AT_RISK_ACTIVE ||
      abandonedTesters >= 1
    ) {
      campaignRisk = CampaignRisk.AT_RISK;
    } else if (activeTesters === 11 || (activeTesters >= 12 && lowActivityTesters >= 3)) {
      campaignRisk = CampaignRisk.WARNING;
    } else {
      campaignRisk = CampaignRisk.WARNING;
    }

    return {
      campaignId,
      targetActiveTesters: targetTesters,
      maxActiveTesters: maxTesters,
      activeTesters,
      lowActivityTesters,
      abandonedTesters,
      completedTesters,
      totalEnrolledTesters,
      missionCompletionRate,
      activityRate,
      replacementNeed,
      availableCapacity,
      campaignRisk,
    };
  }
}
