import { prisma } from "../../core/database/prisma.js";
import { AuditService } from "../../core/services/audit-service.js";
import {
  AuditAction,
  FraudSeverity,
  TrustEventType,
  TrustPenaltyType,
} from "@calltest/shared-types";
import { TrustScoreService } from "./trust-score-service.js";

export interface ApplyPenaltyParams {
  userId: string;
  type: TrustPenaltyType;
  severity: FraudSeverity;
  scoreImpact: number;
  reason: string;
  sourceId?: string;
  idempotencyKey?: string;
  actorId?: string;
  context?: { ipAddress?: string; userAgent?: string };
}

export class TrustPenaltyService {
  /**
   * Idempotently applies a trust penalty and recalculates user trust score.
   */
  public static async applyPenalty(params: ApplyPenaltyParams) {
    const {
      userId,
      type,
      severity,
      scoreImpact,
      reason,
      sourceId,
      idempotencyKey,
      actorId,
      context,
    } = params;

    // 1. Idempotency verification
    if (idempotencyKey) {
      const existing = await prisma.trustPenalty.findUnique({
        where: { idempotencyKey },
      });
      if (existing) {
        return existing;
      }
    }

    // 2. Transactional Insertion & Recalculation
    const penalty = await prisma.$transaction(async (tx) => {
      return tx.trustPenalty.create({
        data: {
          userId,
          type,
          severity,
          scoreImpact,
          reason,
          sourceId,
          idempotencyKey,
        },
      });
    });

    // 3. Recalculate Trust
    await TrustScoreService.recalculateAndPersist({
      userId,
      eventType: TrustEventType.PENALTY_APPLIED,
      reason: `Penalty applied: ${type} - ${reason}`,
      sourceId: penalty.id,
      actorId,
      context,
    });

    // 4. Audit Log
    await AuditService.log({
      userId: actorId || userId,
      action: AuditAction.TRUST_PENALTY_APPLIED,
      entityName: "TrustPenalty",
      entityId: penalty.id,
      changes: {
        type,
        severity,
        scoreImpact,
        reason,
        sourceId,
      },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    return penalty;
  }
}
