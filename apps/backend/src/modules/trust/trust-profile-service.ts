import { prisma } from "../../core/database/prisma.js";
import { ReputationStatus, TrustRank } from "@calltest/shared-types";
import { env } from "../../core/config/env.js";

export class TrustProfileService {
  /**
   * Retrieves or initializes the 1-to-1 TrustProfile for a user.
   */
  public static async getOrCreateProfile(userId: string) {
    let profile = await prisma.trustProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      profile = await prisma.trustProfile.create({
        data: {
          userId,
          trustScore: env.TRUST_INITIAL_SCORE, // 50 (Initial uncertainty)
          trustRank: TrustRank.NEW,
          reputationStatus: ReputationStatus.NORMAL,
          completedCampaignsCount: 0,
          abandonedCampaignsCount: 0,
          consecutiveGoodCampaigns: 0,
        },
      });
    }

    return profile;
  }

  /**
   * Evaluates the appropriate TrustRank based on score, historical completed campaigns, and fraud status.
   */
  public static evaluateRank(params: {
    score: number;
    completedCampaignsCount: number;
    fraudEventsCount: number;
    reputationStatus: ReputationStatus;
  }): TrustRank {
    const { score, completedCampaignsCount, fraudEventsCount, reputationStatus } = params;

    if (
      reputationStatus === ReputationStatus.RESTRICTED ||
      reputationStatus === ReputationStatus.SUSPENDED ||
      reputationStatus === ReputationStatus.BANNED ||
      score <= env.TRUST_RANK_RESTRICTED_MAX_SCORE
    ) {
      return TrustRank.RESTRICTED;
    }

    if (
      score >= env.TRUST_RANK_EXCELLENT_MIN_SCORE &&
      completedCampaignsCount >= 6 &&
      fraudEventsCount === 0
    ) {
      return TrustRank.EXCELLENT;
    }

    if (
      score >= env.TRUST_RANK_RELIABLE_MIN_SCORE &&
      completedCampaignsCount >= 3
    ) {
      return TrustRank.RELIABLE;
    }

    if (
      score >= env.TRUST_RANK_TRUSTED_MIN_SCORE &&
      completedCampaignsCount >= 1
    ) {
      return TrustRank.TRUSTED;
    }

    return TrustRank.NEW;
  }
}
