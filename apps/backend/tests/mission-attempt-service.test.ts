import { describe, it, expect, vi, beforeEach } from "vitest";
import { MissionAttemptService } from "../src/modules/missions/attempt-service.js";
import { MissionValidationService } from "../src/modules/missions/validation-service.js";
import { prisma } from "../src/core/database/prisma.js";
import { eventBus } from "../src/core/events/domain-event-bus.js";
import {
  AttemptStatus,
  MissionStatus,
  TesterStatus,
  UserRole,
  ValidationMethod,
} from "@calltest/shared-types";
import { ForbiddenError } from "../src/core/errors/app-error.js";

describe("MissionAttemptService & Idempotency", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const baseMission = {
    id: "mission-1",
    campaignId: "campaign-1",
    title: "Test Mission",
    status: MissionStatus.ACTIVE,
    validationMethod: ValidationMethod.SDK_EVENT,
  };

  const baseCampaignTester = {
    id: "ct-1",
    campaignId: "campaign-1",
    testerId: "tester-1",
    status: TesterStatus.ACTIVE,
  };

  describe("startAttempt", () => {
    it("should start a new attempt in STARTED status for enrolled tester", async () => {
      vi.spyOn(prisma.mission, "findUnique").mockResolvedValue(baseMission as any);
      vi.spyOn(prisma.campaignTester, "findFirst").mockResolvedValue(baseCampaignTester as any);
      vi.spyOn(prisma.missionAttempt, "findFirst").mockResolvedValue(null);
      vi.spyOn(prisma.missionAttempt, "create").mockResolvedValue({
        id: "attempt-1",
        missionId: "mission-1",
        campaignTesterId: "ct-1",
        testerId: "tester-1",
        status: AttemptStatus.STARTED,
        attemptCount: 1,
        startedAt: new Date(),
      } as any);
      vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

      const attempt = await MissionAttemptService.startAttempt("mission-1", "tester-1");

      expect(attempt.id).toBe("attempt-1");
      expect(attempt.status).toBe(AttemptStatus.STARTED);
      expect(attempt.attemptCount).toBe(1);
    });

    it("should return existing active attempt if already STARTED (Idempotent start)", async () => {
      vi.spyOn(prisma.mission, "findUnique").mockResolvedValue(baseMission as any);
      vi.spyOn(prisma.campaignTester, "findFirst").mockResolvedValue(baseCampaignTester as any);

      const existingActiveAttempt = {
        id: "attempt-in-progress",
        missionId: "mission-1",
        campaignTesterId: "ct-1",
        testerId: "tester-1",
        status: AttemptStatus.STARTED,
        attemptCount: 1,
        startedAt: new Date(),
      };

      vi.spyOn(prisma.missionAttempt, "findFirst").mockResolvedValue(existingActiveAttempt as any);
      const createSpy = vi.spyOn(prisma.missionAttempt, "create");

      const attempt = await MissionAttemptService.startAttempt("mission-1", "tester-1");

      expect(attempt.id).toBe("attempt-in-progress");
      expect(createSpy).not.toHaveBeenCalled();
    });

    it("should reject start attempt if tester is not enrolled in the campaign", async () => {
      vi.spyOn(prisma.mission, "findUnique").mockResolvedValue(baseMission as any);
      vi.spyOn(prisma.campaignTester, "findFirst").mockResolvedValue(null);

      await expect(
        MissionAttemptService.startAttempt("mission-1", "tester-not-enrolled"),
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe("submitAttempt & Idempotency", () => {
    it("should submit attempt and auto-validate for SDK_EVENT method", async () => {
      const startedAttempt = {
        id: "attempt-1",
        missionId: "mission-1",
        campaignTesterId: "ct-1",
        testerId: "tester-1",
        status: AttemptStatus.STARTED,
        mission: baseMission,
        campaignTester: baseCampaignTester,
      };

      vi.spyOn(prisma.missionAttempt, "findUnique").mockResolvedValue(startedAttempt as any);
      vi.spyOn(prisma.missionAttempt, "update").mockResolvedValue({
        ...startedAttempt,
        status: AttemptStatus.VALIDATED,
        validationStatus: "AUTO_VALIDATED",
        completedAt: new Date(),
      } as any);
      vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);
      const publishSpy = vi.spyOn(eventBus, "publish").mockResolvedValue(undefined);

      const result = await MissionAttemptService.submitAttempt("attempt-1", "tester-1", {
        screenName: "CatalogScreen",
      });

      expect(result.status).toBe(AttemptStatus.VALIDATED);
      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "MISSION_VALIDATED",
        }),
      );
    });

    it("STRICT IDEMPOTENCY: should return existing validated attempt on repeated submit clicks", async () => {
      // Simulates pressing 'Complete' multiple times
      const alreadyValidatedAttempt = {
        id: "attempt-1",
        missionId: "mission-1",
        campaignTesterId: "ct-1",
        testerId: "tester-1",
        status: AttemptStatus.VALIDATED,
        mission: baseMission,
        campaignTester: baseCampaignTester,
      };

      vi.spyOn(prisma.missionAttempt, "findUnique").mockResolvedValue(alreadyValidatedAttempt as any);
      const updateSpy = vi.spyOn(prisma.missionAttempt, "update");
      const publishSpy = vi.spyOn(eventBus, "publish");

      const result = await MissionAttemptService.submitAttempt("attempt-1", "tester-1");

      expect(result.status).toBe(AttemptStatus.VALIDATED);
      expect(updateSpy).not.toHaveBeenCalled();
      expect(publishSpy).not.toHaveBeenCalled();
    });

    it("should prevent Tester A from submitting Tester B's attempt (IDOR)", async () => {
      const attemptOfB = {
        id: "attempt-b",
        testerId: "tester-b",
        status: AttemptStatus.STARTED,
        mission: baseMission,
      };

      vi.spyOn(prisma.missionAttempt, "findUnique").mockResolvedValue(attemptOfB as any);

      await expect(
        MissionAttemptService.submitAttempt("attempt-b", "tester-a"),
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe("Manual Validation", () => {
    it("should allow developer to manually validate submitted attempt and emit domain event", async () => {
      const submittedAttempt = {
        id: "attempt-manual",
        missionId: "mission-manual",
        testerId: "tester-1",
        status: AttemptStatus.SUBMITTED,
        mission: {
          id: "mission-manual",
          campaignId: "campaign-1",
          campaign: {
            app: { developerId: "dev-1" },
          },
        },
      };

      vi.spyOn(prisma.missionAttempt, "findUnique").mockResolvedValue(submittedAttempt as any);
      vi.spyOn(prisma.missionAttempt, "update").mockResolvedValue({
        ...submittedAttempt,
        status: AttemptStatus.VALIDATED,
        validationStatus: "MANUAL_VALIDATED",
      } as any);
      vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);
      const publishSpy = vi.spyOn(eventBus, "publish").mockResolvedValue(undefined);

      const validated = await MissionValidationService.manualValidate(
        "attempt-manual",
        "dev-1",
        UserRole.DEVELOPER,
        "VALIDATED",
        "Screenshot verified",
      );

      expect(validated.status).toBe(AttemptStatus.VALIDATED);
      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "MISSION_VALIDATED",
        }),
      );
    });
  });
});
