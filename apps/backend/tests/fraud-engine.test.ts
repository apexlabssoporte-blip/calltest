import { describe, it, expect, vi, beforeEach } from "vitest";
import { DuplicateEventSignal } from "../src/modules/fraud/signals/duplicate-event.signal.js";
import { ClockManipulationSignal } from "../src/modules/fraud/signals/clock-manipulation.signal.js";
import { ImpossibleSessionSignal } from "../src/modules/fraud/signals/impossible-session.signal.js";
import { RapidMissionCompletionSignal } from "../src/modules/fraud/signals/rapid-mission-completion.signal.js";
import { AbnormalMissionPatternSignal } from "../src/modules/fraud/signals/abnormal-mission-pattern.signal.js";
import { RepeatedAssignmentAbuseSignal } from "../src/modules/fraud/signals/repeated-assignment-abuse.signal.js";
import { MultipleAccountSignal } from "../src/modules/fraud/signals/multiple-account.signal.js";
import { SuspiciousActivityBurstSignal } from "../src/modules/fraud/signals/suspicious-activity-burst.signal.js";
import { FraudScoreService } from "../src/modules/fraud/fraud-score-service.js";
import { FraudDecisionService } from "../src/modules/fraud/fraud-decision-service.js";
import { prisma } from "../src/core/database/prisma.js";
import {
  FraudDecisionAction,
  FraudEventType,
  FraudSeverity,
  ReputationStatus,
} from "@calltest/shared-types";

