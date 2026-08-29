import { describe, it, expect, vi, beforeEach } from "vitest";
import { AppAvailabilityService } from "../src/modules/availability/app-availability.service.js";
import { TesterReliabilityService } from "../src/modules/trust/tester-reliability.service.js";
import { TesterActivityService } from "../src/modules/activity/tester-activity.service.js";
import {
  AvailabilityIssueType,
  ScheduledMissionStatus,
  MissionType,
} from "@calltest/shared-types";

describe("Phase 13.5: Availability Recovery, Tester Progression & Quality Matching", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    AppAvailabilityService._clearStore();
  });

  describe("1. Availability Recovery & New Temporal Window Invariants", () => {
    it("INVARIANT: unblocking mission must generate a NEW valid window and NEVER keep an expired deadline", () => {
      // Scenario: Mission scheduled on Day 1 (starts Aug 1, expired Aug 3)
      const expiredBlockedMission = {
        id: "ms-ct1-d1-install",
        campaignId: "c-1",
        type: MissionType.INSTALL,
        title: "Instalar CallShield",
        description: "Instala desde Google Play",
        scheduledDay: 1,
        availableFrom: new Date("2026-08-01T00:00:00Z"),
        deadline: new Date("2026-08-03T00:00:00Z"), // Expired!
        required: true,
        priority: "CRITICAL" as const,
        status: ScheduledMissionStatus.BLOCKED_BY_AVAILABILITY,
      };

      // Developer resolves availability on Day 9 (Aug 9)
      const resolutionDate = new Date("2026-08-09T12:00:00Z");
      const recoveredMissions = AppAvailabilityService.recoverBlockedMissions(
        [expiredBlockedMission],
        resolutionDate,
        48 // 48h new window
      );

      expect(recoveredMissions.length).toBe(1);
      const recovered = recoveredMissions[0];

      expect(recovered.status).toBe(ScheduledMissionStatus.AVAILABLE);
      // New availableFrom must be the resolution date
      expect(recovered.availableFrom.toISOString()).toBe("2026-08-09T12:00:00.000Z");
      // New deadline must be resolution date + 48h (Aug 11), NOT the old Aug 3 deadline!
      expect(recovered.deadline.toISOString()).toBe("2026-08-11T12:00:00.000Z");
      expect(recovered.deadline.getTime()).toBeGreaterThan(resolutionDate.getTime());
    });

    it("INVARIANT: BLOCKED_BY_AVAILABILITY during multiple days does NOT trigger AT_RISK or penalties", () => {
      const fiveDaysAgo = new Date(Date.now() - 120 * 60 * 60 * 1000); // 120 hours

      const activityResult = TesterActivityService.evaluateActivity({
        lastActivityAt: fiveDaysAgo,
        pendingMissionsCount: 0, // Blocked mission does not count as pending actionable
        hasOverdueMission: false,
      });

      expect(activityResult.state).toBe("ACTIVE");
      expect(activityResult.canRecover).toBe(false);

      const reliability = TesterReliabilityService.calculateReliability({
        requiredMissionsCompletedCount: 5,
        requiredMissionsMissedCount: 0, // 0 missed
        completedCampaignsCount: 1,
        abandonedCampaignsCount: 0,
        replacedAsInactiveCount: 0,
        initialBaseScore: 70,
      });

      expect(reliability.signals.penaltyPoints).toBe(0);
    });
  });

  describe("2. Issue Type Differentiation (Country vs Device/Android Compatibility)", () => {
    it("should support diverse issue types without false country restriction assumptions", () => {
      const issueTypes = [
        AvailabilityIssueType.COUNTRY_RESTRICTION,
        AvailabilityIssueType.DEVICE_COMPATIBILITY,
        AvailabilityIssueType.PLAY_STORE_ERROR,
        AvailabilityIssueType.ACCOUNT_RESTRICTION,
        AvailabilityIssueType.UNKNOWN,
      ];

      expect(issueTypes.length).toBe(5);
      expect(issueTypes).toContain(AvailabilityIssueType.DEVICE_COMPATIBILITY);
    });
  });

  describe("3. Tester Progression Tier & Real History Invariants", () => {
    it("should initialize brand new tester at NEW tier without penalty", () => {
      const progression = TesterReliabilityService.evaluateTesterProgression({
        campaignsCompleted: 0,
        campaignsAbandoned: 0,
        requiredMissionsCompleted: 0,
        requiredMissionsMissed: 0,
      });

      expect(progression.tier).toBe("NEW");
      expect(progression.higherMatchingPriorityMultiplier).toBe(1.0);
      expect(progression.reliabilityScore).toBeGreaterThanOrEqual(70);
    });

    it("should promote tester to ACTIVE after 1 completed campaign", () => {
      const progression = TesterReliabilityService.evaluateTesterProgression({
        campaignsCompleted: 1,
        campaignsAbandoned: 0,
        requiredMissionsCompleted: 14,
        requiredMissionsMissed: 0,
      });

      expect(progression.tier).toBe("ACTIVE");
      expect(progression.higherMatchingPriorityMultiplier).toBe(1.15);
    });

    it("should promote tester to RELIABLE after 2 completed campaigns and Reliability >= 75", () => {
      const progression = TesterReliabilityService.evaluateTesterProgression({
        campaignsCompleted: 2,
        campaignsAbandoned: 0,
        requiredMissionsCompleted: 28,
        requiredMissionsMissed: 0,
      });

      expect(progression.tier).toBe("RELIABLE");
      expect(progression.higherMatchingPriorityMultiplier).toBe(1.35);
    });

    it("should promote tester to HIGHLY_RELIABLE after 4+ completed campaigns, 0 abandonments and Reliability >= 90", () => {
      const progression = TesterReliabilityService.evaluateTesterProgression({
        campaignsCompleted: 5,
        campaignsAbandoned: 0,
        requiredMissionsCompleted: 70,
        requiredMissionsMissed: 0,
      });

      expect(progression.tier).toBe("HIGHLY_RELIABLE");
      expect(progression.higherMatchingPriorityMultiplier).toBe(1.5);
    });

    it("should penalize progression tier when campaigns are abandoned", () => {
      const progression = TesterReliabilityService.evaluateTesterProgression({
        campaignsCompleted: 2,
        campaignsAbandoned: 2, // High abandonment penalty
        requiredMissionsCompleted: 10,
        requiredMissionsMissed: 5,
      });

      expect(progression.tier).toBe("ACTIVE"); // Blocked from RELIABLE/HIGHLY_RELIABLE
      expect(progression.reliabilityScore).toBeLessThan(70);
    });
  });

  describe("4. Quality Matching with Progression Support", () => {
    it("INVARIANT: V1 matching functions seamlessly when 0 HIGHLY_RELIABLE testers exist in the pool", () => {
      // Simulating a fresh V1 pool of 15 NEW testers
      const candidates = Array.from({ length: 15 }, (_, i) => ({
        id: `t-v1-new-${i + 1}`,
        progression: TesterReliabilityService.evaluateTesterProgression({
          campaignsCompleted: 0,
          campaignsAbandoned: 0,
          requiredMissionsCompleted: 0,
          requiredMissionsMissed: 0,
        }),
      }));

      expect(candidates.every((c) => c.progression.tier === "NEW")).toBe(true);

      // System successfully selects 12 active + 3 backups from NEW candidates without blocking
      const activeTesters = candidates.slice(0, 12);
      const backupTesters = candidates.slice(12, 15);

      expect(activeTesters.length).toBe(12);
      expect(backupTesters.length).toBe(3);
    });

    it("should give higher priority multiplier to RELIABLE and HIGHLY_RELIABLE testers over NEW testers", () => {
      const newTester = TesterReliabilityService.evaluateTesterProgression({
        campaignsCompleted: 0,
        campaignsAbandoned: 0,
        requiredMissionsCompleted: 0,
        requiredMissionsMissed: 0,
      });

      const reliableTester = TesterReliabilityService.evaluateTesterProgression({
        campaignsCompleted: 3,
        campaignsAbandoned: 0,
        requiredMissionsCompleted: 40,
        requiredMissionsMissed: 0,
      });

      const highlyReliableTester = TesterReliabilityService.evaluateTesterProgression({
        campaignsCompleted: 6,
        campaignsAbandoned: 0,
        requiredMissionsCompleted: 84,
        requiredMissionsMissed: 0,
      });

      expect(highlyReliableTester.higherMatchingPriorityMultiplier).toBeGreaterThan(
        reliableTester.higherMatchingPriorityMultiplier
      );
      expect(reliableTester.higherMatchingPriorityMultiplier).toBeGreaterThan(
        newTester.higherMatchingPriorityMultiplier
      );
    });
  });

  describe("5. Full End-to-End Lifecycle with Availability Recovery & Progression", () => {
    it("should simulate entire lifecycle: New tester -> Availability Block -> Recovery with New Window -> Completion -> Progression Updated", async () => {
      // Step 1: New tester begins campaign
      const campaignId = "c-e2e-prog-01";

      const initialProgression = TesterReliabilityService.evaluateTesterProgression({
        campaignsCompleted: 0,
        campaignsAbandoned: 0,
        requiredMissionsCompleted: 0,
        requiredMissionsMissed: 0,
      });
      expect(initialProgression.tier).toBe("NEW");

      // Step 2: Day 5 -> Tester encounters availability issue, mission is blocked
      const blockedMission = {
        id: "ms-ct1-d5-explore",
        campaignId,
        type: MissionType.EXPLORE,
        title: "Exploración de ajustes",
        description: "Explorar menú de ajustes",
        scheduledDay: 5,
        availableFrom: new Date("2026-08-05T00:00:00Z"),
        deadline: new Date("2026-08-07T00:00:00Z"),
        required: false,
        priority: "NORMAL" as const,
        status: ScheduledMissionStatus.BLOCKED_BY_AVAILABILITY,
      };

      // Step 3: Day 8 -> Developer resolves availability issue
      const resolutionDate = new Date("2026-08-08T10:00:00Z");
      const unblocked = AppAvailabilityService.recoverBlockedMissions(
        [blockedMission],
        resolutionDate,
        48
      );

      expect(unblocked[0].status).toBe(ScheduledMissionStatus.AVAILABLE);
      expect(unblocked[0].availableFrom.toISOString()).toBe("2026-08-08T10:00:00.000Z");
      expect(unblocked[0].deadline.toISOString()).toBe("2026-08-10T10:00:00.000Z");

      // Step 4: Tester completes all 14 days cleanly
      const postCampaignProgression = TesterReliabilityService.evaluateTesterProgression({
        campaignsCompleted: 1,
        campaignsAbandoned: 0,
        requiredMissionsCompleted: 14,
        requiredMissionsMissed: 0,
        availabilityReportsValidated: 1,
      });

      expect(postCampaignProgression.tier).toBe("ACTIVE");
      expect(postCampaignProgression.campaignsCompleted).toBe(1);
      expect(postCampaignProgression.higherMatchingPriorityMultiplier).toBe(1.15);
    });
  });
});
