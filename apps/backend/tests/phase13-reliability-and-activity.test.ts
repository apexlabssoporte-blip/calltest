import { describe, it, expect } from "vitest";
import { TesterReliabilityService } from "../src/modules/trust/tester-reliability.service.js";
import { TesterActivityService } from "../src/modules/activity/tester-activity.service.js";
import { TesterReliabilityTier } from "@calltest/shared-types";

describe("Phase 13: Tester Reliability & Activity Invariants", () => {
  describe("1. Tester Reliability Calculation (0-100)", () => {
    it("should compute HIGHLY_RELIABLE for consistent completion track record regardless of level", () => {
      const evaluation = TesterReliabilityService.calculateReliability({
        completedMissionsCount: 15,
        missedMissionsCount: 0,
        lateMissionsCount: 0,
        completedCampaignsCount: 3,
        abandonedCampaignsCount: 0,
        replacedAsInactiveCount: 0,
        recentActivityStreakDays: 5,
        initialBaseScore: 75,
      });

      expect(evaluation.score).toBeGreaterThanOrEqual(90);
      expect(evaluation.tier).toBe(TesterReliabilityTier.HIGHLY_RELIABLE);
      expect(TesterReliabilityService.isEligibleForReinforcement(evaluation.score)).toBe(true);
    });

    it("should heavily penalize campaign abandonments and inactive replacements", () => {
      const evaluation = TesterReliabilityService.calculateReliability({
        completedMissionsCount: 2,
        missedMissionsCount: 3,
        lateMissionsCount: 2,
        completedCampaignsCount: 0,
        abandonedCampaignsCount: 2, // -50
        replacedAsInactiveCount: 1, // -20
        initialBaseScore: 70,
      });

      expect(evaluation.score).toBeLessThan(50);
      expect(evaluation.tier).toBe(TesterReliabilityTier.LOW);
      expect(TesterReliabilityService.isEligibleForReinforcement(evaluation.score)).toBe(false);
    });
  });

  describe("2. Tester Activity & Inactivity Invariants", () => {
    it("INVARIANT: should NEVER penalize or mark tester AT_RISK when they have 0 pending missions", () => {
      const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000); // 96 hours ago

      const result = TesterActivityService.evaluateActivity({
        lastActivityAt: fourDaysAgo,
        pendingMissionsCount: 0, // All missions completed!
        hasOverdueMission: false,
      });

      expect(result.state).toBe("ACTIVE");
      expect(result.reason).toContain("All required missions completed");
    });

    it("should mark AT_RISK when tester has pending missions and exceeds 48 hours without activity", () => {
      const fiftyHoursAgo = new Date(Date.now() - 50 * 60 * 60 * 1000);

      const result = TesterActivityService.evaluateActivity({
        lastActivityAt: fiftyHoursAgo,
        pendingMissionsCount: 2,
        hasOverdueMission: false,
      });

      expect(result.state).toBe("AT_RISK");
      expect(result.canRecover).toBe(true);
    });

    it("should recover from AT_RISK to ACTIVE upon submitting mission activity", () => {
      const recoveredState = TesterActivityService.recoverFromRisk("AT_RISK");
      expect(recoveredState).toBe("ACTIVE");
    });
  });
});