describe("Fraud Engine: Signals, Scoring, False Positives & Decisions", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Individual Fraud Signal Detectors", () => {
    it("DuplicateEventSignal: should trigger on duplicate event flag", async () => {
      const signal = new DuplicateEventSignal();
      const res = await signal.evaluate({
        userId: "user-1",
        payload: { isDuplicate: true },
      });

      expect(res).not.toBeNull();
      expect(res?.triggered).toBe(true);
      expect(res?.type).toBe(FraudEventType.DUPLICATE_EVENT);
      expect(res?.severity).toBe(FraudSeverity.LOW);
    });

    it("ClockManipulationSignal: should trigger on severe future timestamp skew", async () => {
      const signal = new ClockManipulationSignal();
      const now = new Date();
      const futureTime = new Date(now.getTime() + 10 * 60 * 1000); // 10 min future skew

      const res = await signal.evaluate({
        userId: "user-1",
        serverTimestamp: now,
        clientTimestamp: futureTime,
      });

      expect(res).not.toBeNull();
      expect(res?.triggered).toBe(true);
      expect(res?.type).toBe(FraudEventType.CLOCK_MANIPULATION);
    });

    it("ImpossibleSessionSignal: should trigger on physically impossible session (>24h)", async () => {
      const signal = new ImpossibleSessionSignal();
      const res = await signal.evaluate({
        userId: "user-1",
        durationSeconds: 100000, // > 24 hours
      });

      expect(res).not.toBeNull();
      expect(res?.triggered).toBe(true);
      expect(res?.type).toBe(FraudEventType.IMPOSSIBLE_SESSION);
      expect(res?.severity).toBe(FraudSeverity.HIGH);
    });

    it("RapidMissionCompletionSignal: should trigger on sub-5 second submission", async () => {
      const signal = new RapidMissionCompletionSignal();
      const res = await signal.evaluate({
        userId: "user-1",
        durationSeconds: 3, // 3 seconds
        estimatedMinutes: 15,
      });

      expect(res).not.toBeNull();
      expect(res?.triggered).toBe(true);
      expect(res?.type).toBe(FraudEventType.RAPID_MISSION_COMPLETION);
    });

    it("AbnormalMissionPatternSignal: should trigger on 5+ missions in <1 min", async () => {
      const signal = new AbnormalMissionPatternSignal();
      const res = await signal.evaluate({
        userId: "user-1",
        recentEventCount: 6,
        timeWindowMs: 45000,
      });

      expect(res).not.toBeNull();
      expect(res?.triggered).toBe(true);
      expect(res?.type).toBe(FraudEventType.ABNORMAL_MISSION_PATTERN);
    });

    it("RepeatedAssignmentAbuseSignal: should trigger on >= 3 abandonments in short window", async () => {
      const signal = new RepeatedAssignmentAbuseSignal();
      const res = await signal.evaluate({
        userId: "user-1",
        payload: { abandonmentsCount: 4, daysWindow: 10 },
      });

      expect(res).not.toBeNull();
      expect(res?.triggered).toBe(true);
      expect(res?.type).toBe(FraudEventType.REPEATED_ASSIGNMENT_ABUSE);
    });

    it("MultipleAccountSignal: should trigger risk signal without instant ban", async () => {
      const signal = new MultipleAccountSignal();
      const res = await signal.evaluate({
        userId: "user-1",
        deviceFingerprint: "device-fp-12345",
        payload: { sharedAccountsCount: 3 },
      });

      expect(res).not.toBeNull();
      expect(res?.triggered).toBe(true);
      expect(res?.type).toBe(FraudEventType.MULTIPLE_ACCOUNT_SIGNAL);
      expect(res?.severity).toBe(FraudSeverity.MEDIUM); // Risk signal, not instant ban
    });

    it("SuspiciousActivityBurstSignal: should trigger on 50+ events in <2s", async () => {
      const signal = new SuspiciousActivityBurstSignal();
      const res = await signal.evaluate({
        userId: "user-1",
        recentEventCount: 60,
        timeWindowMs: 1500,
      });

      expect(res).not.toBeNull();
      expect(res?.triggered).toBe(true);
      expect(res?.type).toBe(FraudEventType.SUSPICIOUS_ACTIVITY_BURST);
    });
  });

  describe("False Positive Protections", () => {
    it("FALSE POSITIVE: legitimate fast but plausible completion should not trigger rapid completion signal", async () => {
      const signal = new RapidMissionCompletionSignal();
      const res = await signal.evaluate({
        userId: "user-1",
        durationSeconds: 120, // 2 minutes for a 5-minute mission (40% duration)
        estimatedMinutes: 5,
      });

      expect(res).toBeNull();
    });

    it("FALSE POSITIVE: normal device sharing between 2 family accounts does not trigger fraud signal", async () => {
      const signal = new MultipleAccountSignal();
      const res = await signal.evaluate({
        userId: "user-1",
        deviceFingerprint: "device-family",
        payload: { sharedAccountsCount: 2 }, // Below threshold of 3
      });

      expect(res).toBeNull();
    });
  });

  describe("Fraud Score Calculation & Proportional Decision Escalation", () => {
    it("should calculate bounded fraud score and map to proportional decisions", async () => {
      // 0 events -> 0 score -> NO_ACTION
      vi.spyOn(prisma.fraudEvent, "findMany").mockResolvedValueOnce([]);

      const normalScore = await FraudScoreService.calculateFraudScore("user-normal");
      expect(normalScore.fraudScore).toBe(0);
      expect(normalScore.recommendedStatus).toBe(ReputationStatus.NORMAL);

      // 1 medium event (score 15) -> WATCH -> MONITOR
      vi.spyOn(prisma.fraudEvent, "findMany").mockResolvedValueOnce([
        { scoreImpact: 15, severity: FraudSeverity.MEDIUM, resolvedAt: null },
      ] as any);

      const watchScore = await FraudScoreService.calculateFraudScore("user-watch");
      expect(watchScore.fraudScore).toBe(15);
      expect(watchScore.recommendedStatus).toBe(ReputationStatus.NORMAL);

      // Cumulative high events (score 65) -> RESTRICTED
      vi.spyOn(prisma.fraudEvent, "findMany").mockResolvedValueOnce([
        { scoreImpact: 25, severity: FraudSeverity.HIGH, resolvedAt: null },
        { scoreImpact: 25, severity: FraudSeverity.HIGH, resolvedAt: null },
        { scoreImpact: 15, severity: FraudSeverity.MEDIUM, resolvedAt: null },
      ] as any);

      const restrictedScore = await FraudScoreService.calculateFraudScore("user-restricted");
      expect(restrictedScore.fraudScore).toBe(65);
      expect(restrictedScore.recommendedStatus).toBe(ReputationStatus.RESTRICTED);
    });

    it("FraudDecisionService: should escalate to BAN on critical fraud score (>90)", async () => {
      vi.spyOn(FraudScoreService, "calculateFraudScore").mockResolvedValue({
        userId: "user-banned",
        fraudScore: 95,
        unresolvedEventsCount: 4,
        criticalEventsCount: 2,
        highestSeverity: FraudSeverity.CRITICAL,
        recommendedStatus: ReputationStatus.BANNED,
      });

      vi.spyOn(prisma, "$transaction").mockImplementation(async (cb: any) => {
        const txMock = {
          trustProfile: { upsert: vi.fn() },
          user: { update: vi.fn() },
        };
        return cb(txMock);
      });
      vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

      const decision = await FraudDecisionService.evaluateAndDecide("user-banned");

      expect(decision.action).toBe(FraudDecisionAction.BAN);
      expect(decision.reputationStatus).toBe(ReputationStatus.BANNED);
    });
  });
});
