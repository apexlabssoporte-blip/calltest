import { prisma } from "../../core/database/prisma.js";
import { AuditService } from "../../core/services/audit-service.js";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "../../core/errors/app-error.js";
import {
  AttemptStatus,
  AuditAction,
  MissionStatus,
  TesterStatus,
  UserRole,
} from "@calltest/shared-types";
import { MissionValidationService } from "./validation-service.js";

export class MissionAttemptService {
  /**
   * Starts or resumes an attempt for a mission.
   * If an active attempt is already in progress, returns the existing attempt (Idempotent).
   */
  public static async startAttempt(
    missionId: string,
    testerId: string,
    context?: { ipAddress?: string; userAgent?: string },
  ) {
    const mission = await prisma.mission.findUnique({
      where: { id: missionId },
    });

    if (!mission) {
      throw new NotFoundError("Mission not found");
    }

    if (mission.status !== MissionStatus.ACTIVE && mission.status !== MissionStatus.APPROVED) {
      throw new BadRequestError(`Cannot start a mission with status '${mission.status}'`);
    }

    // Verify tester is assigned to this campaign
    const campaignTester = await prisma.campaignTester.findFirst({
      where: {
        campaignId: mission.campaignId,
        testerId,
        status: {
          in: [TesterStatus.INVITED, TesterStatus.ACTIVE, TesterStatus.LOW_ACTIVITY],
        },
      },
    });

    if (!campaignTester) {
      throw new ForbiddenError("You are not an active tester in this campaign");
    }

    // Check existing attempts for idempotency
    const existingAttempt = await prisma.missionAttempt.findFirst({
      where: {
        missionId,
        campaignTesterId: campaignTester.id,
      },
      orderBy: { createdAt: "desc" },
    });

    if (existingAttempt && existingAttempt.status === AttemptStatus.STARTED) {
      return existingAttempt;
    }

    const attemptCount = existingAttempt ? existingAttempt.attemptCount + 1 : 1;

    const newAttempt = await prisma.missionAttempt.create({
      data: {
        missionId,
        campaignTesterId: campaignTester.id,
        testerId,
        status: AttemptStatus.STARTED,
        attemptCount,
        startedAt: new Date(),
      },
    });

    await AuditService.log({
      userId: testerId,
      campaignId: mission.campaignId,
      action: AuditAction.MISSION_ATTEMPT_STARTED,
      entityName: "MissionAttempt",
      entityId: newAttempt.id,
      changes: { missionId, attemptCount },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    return newAttempt;
  }

  /**
   * Submits a mission attempt.
   * STRICT IDEMPOTENCY: If the attempt has already been submitted or validated,
   * returns the current state immediately without duplicate processing or events.
   */
  public static async submitAttempt(
    attemptId: string,
    testerId: string,
    proofData?: Record<string, unknown>,
    context?: { ipAddress?: string; userAgent?: string },
  ) {
    const attempt = await prisma.missionAttempt.findUnique({
      where: { id: attemptId },
      include: { mission: true, campaignTester: true },
    });

    if (!attempt) {
      throw new NotFoundError("Mission attempt not found");
    }

    // Security: Tester can only submit their own attempts
    if (attempt.testerId !== testerId) {
      throw new ForbiddenError("You cannot submit an attempt that belongs to another tester");
    }

    // IDEMPOTENCY CHECK: Return existing completed/submitted attempt directly
    if (
      attempt.status === AttemptStatus.SUBMITTED ||
      attempt.status === AttemptStatus.VALIDATED
    ) {
      return attempt;
    }

    if (attempt.status !== AttemptStatus.STARTED) {
      throw new BadRequestError(
        `Cannot submit attempt in '${attempt.status}' state`,
      );
    }

    const completedAt = new Date();
    const updatedAttempt = await prisma.missionAttempt.update({
      where: { id: attemptId },
      data: {
        status: AttemptStatus.SUBMITTED,
        completedAt,
        proofData: proofData as any,
      },
      include: { mission: true, campaignTester: true },
    });

    await AuditService.log({
      userId: testerId,
      campaignId: attempt.mission.campaignId,
      action: AuditAction.MISSION_ATTEMPT_SUBMITTED,
      entityName: "MissionAttempt",
      entityId: attemptId,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    // Run automated validation if applicable
    return MissionValidationService.processSubmission(updatedAttempt, context);
  }

  /**
   * Retrieves all mission attempts for a given tester.
   */
  public static async listTesterMissions(
    testerId: string,
    requestingUserId: string,
    requestingUserRole: UserRole,
  ) {
    // Only the tester themselves, a developer of their campaign, or admin can query
    if (
      requestingUserRole !== UserRole.ADMIN &&
      requestingUserId !== testerId &&
      requestingUserRole !== UserRole.DEVELOPER &&
      requestingUserRole !== UserRole.BOTH
    ) {
      throw new ForbiddenError("You do not have permission to view these missions");
    }

    return prisma.missionAttempt.findMany({
      where: { testerId },
      include: {
        mission: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }
}
