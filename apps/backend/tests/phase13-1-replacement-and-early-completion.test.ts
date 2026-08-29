import { describe, it, expect } from "vitest";
import { MissionScheduleService } from "../src/modules/missions/mission-schedule.service.js";
import { ScheduledMissionStatus, MissionType } from "@calltest/shared-types";

describe("Phase 13.1: Replacement Tester Scheduling & Early Completion Invariants", () => {
  describe("1. Replacement Tester Schedule Invariant", () => {
    it("should assign ONLY valid future missions (Day 8..14) to a replacement tester joining on Day 8", () => {
      const campaignId = "c-rep-test";
      const replacementTesterId = "ct-replacement-day8";
      const joinedDay = 8;

      const schedule = MissionScheduleService.generateScheduleForReplacement(
        campaignId,
        replacementTesterId,
        joinedDay,
        new Date()
      );

      expect(schedule.length).toBeGreaterThan(0);

      // INVARIANT: Every mission must be scheduled for Day 8 or later
      for (const mission of schedule) {
        expect(mission.scheduledDay).toBeGreaterThanOrEqual(8);
        expect(mission.scheduledDay).toBeLessThanOrEqual(14);
      }

      // INVARIANT: Historical expired missions (Day 1..7) must NEVER be assigned to replacement tester
      const hasHistoricalMissions = schedule.some((m) => m.scheduledDay < 8);
      expect(hasHistoricalMissions).toBe(false);
    });
  });

  describe("2. Early Campaign Completion (ENDED_EARLY) Invariant", () => {
    it("should CANCEL all future uncompleted missions and PRESERVE already completed missions", () => {
      const missions = [
        {
          id: "m1",
          campaignId: "c-1",
          type: MissionType.INSTALL,
          title: "Install",
          description: "Done",
          scheduledDay: 1,
          required: true,
          priority: "HIGH" as const,
          status: ScheduledMissionStatus.COMPLETED,
          completedAt: new Date(),
        },
        {
          id: "m2",
          campaignId: "c-1",
          type: MissionType.FUNCTIONAL,
          title: "Day 3 Core Flow",
          description: "Done",
          scheduledDay: 3,
          required: true,
          priority: "HIGH" as const,
          status: ScheduledMissionStatus.COMPLETED,
          completedAt: new Date(),
        },
        {
          id: "m3",
          campaignId: "c-1",
          type: MissionType.OPEN,
          title: "Day 7 Open",
          description: "Future",
          scheduledDay: 7,
          required: false,
          priority: "NORMAL" as const,
          status: ScheduledMissionStatus.PENDING,
        },
        {
          id: "m4",
          campaignId: "c-1",
          type: MissionType.FINAL_FEEDBACK,
          title: "Day 14 Feedback",
          description: "Future",
          scheduledDay: 14,
          required: true,
          priority: "CRITICAL" as const,
          status: ScheduledMissionStatus.PENDING,
        },
      ];

      // Campaign ends early on Day 5
      const updated = MissionScheduleService.cancelFutureMissions(missions, 5);

      const m1 = updated.find((m) => m.id === "m1");
      const m2 = updated.find((m) => m.id === "m2");
      const m3 = updated.find((m) => m.id === "m3");
      const m4 = updated.find((m) => m.id === "m4");

      // Completed missions remain COMPLETED
      expect(m1?.status).toBe(ScheduledMissionStatus.COMPLETED);
      expect(m2?.status).toBe(ScheduledMissionStatus.COMPLETED);

      // Future missions become CANCELLED
      expect(m3?.status).toBe(ScheduledMissionStatus.CANCELLED);
      expect(m4?.status).toBe(ScheduledMissionStatus.CANCELLED);
    });
  });
});
