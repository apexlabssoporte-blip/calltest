import { prisma } from "../../core/database/prisma.js";
import { AuditService } from "../../core/services/audit-service.js";
import {
  AuditAction,
  MissionDifficulty,
  MissionQualityRating,
} from "@calltest/shared-types";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../../core/errors/app-error.js";

export class MissionFeedbackService {
  /**
   * Records tester perceived difficulty feedback for a mission.
   * A tester can only rate a mission once (enforced by unique constraint and validation).
   */
  public static async recordDifficultyFeedback(
    attemptId: string,
    testerId: string,
    rating: MissionDifficulty,
    context?: { ipAddress?: string; userAgent?: string },
  ) {
    const attempt = await prisma.missionAttempt.findUnique({
      where: { id: attemptId },
      include: { mission: true },
    });

    if (!attempt) {
      throw new NotFoundError("Mission attempt not found");
    }

    if (attempt.testerId !== testerId) {
      throw new ForbiddenError("You cannot submit feedback for another tester's attempt");
    }

    // Check if feedback already exists
    const existing = await prisma.missionDifficultyFeedback.findUnique({
      where: {
        missionId_campaignTesterId: {
          missionId: attempt.missionId,
          campaignTesterId: attempt.campaignTesterId,
        },
      },
    });

    if (existing) {
      throw new ConflictError("You have already submitted difficulty feedback for this mission");
    }

    const feedback = await prisma.missionDifficultyFeedback.create({
      data: {
        missionId: attempt.missionId,
        campaignTesterId: attempt.campaignTesterId,
        rating,
      },
    });

    await AuditService.log({
      userId: testerId,
      campaignId: attempt.mission.campaignId,
      action: AuditAction.DIFFICULTY_FEEDBACK_SUBMITTED,
      entityName: "MissionDifficultyFeedback",
      entityId: feedback.id,
      changes: { missionId: attempt.missionId, rating },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    return feedback;
  }

  /**
   * Records tester qualitative feedback (TOO_COMPLEX, CONFUSING, BROKEN, etc.).
   */
  public static async recordQualityFeedback(
    attemptId: string,
    testerId: string,
    feedbackRating: MissionQualityRating,
    comment?: string,
    context?: { ipAddress?: string; userAgent?: string },
  ) {
    const attempt = await prisma.missionAttempt.findUnique({
      where: { id: attemptId },
      include: { mission: true },
    });

    if (!attempt) {
      throw new NotFoundError("Mission attempt not found");
    }

    if (attempt.testerId !== testerId) {
      throw new ForbiddenError("You cannot submit feedback for another tester's attempt");
    }

    const qualityFeedback = await prisma.missionQualityFeedback.create({
      data: {
        missionId: attempt.missionId,
        campaignTesterId: attempt.campaignTesterId,
        feedback: feedbackRating,
        comment: comment?.trim(),
      },
    });

    await AuditService.log({
      userId: testerId,
      campaignId: attempt.mission.campaignId,
      action: AuditAction.QUALITY_FEEDBACK_SUBMITTED,
      entityName: "MissionQualityFeedback",
      entityId: qualityFeedback.id,
      changes: { missionId: attempt.missionId, feedback: feedbackRating },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    return qualityFeedback;
  }
}
