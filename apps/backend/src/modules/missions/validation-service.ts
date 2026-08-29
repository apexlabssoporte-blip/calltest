import crypto from "node:crypto";
import { prisma } from "../../core/database/prisma.js";
import { AuditService } from "../../core/services/audit-service.js";
import { eventBus } from "../../core/events/domain-event-bus.js";
import {
  AttemptStatus,
  AuditAction,
  UserRole,
  ValidationMethod,
} from "@calltest/shared-types";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "../../core/errors/app-error.js";

export class MissionValidationService {
  /**
   * Processes submission immediately upon receipt.
   * Automated methods (SDK_EVENT, EVENT, SCREEN_FLOW) can be verified instantly.
   * MANUAL or HYBRID methods remain SUBMITTED awaiting manual reviewer validation.
   */
  public static async processSubmission(
    attempt: any,
    context?: { ipAddress?: string; userAgent?: string },
  ) {
    const method = attempt.mission.validationMethod as ValidationMethod;

    if (
      method === ValidationMethod.SDK_EVENT ||
      method === ValidationMethod.EVENT ||
      method === ValidationMethod.SCREEN_FLOW ||
      method === ValidationMethod.CHECKLIST
    ) {
      // Auto-validate based on submission proof
      const validatedAttempt = await prisma.missionAttempt.update({
        where: { id: attempt.id },
        data: {
          status: AttemptStatus.VALIDATED,
          validationStatus: "AUTO_VALIDATED",
          validatedAt: new Date(),
        },
        include: { mission: true },
      });

      await AuditService.log({
        userId: attempt.testerId,
        campaignId: attempt.mission.campaignId,
        action: AuditAction.MISSION_ATTEMPT_VALIDATED,
        entityName: "MissionAttempt",
        entityId: attempt.id,
        changes: { validationMethod: method, autoValidated: true },
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      });

      // Emit domain event for future Trust/Rewards Engine consumption
      await eventBus.publish({
        id: crypto.randomUUID(),
        type: "MISSION_VALIDATED",
        occurredAt: new Date(),
        payload: {
          attemptId: attempt.id,
          missionId: attempt.missionId,
          testerId: attempt.testerId,
          campaignId: attempt.mission.campaignId,
          validationMethod: method,
          completedAt: validatedAttempt.completedAt,
        },
      });

      return validatedAttempt;
    }

    // MANUAL or HYBRID submissions remain in SUBMITTED state for developer review
    return attempt;
  }

  /**
   * Manual reviewer validation endpoint for human-reviewed missions.
   */
  public static async manualValidate(
    attemptId: string,
    validatorUserId: string,
    validatorRole: UserRole,
    decision: "VALIDATED" | "REJECTED",
    reason: string,
    context?: { ipAddress?: string; userAgent?: string },
  ) {
    const attempt = await prisma.missionAttempt.findUnique({
      where: { id: attemptId },
      include: {
        mission: {
          include: {
            campaign: {
              include: { app: true },
            },
          },
        },
      },
    });

    if (!attempt) {
      throw new NotFoundError("Mission attempt not found");
    }

    // Ownership check: Validator must be app developer or ADMIN
    if (
      validatorRole !== UserRole.ADMIN &&
      attempt.mission.campaign.app.developerId !== validatorUserId
    ) {
      throw new ForbiddenError(
        "You do not have permission to validate missions for this campaign",
      );
    }

    if (attempt.status !== AttemptStatus.SUBMITTED) {
      throw new BadRequestError(
        `Cannot validate attempt in '${attempt.status}' state`,
      );
    }

    const targetStatus =
      decision === "VALIDATED" ? AttemptStatus.VALIDATED : AttemptStatus.REJECTED;

    const validated = await prisma.missionAttempt.update({
      where: { id: attemptId },
      data: {
        status: targetStatus,
        validatedById: validatorUserId,
        validatedAt: new Date(),
        validationReason: reason.trim(),
        validationStatus: `MANUAL_${decision}`,
      },
      include: { mission: true },
    });

    const auditAction =
      decision === "VALIDATED"
        ? AuditAction.MISSION_ATTEMPT_VALIDATED
        : AuditAction.MISSION_ATTEMPT_REJECTED;

    await AuditService.log({
      userId: validatorUserId,
      campaignId: attempt.mission.campaignId,
      action: auditAction,
      entityName: "MissionAttempt",
      entityId: attemptId,
      changes: { decision, reason },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    // Emit domain event for future consumption
    await eventBus.publish({
      id: crypto.randomUUID(),
      type: decision === "VALIDATED" ? "MISSION_VALIDATED" : "MISSION_REJECTED",
      occurredAt: new Date(),
      payload: {
        attemptId: attempt.id,
        missionId: attempt.missionId,
        testerId: attempt.testerId,
        campaignId: attempt.mission.campaignId,
        validatorId: validatorUserId,
        decision,
        reason,
      },
    });

    return validated;
  }
}
