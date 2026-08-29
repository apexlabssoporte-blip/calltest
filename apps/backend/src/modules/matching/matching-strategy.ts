import { prisma } from "../../core/database/prisma.js";
import { env } from "../../core/config/env.js";
import {
  TesterExposureLevel,
  UserRole,
  UserStatus,
} from "@calltest/shared-types";
import { CampaignCompatibilityService } from "./compatibility-service.js";
import { TrustProfileService } from "../trust/trust-profile-service.js";

export interface MatchingCandidate {
  testerId: string;
  score: number;
  activityScore: number;
  completionRate: number;
  currentLoad: number;
  exposureLevel: TesterExposureLevel;
  trustScore: number;
}

export interface MatchingStrategy {
  rankCandidates(campaignId: string, limit: number): Promise<MatchingCandidate[]>;
}

export class DefaultMatchingStrategy implements MatchingStrategy {
  /**
   * Evaluates and ranks candidate testers for a campaign using an internal composite score (0-100)
   * incorporating Activity, Completion, Load, Exposure, and Trust.
   */
  public async rankCandidates(
    campaignId: string,
    limit: number,
  ): Promise<MatchingCandidate[]> {
    // 1. Fetch potential tester pool
    const candidateUsers = await prisma.user.findMany({
      where: {
        status: UserStatus.ACTIVE,
        role: {
          in: [UserRole.TESTER, UserRole.BOTH],
        },
      },
      select: { id: true },
    });

    const rankedCandidates: MatchingCandidate[] = [];

    for (const candidate of candidateUsers) {
      const compatibility = await CampaignCompatibilityService.evaluateCompatibility(
        campaignId,
        candidate.id,
      );

      if (compatibility.isCompatible && compatibility.load) {
        const load = compatibility.load;
        const exposure = load.exposure;
        const trustProfile = await TrustProfileService.getOrCreateProfile(candidate.id);

        const totalParticipations =
          exposure.completedCampaignsCount + exposure.abandonedCampaignsCount;
        const completionRate =
          totalParticipations > 0
            ? exposure.completedCampaignsCount / totalParticipations
            : 0.8;

        const inverseLoad =
          load.maxActiveCampaigns > 0
            ? (load.maxActiveCampaigns - load.activeCampaignsCount) /
              load.maxActiveCampaigns
            : 0;

        let exposureScore = 60;
        switch (exposure.level) {
          case TesterExposureLevel.HIGH_PERFORMER:
            exposureScore = 100;
            break;
          case TesterExposureLevel.ESTABLISHED:
            exposureScore = 90;
            break;
          case TesterExposureLevel.PROBATION:
            exposureScore = 75;
            break;
          case TesterExposureLevel.NEW:
          default:
            exposureScore = 60;
            break;
        }

        // Multi-Signal Composite Matching Score (0 - 100)
        const compositeScore =
          exposure.averageActivityScore * env.MATCHING_WEIGHT_ACTIVITY +
          completionRate * 100 * env.MATCHING_WEIGHT_COMPLETION +
          inverseLoad * 100 * env.MATCHING_WEIGHT_INVERSE_LOAD +
          exposureScore * env.MATCHING_WEIGHT_EXPOSURE +
          trustProfile.trustScore * env.MATCHING_WEIGHT_TRUST;

        const finalScore = Math.round(Math.min(100, Math.max(0, compositeScore)) * 10) / 10;

        rankedCandidates.push({
          testerId: candidate.id,
          score: finalScore,
          activityScore: exposure.averageActivityScore,
          completionRate: Math.round(completionRate * 100) / 100,
          currentLoad: load.activeCampaignsCount,
          exposureLevel: exposure.level,
          trustScore: trustProfile.trustScore,
        });
      }
    }

    // Sort descending by calculated composite score
    rankedCandidates.sort((a, b) => b.score - a.score);

    return rankedCandidates.slice(0, limit);
  }
}
