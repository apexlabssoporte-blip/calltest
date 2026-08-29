import { describe, it, expect } from "vitest";
import { MissionScheduleService } from "../src/modules/missions/mission-schedule.service.js";
import { MissionType } from "@calltest/shared-types";

describe("Phase 13.1: 14-Day Mission Scheduling & Staggering", () => {
  it("1. should generate a valid 14-day schedule with Day 1 through Day 14 missions", () => {
    const campaignId = "c-sched-001";
    const campaignTesterId = "ct-sched-001";
    const startsAt = new Date("2026-08-01T00:00:00Z");

    const schedule = MissionScheduleService.generate14DayStaggeredSchedule(
      campaignId,
      campaignTesterId,
      startsAt,
      0
    );

    expect(schedule.length).toBeGreaterThanOrEqual(10);

    const days = schedule.map((m) => m.scheduledDay);
    const minDay = Math.min(...days);
    const maxDay = Math.max(...days);

    expect(minDay).toBe(1);
    expect(maxDay).toBe(14);
    // INVARIANT: Never schedule on Day 15 or later
    expect(days.some((d) => d > 14)).toBe(false);
  });

  it("2. should include diverse mission types across the campaign lifecycle", () => {
    const schedule = MissionScheduleService.generate14DayStaggeredSchedule(
      "c-types",
      "ct-types",
      new Date(),
      0
    );

    const types = new Set(schedule.map((m) => m.type));

    expect(types.has(MissionType.INSTALL)).toBe(true);
    expect(types.has(MissionType.OPEN)).toBe(true);
    expect(types.has(MissionType.EXPLORE)).toBe(true);
    expect(types.has(MissionType.FUNCTIONAL)).toBe(true);
    expect(types.has(MissionType.STABILITY)).toBe(true);
    expect(types.has(MissionType.REPORT)).toBe(true);
    expect(types.has(MissionType.FINAL_FEEDBACK)).toBe(true);
  });

  it("3. should distinguish mandatory (required: true) vs optional (required: false) missions", () => {
    const schedule = MissionScheduleService.generate14DayStaggeredSchedule(
      "c-req-opt",
      "ct-req-opt",
      new Date(),
      0
    );

    const installMission = schedule.find((m) => m.type === MissionType.INSTALL);
    const finalFeedback = schedule.find((m) => m.type === MissionType.FINAL_FEEDBACK);
    const exploreMission = schedule.find((m) => m.type === MissionType.EXPLORE);
    const reportMission = schedule.find((m) => m.type === MissionType.REPORT);

    expect(installMission?.required).toBe(true);
    expect(finalFeedback?.required).toBe(true);
    expect(exploreMission?.required).toBe(false);
    expect(reportMission?.required).toBe(false);
  });

  it("4. should support staggered scheduling across different campaigns to prevent overloading testers", () => {
    const scheduleA = MissionScheduleService.generate14DayStaggeredSchedule("c-A", "ct-A", new Date(), 0);
    const scheduleB = MissionScheduleService.generate14DayStaggeredSchedule("c-B", "ct-B", new Date(), 1);

    // Day 2 requirement differs between pattern 0 and pattern 1
    const day2MissionA = scheduleA.find((m) => m.scheduledDay === 2);
    const day2MissionB = scheduleB.find((m) => m.scheduledDay === 2);

    expect(day2MissionA?.required).toBe(true);
    expect(day2MissionB?.required).toBe(false);
  });
});
