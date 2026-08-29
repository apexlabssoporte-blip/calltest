import { prisma } from "../../core/database/prisma.js";
import { env } from "../../core/config/env.js";
import {
  TesterExposureLevel,
  TesterStatus,
} from "@calltest/shared-types";

export interface ExposureDetails {
  userId: string;
  level: TesterExposureLevel;
  maxActiveCampaigns: number;
  completedCampaignsCount: number;
  abandonedCampaignsCount: number;
  averageActivityScore: number;
}

export class TesterExposureService {
  /**
   * Retrieves or computes the exposure profile and capacity for a tester.
   * Promotes or demotes exposure tier based on sustained historical evidence (not on a single event).
   */
  public static async getExposureDetails(userId: string): Promise<ExposureDetails> {
    let profile = await prisma.testerExposureProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      profile = await prisma.testerExposureProfile.create({
        data: {
          userId,
          level: TesterExposureLevel.NEW,
          completedCampaignsCount: 0,
          abandonedCampaignsCount: 0,
        },
      });
    }

    // Analyze historical participation for dynamic tier evaluation
    const participations = await prisma.campaignTester.findMany({
      where: { testerId: userId },
      select: {
        status: true,
        activityScore: true,
      },
    });

    let completedCount = 0;
    let abandonedCount = 0;
    let totalScoreSum = 0;

    for (const p of participations) {
      if (p.status === TesterStatus.COMPLETED) {
        completedCount++;
        totalScoreSum += p.activityScore;
      } else if (p.status === TesterStatus.ABANDONED) {
        abandonedCount++;
      } else if (p.status === TesterStatus.ACTIVE || p.status === TesterStatus.LOW_ACTIVITY) {
        totalScoreSum += p.activityScore;
      }
    }

    const totalEvaluated = participations.length;
    const averageScore = totalEvaluated > 0 ? totalScoreSum / totalEvaluated : 100;
    const abandonmentRate = totalEvaluated > 0 ? abandonedCount / totalEvaluated : 0;

    // Determine progressive exposure level based on sustained behavior
    let evaluatedLevel: TesterExposureLevel = TesterExposureLevel.NEW;

    if (abandonmentRate >= 0.4 && abandonedCount >= 2) {
      // Demote on repeated abandonment
      evaluatedLevel = TesterExposureLevel.NEW;
    } else if (completedCount >= 6 && averageScore >= 85 && abandonmentRate < 0.1) {
      evaluatedLevel = TesterExposureLevel.HIGH_PERFORMER;
    } else if (completedCount >= 3 && averageScore >= 75 && abandonmentRate < 0.2) {
      evaluatedLevel = TesterExposureLevel.ESTABLISHED;
    } else if (completedCount >= 1 && averageScore >= 60 && abandonmentRate < 0.3) {
      evaluatedLevel = TesterExposureLevel.PROBATION;
    } else {
      evaluatedLevel = TesterExposureLevel.NEW;
    }

    // Update profile if level changed
    if (profile.level !== evaluatedLevel) {
      profile = await prisma.testerExposureProfile.update({
        where: { userId },
        data: {
          level: evaluatedLevel,
          completedCampaignsCount: completedCount,
          abandonedCampaignsCount: abandonedCount,
        },
      });
    }

    // Calculate maximum active campaign capacity
    let maxActiveCampaigns: number;
    if (profile.overrideMaxCampaigns !== null && profile.overrideMaxCampaigns !== undefined) {
      maxActiveCampaigns = profile.overrideMaxCampaigns;
    } else {
      switch (evaluatedLevel) {
        case TesterExposureLevel.HIGH_PERFORMER:
          maxActiveCampaigns = env.EXPOSURE_MAX_HIGH_PERFORMER; // 4
          break;
        case TesterExposureLevel.ESTABLISHED:
          maxActiveCampaigns = env.EXPOSURE_MAX_ESTABLISHED; // 3
          break;
        case TesterExposureLevel.PROBATION:
          maxActiveCampaigns = env.EXPOSURE_MAX_PROBATION; // 2
          break;
        case TesterExposureLevel.NEW:
        default:
          maxActiveCampaigns = env.EXPOSURE_MAX_NEW; // 1
          break;
      }
    }

    return {
      userId,
      level: evaluatedLevel,
      maxActiveCampaigns,
      completedCampaignsCount: completedCount,
      abandonedCampaignsCount: abandonedCount,
      averageActivityScore: Math.round(averageScore * 10) / 10,
    };
  }
}
