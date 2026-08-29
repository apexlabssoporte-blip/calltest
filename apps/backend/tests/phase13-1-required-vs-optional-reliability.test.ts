import { describe, it, expect } from "vitest";
import { TesterReliabilityService } from "../src/modules/trust/tester-reliability.service.js";
import { TesterActivityService } from "../src/modules/activity/tester-activity.service.js";

describe("Phase 13.1: Required vs Optional Missions & Reliability/Activity Invariants", () => {
  describe("1. Reliability Invariants", () => {
    it("INVARIANT: ignoring optional missions should NOT penalize reliability score", () => {
      // Baseline with 10 required completed, 0 missed
      const baseline = TesterReliabilityService.calculateReliability({
        requiredMissionsCompletedCount: 10,
        requiredMissionsMissedCount: 0,
        requiredMissionsLateCount: 0,
        optionalMissionsIgnoredCount: 0,
        completedCampaignsCount: 2,
        abandonedCampaignsCount: 0,
        replacedAsInactiveCount: 0,
        initialBaseScore: 75,
      });

      // Same user, but also ignored 8 optional missions
      const withIgnoredOptional = TesterReliabilityService.calculateReliability({
        requiredMissionsCompletedCount: 10,
        requiredMissionsMissedCount: 0,
        requiredMissionsLateCount: 0,
        optionalMissionsIgnoredCount: 8, // Ignored 8 optional missions
        completedCampaignsCount: 2,
        abandonedCampaignsCount: 0,
        replacedAsInactiveCount: 0,
        initialBaseScore: 75,
      });

      // Score must be identical! Zero penalty for optional missions
      expect(withIgnoredOptional.score).toBe(baseline.score);
    });

    it("should penalize missed required missions", () => {
      const evaluation = TesterReliabilityService.calculateReliability({
        requiredMissionsCompletedCount: 3,
        requiredMissionsMissedCount: 4, // -32 points
        requiredMissionsLateCount: 1,
        completedCampaignsCount: 1,
        abandonedCampaignsCount: 0,
        replacedAsInactiveCount: 0,
        initialBaseScore: 70,
      });

      expect(evaluation.signals.penaltyPoints).toBeGreaterThanOrEqual(32);
      expect(evaluation.score).toBeLessThan(60);
    });
  });

  describe("2. Activity Invariants", () => {
    it("INVARIANT: should NOT penalize or mark tester AT_RISK when 0 required missions are pending", () => {
      const threeDaysAgo = new Date(Date.now() - 72 * 60 * 60 * 1000); // 72h inactivity

      const result = TesterActivityService.evaluateActivity({
        lastActivityAt: threeDaysAgo,
        pendingMissionsCount: 0, // No required missions pending
        hasOverdueMission: false,
      });

      expect(result.state).toBe("ACTIVE");
      expect(result.canRecover).toBe(false);
    });

    it("should mark AT_RISK when required missions are pending and inactivity exceeds warning threshold", () => {
      const fiftyHoursAgo = new Date(Date.now() - 50 * 60 * 60 * 1000);

      const result = TesterActivityService.evaluateActivity({
        lastActivityAt: fiftyHoursAgo,
        pendingMissionsCount: 3,
        hasOverdueMission: false,
      });

      expect(result.state).toBe("AT_RISK");
      expect(result.canRecover).toBe(true);
    });
  });
});
