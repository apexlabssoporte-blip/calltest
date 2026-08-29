import { prisma } from "../../core/database/prisma.js";
import { AuditService } from "../../core/services/audit-service.js";
import {
  AuditAction,
  FraudEventType,
  FraudSeverity,
} from "@calltest/shared-types";
import { FraudDecisionService } from "./fraud-decision-service.js";

export interface RecordFraudEventParams {
  userId: string;
  type: FraudEventType;
  severity: FraudSeverity;
  scoreImpact: number;
  reason: string;
  sourceId?: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
  actorId?: string;
  context?: { ipAddress?: string; userAgent?: string };
}

export class FraudService {
  /**
   * Idempotently records a fraud event, updates scores, and evaluates security decisions.
   */
  public static async recordFraudEvent(params: RecordFraudEventParams) {
    const {
      userId,
      type,
      severity,
      scoreImpact,
      reason,
      sourceId,
      idempotencyKey,
      metadata,
      actorId,
      context,
    } = params;

    // 1. Idempotency Check
    if (idempotencyKey) {
      const existing = await prisma.fraudEvent.findUnique({
        where: { idempotencyKey },
      });
      if (existing) {
        return existing;
      }
    }

    // 2. Transactional Insertion
    const fraudEvent = await prisma.$transaction(async (tx) => {
      return tx.fraudEvent.create({
        data: {
          userId,
          type,
          severity,
          scoreImpact,
          reason,
          sourceId,
          idempotencyKey,
          metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
        },
      });
    });

    // 3. Evaluate Decision
    await FraudDecisionService.evaluateAndDecide(userId, actorId, context);

    // 4. Audit Log
    await AuditService.log({
      userId: actorId || userId,
      action: AuditAction.FRAUD_EVENT_CREATED,
      entityName: "FraudEvent",
      entityId: fraudEvent.id,
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

    return fraudEvent;
  }
}
