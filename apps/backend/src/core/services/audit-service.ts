import crypto from "node:crypto";
import { prisma } from "../database/prisma.js";
import { AuditAction } from "@calltest/shared-types";
import { eventBus } from "../events/domain-event-bus.js";

export interface CreateAuditLogParams {
  userId?: string | null;
  campaignId?: string | null;
  action: AuditAction;
  entityName: string;
  entityId: string;
  changes?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export class AuditService {
  /**
   * Records an audit log entry in the database and emits an audit event.
   * Ensures sensitive fields (passwords, tokens) are never persisted in logs.
   */
  public static async log(params: CreateAuditLogParams): Promise<void> {
    try {
      const sanitizedChanges = params.changes ? this.sanitize(params.changes) : undefined;

      await prisma.auditLog.create({
        data: {
          userId: params.userId || undefined,
          campaignId: params.campaignId || undefined,
          action: params.action,
          entityName: params.entityName,
          entityId: params.entityId,
          changes: sanitizedChanges as any,
          ipAddress: params.ipAddress || undefined,
          userAgent: params.userAgent || undefined,
        },
      });

      await eventBus.publish({
        id: crypto.randomUUID(),
        type: `AUDIT_${params.action}`,
        occurredAt: new Date(),
        payload: {
          action: params.action,
          entityName: params.entityName,
          entityId: params.entityId,
          userId: params.userId,
          campaignId: params.campaignId,
        },
      });
    } catch (error) {
      // Audit logging errors should not crash the main business transaction, but should be reported
      console.error("[AuditService] Failed to record audit log:", error);
    }
  }

  private static sanitize(obj: Record<string, unknown>): Record<string, unknown> {
    const sensitiveKeys = ["password", "passwordHash", "token", "refreshToken", "apiKey", "secret"];
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (sensitiveKeys.some((s) => key.toLowerCase().includes(s.toLowerCase()))) {
        result[key] = "[REDACTED]";
      } else if (value && typeof value === "object" && !Array.isArray(value)) {
        result[key] = this.sanitize(value as Record<string, unknown>);
      } else {
        result[key] = value;
      }
    }

    return result;
  }
}
