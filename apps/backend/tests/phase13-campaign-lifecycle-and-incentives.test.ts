import { describe, it, expect, vi, beforeEach } from "vitest";
import { MissionScheduleService } from "../src/modules/missions/mission-schedule.service.js";
import { CampaignEarlyCompletionService } from "../src/modules/campaigns/early-completion.service.js";
import { TesterMatchingService } from "../src/modules/matching/tester-matching.service.js";
import { CampaignCapacityService } from "../src/modules/campaigns/capacity.service.js";
import { NotificationService } from "../src/modules/notifications/service.js";
import { prisma } from "../src/core/database/prisma.js";
import { CampaignStatus, TesterStatus } from "@calltest/shared-types";

describe("Phase 13: Campaign Lifecycle, Early Ended & Participation Incentives", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(NotificationService, "createNotification").mockResolvedValue({} as any);
    vi.spyOn(prisma.notification, "findUnique").mockResolvedValue(null);
    vi.spyOn(prisma.notification, "create").mockResolvedValue({} as any);
  });

  describe("1. Mission Scheduling across 14 Days", () => {
    it("should distribute missions evenly across 14-day campaign without daily spam", () => {
      const missionIds = ["m1", "m2", "m3", "m4", "m5"];
      const schedule = MissionScheduleService.generate14DaySchedule(missionIds);

      expect(schedule.length).toBe(5);
      expect(schedule[0].scheduledDay).toBe(1);
      expect(schedule[1].scheduledDay).toBe(3);
      expect(schedule[2].scheduledDay).toBe(7);
      expect(schedule[3].scheduledDay).toBe(10);
      expect(schedule[4].scheduledDay).toBe(14);
    });

    it("should display completion message when all required missions are completed", () => {
      const missions = [
        { id: "m1", title: "Install", scheduledDay: 1, deadlineDay: 4, completedAt: new Date() },
        { id: "m2", title: "Core Flow", scheduledDay: 3, deadlineDay: 7, completedAt: new Date() },
      ];

      const evaluation = MissionScheduleService.evaluateSchedule("c-1", 5, missions);

      expect(evaluation.allMissionsCompleted).toBe(true);
      expect(evaluation.statusMessage).toContain("Has completado tus misiones");
      expect(evaluation.statusMessage).toContain("La campaña continúa hasta finalizar su periodo de testing");
    });
  });

  describe("2. Early Campaign Completion (ENDED_EARLY)", () => {
    it("should award valid completion to all testers with zero penalty when app is verified on Google Play", async () => {
      const campaignId = "c-early-1";

      vi.spyOn(prisma.campaign, "findUnique").mockResolvedValue({
        id: campaignId,
        status: CampaignStatus.ACTIVE,
        app: { name: "Public App" },
        campaignTesters: [
          { id: "ct-1", testerId: "t-1", status: TesterStatus.ACTIVE },
          { id: "ct-2", testerId: "t-2", status: TesterStatus.ACTIVE },
        ],
      } as any);

      vi.spyOn(prisma.campaign, "update").mockResolvedValue({
        id: campaignId,
        status: CampaignStatus.ENDED_EARLY,
      } as any);

      const testerUpdateSpy = vi.spyOn(prisma.campaignTester, "update").mockResolvedValue({} as any);
      vi.spyOn(prisma.campaignTester, "updateMany").mockResolvedValue({ count: 2 } as any);
      vi.spyOn(prisma.trustProfile, "upsert").mockResolvedValue({} as any);
      vi.spyOn(prisma.notification, "create").mockResolvedValue({} as any);
      vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

      const result = await CampaignEarlyCompletionService.endCampaignEarly(
        campaignId,
        "admin-1",
        "https://play.google.com/store/apps/details?id=com.example.app"
      );

      expect(result.status).toBe(CampaignStatus.ENDED_EARLY);
      // Both active testers were marked COMPLETED
      expect(testerUpdateSpy).toHaveBeenCalledTimes(2);
      expect(testerUpdateSpy).toHaveBeenCalledWith({
        where: { id: "ct-1" },
        data: expect.objectContaining({ status: TesterStatus.COMPLETED }),
      });
    });
  });

  describe("3. Tester Campaign Capacity & Completion Motivation", () => {
    it("should calculate progressive active campaign limit for testers (3 -> 6 -> 9 -> 12 -> 15)", () => {
      expect(CampaignCapacityService.calculateTesterCampaignCapacity(0)).toBe(3);
      expect(CampaignCapacityService.calculateTesterCampaignCapacity(2)).toBe(6);
      expect(CampaignCapacityService.calculateTesterCampaignCapacity(5)).toBe(9);
      expect(CampaignCapacityService.calculateTesterCampaignCapacity(8)).toBe(12);
      expect(CampaignCapacityService.calculateTesterCampaignCapacity(11)).toBe(15);
    });

    it("should provide encouraging non-guarantee participation incentive copy", () => {
      const copy = TesterMatchingService.getCampaignCompletionIncentiveMessage();
      expect(copy).toContain("¡Tu campaña terminó correctamente!");
      expect(copy).toContain("aumentar la probabilidad de recibir testers con un mejor historial");
      expect(copy).not.toContain("Garantizado");
    });
  });
});
