import { describe, it, expect } from "vitest";
import { MissionScheduleService } from "../src/modules/missions/mission-schedule.service.js";
import { ScheduledMissionStatus, MissionType } from "@calltest/shared-types";

describe("Phase 13.1: Aggregated Daily Missions Inbox (Juan's 15 Campaigns)", () => {
  it("1. should aggregate daily missions for 15 active campaigns without overload", () => {
    const userId = "user-juan-15";
    const now = new Date("2026-08-05T10:00:00Z");

    // Simulate Juan having 15 active campaigns on various campaign days
    const campaignSchedules = Array.from({ length: 15 }, (_, i) => {
      const campaignDay = (i % 14) + 1; // Days 1..14 distributed
      const missions = MissionScheduleService.generate14DayStaggeredSchedule(
        `c-${i + 1}`,
        `ct-${i + 1}`,
        new Date(now.getTime() - (campaignDay - 1) * 24 * 60 * 60 * 1000),
        i
      );
      return {
        campaignId: `c-${i + 1}`,
        appName: `App #${i + 1}`,
        campaignDay,
        missions,
      };
    });

    const inbox = MissionScheduleService.aggregateDailyInbox(userId, campaignSchedules, now);

    expect(inbox.userId).toBe(userId);
    expect(inbox.totalActiveCampaigns).toBe(15);
    expect(inbox.totalPendingToday).toBeGreaterThan(0);
    // Reasonable daily load (not 225 heavy actions)
    expect(inbox.totalPendingToday).toBeLessThan(30);

    // Verify tabs structure
    expect(Array.isArray(inbox.tabs.pending)).toBe(true);
    expect(Array.isArray(inbox.tabs.completed)).toBe(true);
    expect(Array.isArray(inbox.tabs.upcoming)).toBe(true);
  });

  it("2. should not show CANCELLED missions in the pending tab", () => {
    const userId = "user-test-cancel";
    const campaignSchedules = [
      {
        campaignId: "c-cancel-test",
        appName: "Cancelled App",
        campaignDay: 3,
        missions: [
          {
            id: "m-cancelled-1",
            campaignId: "c-cancel-test",
            type: MissionType.OPEN,
            title: "Cancelled Mission",
            description: "App ended early",
            scheduledDay: 3,
            required: true,
            priority: "NORMAL" as const,
            status: ScheduledMissionStatus.CANCELLED,
          },
        ],
      },
    ];

    const inbox = MissionScheduleService.aggregateDailyInbox(userId, campaignSchedules, new Date());

    expect(inbox.totalPendingToday).toBe(0);
    expect(inbox.tabs.pending.length).toBe(0);
  });

  it("3. should accurately categorize Completed, Available, and Upcoming missions", () => {
    const userId = "user-tabs-test";
    const campaignSchedules = [
      {
        campaignId: "c-tabs",
        appName: "Tabs App",
        campaignDay: 5,
        missions: [
          {
            id: "m-done",
            campaignId: "c-tabs",
            type: MissionType.INSTALL,
            title: "Day 1 Install",
            description: "Done",
            scheduledDay: 1,
            required: true,
            priority: "HIGH" as const,
            status: ScheduledMissionStatus.COMPLETED,
            completedAt: new Date(),
          },
          {
            id: "m-today",
            campaignId: "c-tabs",
            type: MissionType.EXPLORE,
            title: "Day 5 Explore",
            description: "Available today",
            scheduledDay: 5,
            required: false,
            priority: "NORMAL" as const,
            status: ScheduledMissionStatus.PENDING,
          },
          {
            id: "m-future",
            campaignId: "c-tabs",
            type: MissionType.FINAL_FEEDBACK,
            title: "Day 14 Feedback",
            description: "Upcoming",
            scheduledDay: 14,
            required: true,
            priority: "CRITICAL" as const,
            status: ScheduledMissionStatus.PENDING,
          },
        ],
      },
    ];

    const inbox = MissionScheduleService.aggregateDailyInbox(userId, campaignSchedules, new Date());

    expect(inbox.tabs.completed.length).toBe(1);
    expect(inbox.tabs.pending.length).toBe(1);
    expect(inbox.tabs.upcoming.length).toBe(1);
    expect(inbox.tabs.pending[0].id).toBe("m-today");
    expect(inbox.tabs.upcoming[0].id).toBe("m-future");
  });
});
