import { describe, it, expect, vi, beforeEach } from "vitest";
import { MissionFeedbackService } from "../src/modules/missions/feedback-service.js";
import { prisma } from "../src/core/database/prisma.js";
import { MissionDifficulty, MissionQualityRating } from "@calltest/shared-types";
import { ConflictError, ForbiddenError } from "../src/core/errors/app-error.js";

describe("MissionFeedbackService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const baseAttempt = {
    id: "attempt-1",
    missionId: "mission-1",
    campaignTesterId: "ct-1",
    testerId: "tester-1",
    mission: { campaignId: "campaign-1" },
  };

  describe("recordDifficultyFeedback", () => {
    it("should record difficulty feedback successfully", async () => {
      vi.spyOn(prisma.missionAttempt, "findUnique").mockResolvedValue(baseAttempt as any);
      vi.spyOn(prisma.missionDifficultyFeedback, "findUnique").mockResolvedValue(null);
      vi.spyOn(prisma.missionDifficultyFeedback, "create").mockResolvedValue({
        id: "mdf-1",
        missionId: "mission-1",
        campaignTesterId: "ct-1",
        rating: MissionDifficulty.MEDIUM,
        createdAt: new Date(),
      } as any);
      vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

      const feedback = await MissionFeedbackService.recordDifficultyFeedback(
        "attempt-1",
        "tester-1",
        MissionDifficulty.MEDIUM,
      );

      expect(feedback.id).toBe("mdf-1");
      expect(feedback.rating).toBe(MissionDifficulty.MEDIUM);
    });

    it("should reject duplicate difficulty rating by the same tester", async () => {
      vi.spyOn(prisma.missionAttempt, "findUnique").mockResolvedValue(baseAttempt as any);
      vi.spyOn(prisma.missionDifficultyFeedback, "findUnique").mockResolvedValue({
        id: "mdf-existing",
      } as any);

      await expect(
        MissionFeedbackService.recordDifficultyFeedback(
          "attempt-1",
          "tester-1",
          MissionDifficulty.HARD,
        ),
      ).rejects.toThrow(ConflictError);
    });

    it("should prevent a tester from submitting feedback for another tester's attempt", async () => {
      vi.spyOn(prisma.missionAttempt, "findUnique").mockResolvedValue(baseAttempt as any);

      await expect(
        MissionFeedbackService.recordDifficultyFeedback(
          "attempt-1",
          "other-tester",
          MissionDifficulty.EASY,
        ),
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe("recordQualityFeedback", () => {
    it("should record qualitative feedback (e.g. TOO_COMPLEX)", async () => {
      vi.spyOn(prisma.missionAttempt, "findUnique").mockResolvedValue(baseAttempt as any);
      vi.spyOn(prisma.missionQualityFeedback, "create").mockResolvedValue({
        id: "mqf-1",
        missionId: "mission-1",
        campaignTesterId: "ct-1",
        feedback: MissionQualityRating.TOO_COMPLEX,
        comment: "Demasiados pasos en una sola pantalla",
        createdAt: new Date(),
      } as any);
      vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

      const feedback = await MissionFeedbackService.recordQualityFeedback(
        "attempt-1",
        "tester-1",
        MissionQualityRating.TOO_COMPLEX,
        "Demasiados pasos en una sola pantalla",
      );

      expect(feedback.feedback).toBe(MissionQualityRating.TOO_COMPLEX);
      expect(feedback.comment).toBe("Demasiados pasos en una sola pantalla");
    });
  });
});
