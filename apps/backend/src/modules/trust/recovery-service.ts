import { prisma } from "../../core/database/prisma.js";
import { AuditService } from "../../core/services/audit-service.js";
import {
  AttemptStatus,
  AuditAction,
  TesterStatus,
  TrustEventType,
} from "@calltest/shared-types";
import { TrustScoreService } from "./trust-score-service.js";
import { FraudScoreService } from "../fraud/fraud-score-service.js";

export interface RecoveryResult {
  userId: string;
  recovered: boolean;
  recoveryBonus: number;
  reason: string;
}

export class TrustRecoveryService {
  /**
   * Evaluates if a user qualifies for gradual trust & reputation recovery based on sustained good conduct.
   */
  public static async evaluateAndApplyRecovery(
    userId: string,
    actorId?: string,
    context?: { ipAddress?: string; userAgent?: string },
  ): Promise<RecoveryResult> {
    const profile = await prisma.trustProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return { userId, recovered: false, recoveryBonus: 0, reason: "Profile not found" };
    }

    // 1. Check fraud status
    const fraudScore = await FraudScoreService.calculateFraudScore(userId);
    if (fraudScore.unresolvedEventsCount > 0) {
      return {
        userId,
        recovered: false,
        recoveryBonus: 0,
        reason: "Cannot recover while unresolved fraud events exist",
      };
    }

    // 2. Check recent good campaign participations
    const recentParticipations = await prisma.campaignTester.findMany({
      where: { testerId: userId },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    const completedGoodCampaigns = recentParticipations.filter(
      (p) => p.status === TesterStatus.COMPLETED && p.activityScore >= 70,
    ).length;

    const validatedMissionsCount = await prisma.missionAttempt.count({
      where: { testerId: userId, status: AttemptStatus.VALIDATED },
    });

    // Gradual recovery requirement: at least 2 completed good campaigns and at least 5 validated missions
    if (completedGoodCampaigns >= 2 && validatedMissionsCount >= 5) {
      const recoveryBonus = 10;

      // Update consecutive good campaigns and recalculate trust
      await prisma.trustProfile.update({
        where: { userId },
        data: {
          consecutiveGoodCampaigns: { increment: 1 },
        },
      });

      await TrustScoreService.recalculateAndPersist({
        userId,
        eventType: TrustEventType.RECOVERY_BONUS,
        reason: "Gradual trust recovery granted for sustained good behavior and validated participation",
        sourceId: profile.id,
        metadata: {
          completedGoodCampaigns,
          validatedMissionsCount,
          recoveryBonus,
        },
        actorId,
        context,
      });

      await AuditService.log({
        userId: actorId || userId,
        action: AuditAction.TRUST_RECOVERY,
        entityName: "TrustProfile",
        entityId: profile.id,
        changes: {
          recoveryBonus,
          completedGoodCampaigns,
        },
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      });

      return {
        userId,
        recovered: true,
        recoveryBonus,
        reason: "Gradual recovery bonus applied successfully",
      };
    }

    return {
      userId,
      recovered: false,
      recoveryBonus: 0,
      reason: "Insufficient historical evidence for gradual recovery",
    };
  }
}
