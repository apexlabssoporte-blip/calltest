import { describe, it, expect, vi, beforeEach } from "vitest";
import { MissionScheduleService } from "../src/modules/missions/mission-schedule.service.js";
import { NotificationService } from "../src/modules/notifications/service.js";
import { prisma } from "../src/core/database/prisma.js";
import { ScheduledMissionStatus, NotificationType } from "@calltest/shared-types";

describe("Phase 13.1: Backend Mission Validation & Notification Invariants", () => {
  const userId = "u1111111-0000-0000-0000-000000000001";
  const campaignTesterId = "ct111111-0000-0000-0000-000000000001";
  const campaignId = "c1111111-0000-0000-0000-000000000001";

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(NotificationService, "createNotification").mockResolvedValue({} as any);
  });

  describe("1. Backend Validation & Idempotency", () => {
    it("should validate and complete mission on backend with notification dispatch", async () => {
      vi.spyOn(prisma.campaignTester, "findUnique").mockResolvedValue({
        id: campaignTesterId,
        testerId: userId,
        campaignId,
        campaign: { app: { name: "Test App" } },
        tester: { displayName: "Tester One" },
      } as any);

      const notifSpy = vi.spyOn(NotificationService, "createNotification");

      const result = await MissionScheduleService.validateAndCompleteMission({
        userId,
        campaignTesterId,
        missionId: "m-day1-install",
      });

      expect(result.success).toBe(true);
      expect(result.mission.status).toBe(ScheduledMissionStatus.COMPLETED);
      expect(notifSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          type: NotificationType.MISSION_COMPLETED,
        })
      );
    });

    it("should reject completion attempt if campaignTester does not belong to user", async () => {
      vi.spyOn(prisma.campaignTester, "findUnique").mockResolvedValue({
        id: campaignTesterId,
        testerId: "other-user-999", // Different user!
        campaignId,
        campaign: { app: { name: "Test App" } },
      } as any);

      await expect(
        MissionScheduleService.validateAndCompleteMission({
          userId,
          campaignTesterId,
          missionId: "m-day1-install",
        })
      ).rejects.toThrow("Invalid tester assignment or unauthorized access");
    });
  });

  describe("2. Notification Rules & Anti-Spam Invariants", () => {
    it("should send daily reminder ONLY when pending required missions exist", async () => {
      const notifSpy = vi.spyOn(NotificationService, "createNotification");

      const sent = await MissionScheduleService.sendMissionReminderIfNeeded(userId, 2);
      expect(sent).toBe(true);
      expect(notifSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          type: NotificationType.MISSION_REMINDER,
        })
      );
    });

    it("should NOT send daily reminder when 0 pending required missions exist (anti-spam invariant)", async () => {
      const notifSpy = vi.spyOn(NotificationService, "createNotification");

      const sent = await MissionScheduleService.sendMissionReminderIfNeeded(userId, 0);
      expect(sent).toBe(false);
      expect(notifSpy).not.toHaveBeenCalled();
    });
  });

  describe("3. Full 14-Day Simulation with Replacement", () => {
    it("should simulate entire 14-day staggered mission flow with replacement on Day 8", async () => {
      // Step 1: Initial schedule for Tester A
      const testerASchedule = MissionScheduleService.generate14DayStaggeredSchedule(
        campaignId,
        "ct-tester-A",
        new Date("2026-08-01T00:00:00Z"),
        0
      );

      // Tester A completes Day 1 and Day 3
      testerASchedule[0].status = ScheduledMissionStatus.COMPLETED;
      testerASchedule[0].completedAt = new Date();
      testerASchedule[3].status = ScheduledMissionStatus.COMPLETED;
      testerASchedule[3].completedAt = new Date();

      // Step 2: Day 8 arrives -> Tester A abandons -> cancel future missions for Tester A
      const cancelledA = MissionScheduleService.cancelFutureMissions(testerASchedule, 8);
      const futureA = cancelledA.filter((m) => m.scheduledDay >= 8);
      for (const m of futureA) {
        expect(m.status).toBe(ScheduledMissionStatus.CANCELLED);
      }

      // Step 3: Replacement Tester B joins on Day 8
      const testerBSchedule = MissionScheduleService.generateScheduleForReplacement(
        campaignId,
        "ct-tester-B",
        8,
        new Date("2026-08-01T00:00:00Z")
      );

      // Tester B receives Day 8..14 missions only
      expect(testerBSchedule.every((m) => m.scheduledDay >= 8 && m.scheduledDay <= 14)).toBe(true);
      expect(testerBSchedule.some((m) => m.scheduledDay < 8)).toBe(false);

      // Step 4: Tester B completes all assigned required missions through Day 14
      for (const mission of testerBSchedule) {
        if (mission.required) {
          mission.status = ScheduledMissionStatus.COMPLETED;
          mission.completedAt = new Date();
        }
      }

      const completedB = testerBSchedule.filter((m) => m.status === ScheduledMissionStatus.COMPLETED);
      expect(completedB.length).toBeGreaterThanOrEqual(2); // Day 12 Functional & Day 14 Final Feedback
    });
  });
});
