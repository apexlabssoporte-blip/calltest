import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActivityEventService } from "../src/modules/activity/event-service.js";
import { SessionTrackingService } from "../src/modules/activity/session-service.js";
import { ActivityScoreService } from "../src/modules/activity/score-service.js";
import { ActivityClassificationService } from "../src/modules/activity/classification-service.js";
import { prisma } from "../src/core/database/prisma.js";
import { ActivityEventType, ActivityState } from "@calltest/shared-types";

describe("Activity Engine", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("ActivityEventService: Ingestion, Idempotency & Timestamps", () => {
    it("should ingest a valid activity event", async () => {
      vi.spyOn(prisma.activityEvent, "findUnique").mockResolvedValue(null);
      vi.spyOn(prisma.activityEvent, "create").mockResolvedValue({
        id: "evt-1",
        appId: "app-1",
        testerId: "tester-1",
        sessionId: "sess-1",
        eventType: ActivityEventType.SCREEN_VIEW,
        clientTimestamp: new Date(),
        serverTimestamp: new Date(),
        isValid: true,
        idempotencyKey: "client-evt-uuid-1",
      } as any);
      vi.spyOn(prisma.sessionRecord, "findUnique").mockResolvedValue(null);

      const result = await ActivityEventService.ingestEvent("tester-1", {
        eventId: "client-evt-uuid-1",
        appId: "a0000000-0000-0000-0000-000000000001",
        sessionId: "sess-1",
        eventType: ActivityEventType.SCREEN_VIEW,
        clientTimestamp: new Date().toISOString(),
      });

      expect(result.event.id).toBe("evt-1");
      expect(result.isDuplicate).toBe(false);
      expect(result.isAnomalousTimestamp).toBe(false);
    });

    it("should detect duplicate event via unique eventId idempotency", async () => {
      const existingEvent = {
        id: "evt-existing",
        idempotencyKey: "client-evt-uuid-duplicate",
      };

      vi.spyOn(prisma.activityEvent, "findUnique").mockResolvedValue(existingEvent as any);
      const createSpy = vi.spyOn(prisma.activityEvent, "create");

      const result = await ActivityEventService.ingestEvent("tester-1", {
        eventId: "client-evt-uuid-duplicate",
        appId: "a0000000-0000-0000-0000-000000000001",
        sessionId: "sess-1",
        eventType: ActivityEventType.SCREEN_VIEW,
        clientTimestamp: new Date().toISOString(),
      });

      expect(result.isDuplicate).toBe(true);
      expect(createSpy).not.toHaveBeenCalled();
    });

    it("should flag future timestamps beyond tolerance as anomalous", async () => {
      vi.spyOn(prisma.activityEvent, "findUnique").mockResolvedValue(null);

      const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h in the future
      const createSpy = vi.spyOn(prisma.activityEvent, "create").mockResolvedValue({
        id: "evt-future",
        isValid: false,
      } as any);
      vi.spyOn(prisma.sessionRecord, "findUnique").mockResolvedValue(null);

      const result = await ActivityEventService.ingestEvent("tester-1", {
        eventId: "client-evt-future",
        appId: "a0000000-0000-0000-0000-000000000001",
        sessionId: "sess-1",
        eventType: ActivityEventType.SCREEN_VIEW,
        clientTimestamp: futureDate.toISOString(),
      });

      expect(result.isAnomalousTimestamp).toBe(true);
      expect(createSpy).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isValid: false,
        }),
      });
    });
  });

  describe("SessionTrackingService", () => {
    it("should record session start and calculate duration on session end", async () => {
      const startTime = new Date("2026-06-01T10:00:00Z");
      const endTime = new Date("2026-06-01T10:15:30Z"); // 15 min 30 sec = 930 sec

      vi.spyOn(prisma.sessionRecord, "findUnique").mockResolvedValue({
        sessionId: "sess-100",
        startedAt: startTime,
      } as any);

      const updateSpy = vi.spyOn(prisma.sessionRecord, "update").mockResolvedValue({} as any);

      await SessionTrackingService.processSessionEvent(
        "sess-100",
        "tester-1",
        "ct-1",
        ActivityEventType.SESSION_ENDED,
        endTime,
      );

      expect(updateSpy).toHaveBeenCalledWith({
        where: { sessionId: "sess-100" },
        data: expect.objectContaining({
          endedAt: endTime,
          durationSeconds: 930,
          isAnomalous: false,
        }),
      });
    });
  });

  describe("ActivityScoreService & Multi-Signal Computation", () => {
    it("should compute activity score considering sessions, missions, feedback, and continuity", async () => {
      const now = new Date("2026-06-10T12:00:00Z");
      const joinedAt = new Date("2026-06-01T12:00:00Z"); // 9 days enrolled

      vi.useFakeTimers();
      vi.setSystemTime(now);

      vi.spyOn(prisma.campaignTester, "findUnique").mockResolvedValue({
        id: "ct-1",
        campaignId: "campaign-1",
        testerId: "tester-1",
        joinedAt,
        isReplacement: false,
        campaign: { id: "campaign-1" },
      } as any);

      // 10 sessions across 7 distinct days
      const mockSessions = Array.from({ length: 10 }, (_, i) => ({
        sessionId: `sess-${i}`,
        campaignTesterId: "ct-1",
        startedAt: new Date(joinedAt.getTime() + (i % 7) * 86400000),
        durationSeconds: 600,
        isAnomalous: false,
      }));

      vi.spyOn(prisma.sessionRecord, "findMany").mockResolvedValue(mockSessions as any);
      vi.spyOn(prisma.missionAttempt, "count").mockResolvedValue(4); // 4 completed missions
      vi.spyOn(prisma.mission, "count").mockResolvedValue(5); // 5 total campaign missions
      vi.spyOn(prisma.missionDifficultyFeedback, "count").mockResolvedValue(2);
      vi.spyOn(prisma.missionQualityFeedback, "count").mockResolvedValue(1);
      vi.spyOn(prisma.bugReport, "count").mockResolvedValue(1);

      const { score, signals } = await ActivityScoreService.calculateTesterActivityScore("ct-1");

      expect(score).toBeGreaterThan(60);
      expect(signals.sessionCount).toBe(10);
      expect(signals.completedMissions).toBe(4);
      expect(signals.activeDays).toBe(7);
      expect(signals.isReplacement).toBe(false);

      vi.useRealTimers();
    });
  });

  describe("ActivityClassificationService: Replacement & Gap Resilience", () => {
    it("REPLACEMENT CASE: Tester joining on Day 12 of 14 with high 3-day activity is classified as ACTIVE", async () => {
      // Prompt Rule: Tester B joinedAt = Day 12 (isReplacement=true). Day 12 install & mission 1, Day 13 mission 2, Day 14 activity.
      // Must be classified as ACTIVE without penalty for not participating on days 1-11.
      const now = new Date("2026-06-14T18:00:00Z");
      const joinedAt = new Date("2026-06-12T09:00:00Z"); // 2.5 days enrolled

      vi.useFakeTimers();
      vi.setSystemTime(now);

      vi.spyOn(prisma.campaignTester, "findUnique").mockResolvedValue({
        id: "ct-replacement",
        campaignId: "campaign-1",
        testerId: "tester-replacement",
        joinedAt,
        isReplacement: true,
        campaign: { id: "campaign-1" },
      } as any);

      // Sessions on Day 12, Day 13, Day 14
      const replacementSessions = [
        { sessionId: "s-12", campaignTesterId: "ct-replacement", startedAt: new Date("2026-06-12T10:00:00Z"), durationSeconds: 900, isAnomalous: false },
        { sessionId: "s-13", campaignTesterId: "ct-replacement", startedAt: new Date("2026-06-13T11:00:00Z"), durationSeconds: 1200, isAnomalous: false },
        { sessionId: "s-14", campaignTesterId: "ct-replacement", startedAt: new Date("2026-06-14T15:00:00Z"), durationSeconds: 800, isAnomalous: false },
      ];

      vi.spyOn(prisma.sessionRecord, "findMany").mockResolvedValue(replacementSessions as any);
      vi.spyOn(prisma.sessionRecord, "findFirst").mockResolvedValue(replacementSessions[2] as any);
      vi.spyOn(prisma.missionAttempt, "count").mockResolvedValue(2);
      vi.spyOn(prisma.mission, "count").mockResolvedValue(3);
      vi.spyOn(prisma.missionDifficultyFeedback, "count").mockResolvedValue(1);
      vi.spyOn(prisma.missionQualityFeedback, "count").mockResolvedValue(1);
      vi.spyOn(prisma.bugReport, "count").mockResolvedValue(0);

      const classification = await ActivityClassificationService.classifyTester("ct-replacement");

      expect(classification.state).toBe(ActivityState.ACTIVE);
      expect(classification.signals.isReplacement).toBe(true);
      expect(classification.signals.completedMissions).toBe(2);

      vi.useRealTimers();
    });

    it("GAP RESILIENCE CASE: Tester with 5-day gap who returns with frequent activity is classified as ACTIVE", async () => {
      // Prompt Rule: Tester A Day 1 install, Day 2 missions, Days 3-7 no activity, Day 8 opens app, Days 9-14 frequent activity.
      // Must NOT be classified as ABANDONED.
      const now = new Date("2026-06-14T20:00:00Z");
      const joinedAt = new Date("2026-06-01T08:00:00Z");

      vi.useFakeTimers();
      vi.setSystemTime(now);

      vi.spyOn(prisma.campaignTester, "findUnique").mockResolvedValue({
        id: "ct-gap-tester",
        campaignId: "campaign-1",
        testerId: "tester-gap",
        joinedAt,
        isReplacement: false,
        campaign: { id: "campaign-1" },
      } as any);

      // Sessions on Day 1, 2, 8, 9, 10, 11, 12, 13, 14
      const gapSessions = [
        { sessionId: "s-1", campaignTesterId: "ct-gap-tester", startedAt: new Date("2026-06-01T10:00:00Z"), durationSeconds: 600, isAnomalous: false },
        { sessionId: "s-2", campaignTesterId: "ct-gap-tester", startedAt: new Date("2026-06-02T10:00:00Z"), durationSeconds: 600, isAnomalous: false },
        { sessionId: "s-8", campaignTesterId: "ct-gap-tester", startedAt: new Date("2026-06-08T10:00:00Z"), durationSeconds: 600, isAnomalous: false },
        { sessionId: "s-9", campaignTesterId: "ct-gap-tester", startedAt: new Date("2026-06-09T10:00:00Z"), durationSeconds: 600, isAnomalous: false },
        { sessionId: "s-14", campaignTesterId: "ct-gap-tester", startedAt: new Date("2026-06-14T12:00:00Z"), durationSeconds: 600, isAnomalous: false },
      ];

      vi.spyOn(prisma.sessionRecord, "findMany").mockResolvedValue(gapSessions as any);
      vi.spyOn(prisma.sessionRecord, "findFirst").mockResolvedValue(gapSessions[4] as any);
      vi.spyOn(prisma.missionAttempt, "count").mockResolvedValue(3);
      vi.spyOn(prisma.mission, "count").mockResolvedValue(4);
      vi.spyOn(prisma.missionDifficultyFeedback, "count").mockResolvedValue(2);
      vi.spyOn(prisma.missionQualityFeedback, "count").mockResolvedValue(1);
      vi.spyOn(prisma.bugReport, "count").mockResolvedValue(1);

      const classification = await ActivityClassificationService.classifyTester("ct-gap-tester");

      expect(classification.state).toBe(ActivityState.ACTIVE);

      vi.useRealTimers();
    });

    it("ABANDONED CASE: Tester with zero activity for prolonged duration is classified as ABANDONED", async () => {
      const now = new Date("2026-06-14T20:00:00Z");
      const joinedAt = new Date("2026-06-01T08:00:00Z");

      vi.useFakeTimers();
      vi.setSystemTime(now);

      vi.spyOn(prisma.campaignTester, "findUnique").mockResolvedValue({
        id: "ct-inactive",
        campaignId: "campaign-1",
        testerId: "tester-inactive",
        joinedAt,
        isReplacement: false,
        campaign: { id: "campaign-1" },
      } as any);

      vi.spyOn(prisma.sessionRecord, "findMany").mockResolvedValue([]);
      vi.spyOn(prisma.sessionRecord, "findFirst").mockResolvedValue(null);
      vi.spyOn(prisma.missionAttempt, "count").mockResolvedValue(0);
      vi.spyOn(prisma.mission, "count").mockResolvedValue(4);
      vi.spyOn(prisma.missionDifficultyFeedback, "count").mockResolvedValue(0);
      vi.spyOn(prisma.missionQualityFeedback, "count").mockResolvedValue(0);
      vi.spyOn(prisma.bugReport, "count").mockResolvedValue(0);

      const classification = await ActivityClassificationService.classifyTester("ct-inactive");

      expect(classification.state).toBe(ActivityState.ABANDONED);

      vi.useRealTimers();
    });
  });
});
