import { prisma } from "../../core/database/prisma.js";
import { AuditService } from "../../core/services/audit-service.js";
import {
  AuditAction,
  FraudDecisionAction,
  ReputationStatus,
  UserStatus,
} from "@calltest/shared-types";
import { FraudScoreService } from "./fraud-score-service.js";

export interface FraudDecisionResult {
  userId: string;
  action: FraudDecisionAction;
  fraudScore: number;
  reputationStatus: ReputationStatus;
  reason: string;
}

export class FraudDecisionService {
  /**
   * Evaluates accumulated evidence, determines the proportional security action, and updates status if necessary.
   */
  public static async evaluateAndDecide(
    userId: string,
    actorId?: string,
    context?: { ipAddress?: string; userAgent?: string },
  ): Promise<FraudDecisionResult> {
    const scoreResult = await FraudScoreService.calculateFraudScore(userId);
    const { fraudScore, recommendedStatus } = scoreResult;

    let action: FraudDecisionAction = FraudDecisionAction.NO_ACTION;
    let reason = "Normal low-risk behavior";

    switch (recommendedStatus) {
      case ReputationStatus.BANNED:
        action = FraudDecisionAction.BAN;
        reason = `Critical fraud score (${fraudScore}) exceeded threshold. Permanent ban enforced.`;
        break;
      case ReputationStatus.SUSPENDED:
        action = FraudDecisionAction.SUSPEND;
        reason = `Severe fraud score (${fraudScore}) reached suspension threshold.`;
        break;
      case ReputationStatus.RESTRICTED:
        action = FraudDecisionAction.RESTRICT;
        reason = `Suspicious fraud score (${fraudScore}) requires capacity and assignment restrictions.`;
        break;
      case ReputationStatus.WATCH:
        action = FraudDecisionAction.MONITOR;
        reason = `Minor unusual signals detected (${fraudScore}). Placed under monitoring.`;
        break;
      case ReputationStatus.NORMAL:
      default:
        action = FraudDecisionAction.NO_ACTION;
        reason = "Normal activity with no critical fraud indicators.";
        break;
    }

    // Apply User and Reputation state updates inside transaction
    await prisma.$transaction(async (tx) => {
      // 1. Update or create TrustProfile reputation status
      await tx.trustProfile.upsert({
        where: { userId },
        create: {
          userId,
          reputationStatus: recommendedStatus,
        },
        update: {
          reputationStatus: recommendedStatus,
        },
      });

      // 2. Synchronize User status if SUSPENDED or BANNED
      if (recommendedStatus === ReputationStatus.BANNED) {
        await tx.user.update({
          where: { id: userId },
          data: { status: UserStatus.BANNED },
        });
      } else if (recommendedStatus === ReputationStatus.SUSPENDED) {
        await tx.user.update({
          where: { id: userId },
          data: { status: UserStatus.SUSPENDED },
        });
      }
    });

    // 3. Audit logging for critical decisions
    await AuditService.log({
      userId: actorId || userId,
      action: AuditAction.FRAUD_DECISION_MADE,
      entityName: "FraudDecisionService",
      entityId: userId,
      changes: {
        action,
        fraudScore,
        recommendedStatus,
        reason,
      },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    if (action === FraudDecisionAction.BAN) {
      await AuditService.log({
        userId: actorId || userId,
        action: AuditAction.USER_BANNED,
        entityName: "User",
        entityId: userId,
        changes: { reason, fraudScore },
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      });
    } else if (action === FraudDecisionAction.SUSPEND) {
      await AuditService.log({
        userId: actorId || userId,
        action: AuditAction.USER_SUSPENDED,
        entityName: "User",
        entityId: userId,
        changes: { reason, fraudScore },
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      });
    } else if (action === FraudDecisionAction.RESTRICT) {
      await AuditService.log({
        userId: actorId || userId,
        action: AuditAction.USER_RESTRICTED,
        entityName: "User",
        entityId: userId,
        changes: { reason, fraudScore },
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      });
    }

    return {
      userId,
      action,
      fraudScore,
      reputationStatus: recommendedStatus,
      reason,
    };
  }
}
