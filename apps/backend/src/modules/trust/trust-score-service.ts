import { prisma } from "../../core/database/prisma.js";
import { AuditService } from "../../core/services/audit-service.js";
import {
  AttemptStatus,
  AuditAction,
  ReputationStatus,
  TesterStatus,
  TrustEventType,
  TrustRank,
} from "@calltest/shared-types";
import { env } from "../../core/config/env.js";
import { TrustProfileService } from "./trust-profile-service.js";
import { FraudScoreService } from "../fraud/fraud-score-service.js";

export interface TrustScoreDetails {
  userId: string;
  trustScore: number;
  trustRank: TrustRank;
  previousScore: number;
  previousRank: TrustRank;
  completedCampaignsCount: number;
  abandonedCampaignsCount: number;
  validatedMissionsCount: number;
  fraudScore: number;
  totalPenaltiesImpact: number;
}

export class TrustScoreService {
  /**
   * Recalculates multi-signal Trust Score (0 - 100), updates profile, and appends an immutable TrustHistory entry.
   * Concurrency-safe inside database transaction.
   */
  public static async recalculateAndPersist(params: {
    userId: string;
    eventType: TrustEventType;
    reason: string;
    sourceId?: string;
    metadata?: Record<string, unknown>;
    actorId?: string;
    context?: { ipAddress?: string; userAgent?: string };
  }): Promise<TrustScoreDetails> {
    const { userId, eventType, reason, sourceId, metadata, actorId, context } = params;

    const profile = await TrustProfileService.getOrCreateProfile(userId);
    const fraudScoreResult = await FraudScoreService.calculateFraudScore(userId);

    // 1. Gather historical performance metrics
    const [participations, validatedMissionsCount, usefulFeedbacksCount, penalties] =
      await Promise.all([
        prisma.campaignTester.findMany({
          where: { testerId: userId },
          select: { status: true, isReplacement: true },
        }),
        prisma.missionAttempt.count({
          where: { testerId: userId, status: AttemptStatus.VALIDATED },
        }),
        prisma.feedback.count({
          where: { testerId: userId, usefulnessScore: { gte: 1 } },
        }),
        prisma.trustPenalty.findMany({
          where: { userId },
          select: { scoreImpact: true },
        }),
      ]);

    let completedCampaignsCount = 0;
    let abandonedCampaignsCount = 0;

    for (const p of participations) {
      if (p.status === TesterStatus.COMPLETED) {
        completedCampaignsCount++;
      } else if (p.status === TesterStatus.ABANDONED) {
        abandonedCampaignsCount++;
      }
    }

    const totalPenaltiesImpact = penalties.reduce((acc, p) => acc + p.scoreImpact, 0);

    // 2. Multi-Signal Score Computation
    const baseScore = env.TRUST_INITIAL_SCORE; // 50
    const missionsBonus = Math.min(20, validatedMissionsCount * 1);
    const campaignsBonus = Math.min(25, completedCampaignsCount * 5);
    const feedbackBonus = Math.min(10, usefulFeedbacksCount * 2);
    const abandonmentDeduction = abandonedCampaignsCount * 15;
    const fraudDeduction = Math.round(fraudScoreResult.fraudScore * 0.5);

    const calculatedRawScore =
      baseScore +
      missionsBonus +
      campaignsBonus +
      feedbackBonus -
      abandonmentDeduction -
      totalPenaltiesImpact -
      fraudDeduction;

    // Strict Boundary Enforcement: 0 <= trustScore <= 100
    const finalTrustScore = Math.min(100, Math.max(0, calculatedRawScore));

    // 3. Evaluate Target TrustRank
    const targetRank = TrustProfileService.evaluateRank({
      score: finalTrustScore,
      completedCampaignsCount,
      fraudEventsCount: fraudScoreResult.unresolvedEventsCount,
      reputationStatus: profile.reputationStatus as unknown as ReputationStatus,
    });

    const previousScore = profile.trustScore;
    const previousRank = profile.trustRank as unknown as TrustRank;

    // 4. Atomic Transactional Persistence
    await prisma.$transaction(async (tx) => {
      // Update TrustProfile
      await tx.trustProfile.update({
        where: { userId },
        data: {
          trustScore: finalTrustScore,
          trustRank: targetRank,
          completedCampaignsCount,
          abandonedCampaignsCount,
        },
      });

      // Update User table summary columns
      await tx.user.update({
        where: { id: userId },
        data: {
          trustScore: finalTrustScore,
          rank: targetRank,
        },
      });

      // Insert Immutable History Record
      await tx.trustHistory.create({
        data: {
          userId,
          previousScore,
          newScore: finalTrustScore,
          previousRank,
          newRank: targetRank,
          eventType,
          reason,
          sourceId,
          metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
        },
      });
    });

    // 5. Audit Log
    if (previousScore !== finalTrustScore || previousRank !== targetRank) {
      await AuditService.log({
        userId: actorId || userId,
        action: AuditAction.TRUST_CHANGED,
        entityName: "TrustProfile",
        entityId: userId,
        changes: {
          previousScore,
          newScore: finalTrustScore,
          previousRank,
          newRank: targetRank,
          eventType,
          reason,
        },
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      });
    }

    return {
      userId,
      trustScore: finalTrustScore,
      trustRank: targetRank,
      previousScore,
      previousRank,
      completedCampaignsCount,
      abandonedCampaignsCount,
      validatedMissionsCount,
      fraudScore: fraudScoreResult.fraudScore,
      totalPenaltiesImpact,
    };
  }
}
