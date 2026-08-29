import { prisma } from "../../core/database/prisma.js";
import { FraudSeverity, ReputationStatus } from "@calltest/shared-types";
import { env } from "../../core/config/env.js";

export interface FraudScoreResult {
  userId: string;
  fraudScore: number;
  unresolvedEventsCount: number;
  criticalEventsCount: number;
  highestSeverity: FraudSeverity | null;
  recommendedStatus: ReputationStatus;
}

export class FraudScoreService {
  /**
   * Calculates a bounded, normalized Fraud Score (0 - 100) based on accumulated unresolved fraud evidence.
   */
  public static async calculateFraudScore(userId: string): Promise<FraudScoreResult> {
    const unresolvedEvents = await prisma.fraudEvent.findMany({
      where: {
        userId,
        resolvedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });

    if (unresolvedEvents.length === 0) {
      return {
        userId,
        fraudScore: 0,
        unresolvedEventsCount: 0,
        criticalEventsCount: 0,
        highestSeverity: null,
        recommendedStatus: ReputationStatus.NORMAL,
      };
    }

    let totalScore = 0;
    let criticalCount = 0;
    let highestSeverity: FraudSeverity = FraudSeverity.LOW;

    const severityRank: Record<FraudSeverity, number> = {
      [FraudSeverity.LOW]: 1,
      [FraudSeverity.MEDIUM]: 2,
      [FraudSeverity.HIGH]: 3,
      [FraudSeverity.CRITICAL]: 4,
    };

    for (const event of unresolvedEvents) {
      totalScore += event.scoreImpact;

      if (event.severity === FraudSeverity.CRITICAL) {
        criticalCount++;
      }

      if (severityRank[event.severity as unknown as FraudSeverity] > severityRank[highestSeverity]) {
        highestSeverity = event.severity as unknown as FraudSeverity;
      }
    }

    // Normalized and clamped strictly between 0 and 100
    const clampedScore = Math.min(env.FRAUD_MAX_SCORE, Math.max(0, totalScore));

    // Determine recommended reputation status based on evidence thresholds
    let recommendedStatus = ReputationStatus.NORMAL;

    if (clampedScore >= env.FRAUD_THRESHOLD_BANNED || criticalCount >= 2) {
      recommendedStatus = ReputationStatus.BANNED;
    } else if (clampedScore >= env.FRAUD_THRESHOLD_SUSPENDED || criticalCount === 1) {
      recommendedStatus = ReputationStatus.SUSPENDED;
    } else if (clampedScore >= env.FRAUD_THRESHOLD_RESTRICTED) {
      recommendedStatus = ReputationStatus.RESTRICTED;
    } else if (clampedScore >= env.FRAUD_THRESHOLD_WATCH) {
      recommendedStatus = ReputationStatus.WATCH;
    }

    return {
      userId,
      fraudScore: clampedScore,
      unresolvedEventsCount: unresolvedEvents.length,
      criticalEventsCount: criticalCount,
      highestSeverity,
      recommendedStatus,
    };
  }
}
