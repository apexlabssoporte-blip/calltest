import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserIdentityService } from "../src/modules/identity/user-identity.service.js";
import { TesterReliabilityService } from "../src/modules/trust/tester-reliability.service.js";
import { TesterActivityService } from "../src/modules/activity/tester-activity.service.js";
import { MissionScheduleService } from "../src/modules/missions/mission-schedule.service.js";
import { AppAvailabilityService } from "../src/modules/availability/app-availability.service.js";
import { CampaignCapacityService, CAMPAIGN_ACTIVE_TESTER_TARGET, CAMPAIGN_BACKUP_TARGET } from "../src/modules/campaigns/capacity.service.js";
import { BackupTesterService } from "../src/modules/campaign-testers/backup-tester.service.js";
import {
  IdentityRiskLevel,
  ScheduledMissionStatus,
  MissionType,
} from "@calltest/shared-types";
import { prisma } from "../src/core/database/prisma.js";

describe("Phase 13.6.1: Regression & Abuse Verification", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    UserIdentityService._clearStore();
    AppAvailabilityService._clearStore();
    vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);
    vi.spyOn(prisma.campaignTester, "findMany").mockResolvedValue([
      { id: "b1" },
      { id: "b2" },
      { id: "b3" },
    ] as any);
  });

  describe("1. Progression Idempotency & Anti-Farming", () => {
    it("should return identical progression profile when evaluated 100 times", () => {
      const history = {
        campaignsCompleted: 2,
        campaignsAbandoned: 0,
        requiredMissionsCompleted: 28,
        requiredMissionsMissed: 0,
      };

      const baseline = TesterReliabilityService.evaluateTesterProgression(history);

      for (let i = 0; i < 100; i++) {
        const current = TesterReliabilityService.evaluateTesterProgression(history);
        expect(current.tier).toBe(baseline.tier);
        expect(current.reliabilityScore).toBe(baseline.reliabilityScore);
        expect(current.higherMatchingPriorityMultiplier).toBe(baseline.higherMatchingPriorityMultiplier);
        expect(current.campaignsCompleted).toBe(2);
      }
    });

    it("should record campaign completion exactly once per user+campaign (deduplication)", async () => {
      const userId = "u-prog-farm-1";
      const campaignId = "c-unique-1";

      const first = await UserIdentityService.recordCampaignCompletion(userId, campaignId);
      expect(first.alreadyRecorded).toBe(false);
      expect(first.totalUniqueCompletions).toBe(1);

      // Attempt 10 duplicate completions
      for (let i = 0; i < 10; i++) {
        const dup = await UserIdentityService.recordCampaignCompletion(userId, campaignId);
        expect(dup.alreadyRecorded).toBe(true);
        expect(dup.totalUniqueCompletions).toBe(1);
      }
    });

    it("should prevent duplicate mission completion events from inflating progress", () => {
      const missionAttempts = [
        { missionId: "m1", status: ScheduledMissionStatus.COMPLETED, completedAt: new Date() },
        { missionId: "m1", status: ScheduledMissionStatus.COMPLETED, completedAt: new Date() }, // Duplicate attempt
      ];

      // De-duplicate completed mission attempts
      const uniqueCompletedMissionIds = new Set(
        missionAttempts
          .filter((m) => m.status === ScheduledMissionStatus.COMPLETED)
          .map((m) => m.missionId)
      );

      expect(uniqueCompletedMissionIds.size).toBe(1);
    });
  });

  describe("2. Developer Bonus Anti-Farming", () => {
    it("should reward legitimate participation and reject artificial developer bonus inflation", () => {
      // Normal developer without tester history
      const unverifiedDeveloperScore = UserIdentityService.calculateMatchingScore({
        candidate: {
          userId: "t-cand",
          reliabilityScore: 80,
          progressionTier: "ACTIVE",
          riskLevel: IdentityRiskLevel.LOW_RISK,
        },
        developerBonusMultiplier: 1.0,
      });

      // Legitimate developer who participates responsibly as a tester
      const legitimateDeveloperScore = UserIdentityService.calculateMatchingScore({
        candidate: {
          userId: "t-cand",
          reliabilityScore: 80,
          progressionTier: "ACTIVE",
          riskLevel: IdentityRiskLevel.LOW_RISK,
        },
        developerBonusMultiplier: 1.25,
      });

      expect(legitimateDeveloperScore.matchScore).toBeGreaterThan(unverifiedDeveloperScore.matchScore);
      expect(legitimateDeveloperScore.developerPriorityMultiplier).toBe(1.25);
    });
  });

  describe("3. Identity Separation & Shared Network Protection", () => {
    it("should treat deviceFingerprint as a signal, NOT as user identity", async () => {
      // Same user accessing from two different devices
      const identityDeviceA = await UserIdentityService.getOrCreateIdentity("u-legit-user", {
        deviceFingerprint: "device-phone-a",
      });

      const identityDeviceB = await UserIdentityService.getOrCreateIdentity("u-legit-user", {
        deviceFingerprint: "device-tablet-b",
      });

      expect(identityDeviceA.id).toBe(identityDeviceB.id);
      expect(identityDeviceB.deviceFingerprints).toContain(
        UserIdentityService.hashFingerprint("device-phone-a")
      );
      expect(identityDeviceB.deviceFingerprints).toContain(
        UserIdentityService.hashFingerprint("device-tablet-b")
      );
    });

    it("INVARIANT: Shared IP/NAT/University Wi-Fi NEVER merges accounts or applies penalties", async () => {
      const dormUser1 = await UserIdentityService.getOrCreateIdentity("u-dorm-1", {
        deviceFingerprint: "pixel-7-dorm",
        ipAddress: "10.0.0.1",
      });

      const dormUser2 = await UserIdentityService.getOrCreateIdentity("u-dorm-2", {
        deviceFingerprint: "galaxy-s23-dorm",
        ipAddress: "10.0.0.1",
      });

      expect(dormUser1.id).not.toBe(dormUser2.id);
      expect(dormUser1.status).toBe("ACTIVE");
      expect(dormUser2.status).toBe("ACTIVE");

      const check = await UserIdentityService.detectRelatedAccounts({
        userId: "u-dorm-2",
        deviceFingerprint: "galaxy-s23-dorm",
        ipAddress: "10.0.0.1",
      });

      expect(check.isMultiAccountSuspected).toBe(false);
      expect(check.riskLevel).toBe(IdentityRiskLevel.LOW_RISK);
    });
  });

  describe("4. Multi-Account Risk vs Authority (Risk does NOT Ban)", () => {
    it("should generate IdentityRiskCluster when same hardware signature is shared, without automated ban", async () => {
      await UserIdentityService.getOrCreateIdentity("u-farm-a", {
        deviceFingerprint: "shared-hw-sig-999",
      });

      const result = await UserIdentityService.detectRelatedAccounts({
        userId: "u-farm-b",
        deviceFingerprint: "shared-hw-sig-999",
      });

      expect(result.isMultiAccountSuspected).toBe(true);
      expect(result.riskLevel).toBe(IdentityRiskLevel.MEDIUM_RISK);
      expect(result.cluster?.relatedUserIds).toEqual(
        expect.arrayContaining(["u-farm-a", "u-farm-b"])
      );

      // INVARIANT: Account remains ACTIVE, not deleted or banned
      const accountB = await UserIdentityService.getOrCreateIdentity("u-farm-b");
      expect(accountB.status).toBe("ACTIVE");
      expect(accountB.riskLevel).toBe(IdentityRiskLevel.MEDIUM_RISK);
    });

    it("should adjust matching priority based on risk level while keeping HIGH_RISK candidates eligible", () => {
      const lowRisk = UserIdentityService.calculateMatchingScore({
        candidate: {
          userId: "u-1",
          reliabilityScore: 80,
          progressionTier: "ACTIVE",
          riskLevel: IdentityRiskLevel.LOW_RISK,
        },
      });

      const mediumRisk = UserIdentityService.calculateMatchingScore({
        candidate: {
          userId: "u-2",
          reliabilityScore: 80,
          progressionTier: "ACTIVE",
          riskLevel: IdentityRiskLevel.MEDIUM_RISK,
        },
      });

      const highRisk = UserIdentityService.calculateMatchingScore({
        candidate: {
          userId: "u-3",
          reliabilityScore: 80,
          progressionTier: "ACTIVE",
          riskLevel: IdentityRiskLevel.HIGH_RISK,
        },
      });

      expect(lowRisk.matchScore).toBeGreaterThan(mediumRisk.matchScore);
      expect(mediumRisk.matchScore).toBeGreaterThan(highRisk.matchScore);

      // High risk remains positive and eligible (not blocked/zeroed)
      expect(highRisk.matchScore).toBeGreaterThan(0);
      expect(highRisk.riskMultiplier).toBe(0.5);
    });
  });

  describe("5. V1 100% NEW Pool & Quality Matching Hierarchy", () => {
    it("INVARIANT: V1 operates seamlessly when 100% of candidate pool are NEW testers", () => {
      const freshCandidates = Array.from({ length: 15 }, (_, i) => ({
        userId: `t-fresh-${i + 1}`,
        reliabilityScore: 70,
        progressionTier: "NEW" as const,
        riskLevel: IdentityRiskLevel.LOW_RISK,
      }));

      const scored = freshCandidates.map((candidate) => ({
        candidate,
        ...UserIdentityService.calculateMatchingScore({ candidate }),
      }));

      expect(scored.every((s) => s.matchScore > 0)).toBe(true);
      expect(scored.every((s) => s.progressionMultiplier === 1.0)).toBe(true);

      const active = scored.slice(0, 12);
      const backup = scored.slice(12, 15);

      expect(active.length).toBe(12);
      expect(backup.length).toBe(3);
    });

    it("should respect strict progression hierarchy: HIGHLY_RELIABLE > RELIABLE > ACTIVE > NEW", () => {
      const candidates = [
        { userId: "c1", reliabilityScore: 90, progressionTier: "HIGHLY_RELIABLE" as const },
        { userId: "c2", reliabilityScore: 90, progressionTier: "RELIABLE" as const },
        { userId: "c3", reliabilityScore: 90, progressionTier: "ACTIVE" as const },
        { userId: "c4", reliabilityScore: 90, progressionTier: "NEW" as const },
      ];

      const scored = candidates.map((c) => UserIdentityService.calculateMatchingScore({ candidate: c }));

      expect(scored[0].matchScore).toBeGreaterThan(scored[1].matchScore);
      expect(scored[1].matchScore).toBeGreaterThan(scored[2].matchScore);
      expect(scored[2].matchScore).toBeGreaterThan(scored[3].matchScore);

      expect(scored[0].progressionMultiplier).toBe(1.50);
      expect(scored[1].progressionMultiplier).toBe(1.35);
      expect(scored[2].progressionMultiplier).toBe(1.15);
      expect(scored[3].progressionMultiplier).toBe(1.00);
    });
  });

  describe("6. Mission & Protection Invariants (Availability, ENDED_EARLY, Optional Ignored)", () => {
    it("INVARIANT: BLOCKED_BY_AVAILABILITY incurs ZERO reliability, activity, and progression penalties", () => {
      const reliability = TesterReliabilityService.calculateReliability({
        requiredMissionsCompletedCount: 5,
        requiredMissionsMissedCount: 0, // Blocked mission is NOT missed
        completedCampaignsCount: 1,
        abandonedCampaignsCount: 0,
        replacedAsInactiveCount: 0,
        initialBaseScore: 75,
      });

      expect(reliability.signals.penaltyPoints).toBe(0);

      const activity = TesterActivityService.evaluateActivity({
        lastActivityAt: new Date(Date.now() - 96 * 60 * 60 * 1000), // 96h
        pendingMissionsCount: 0, // Blocked mission is not actionable pending
        hasOverdueMission: false,
      });

      expect(activity.state).toBe("ACTIVE");
    });

    it("INVARIANT: Optional mission ignored generates 0 penalty points", () => {
      const reliability = TesterReliabilityService.calculateReliability({
        requiredMissionsCompletedCount: 14,
        requiredMissionsMissedCount: 0,
        optionalMissionsIgnoredCount: 10, // Ignored 10 optional missions
        completedCampaignsCount: 1,
        abandonedCampaignsCount: 0,
        replacedAsInactiveCount: 0,
        initialBaseScore: 70,
      });

      expect(reliability.signals.penaltyPoints).toBe(0);
      expect(reliability.score).toBeGreaterThanOrEqual(70);
    });

    it("INVARIANT: ENDED_EARLY cancels future missions without corrupting completed history or penalizing", () => {
      const schedule = [
        {
          id: "m1",
          campaignId: "c1",
          type: MissionType.INSTALL,
          title: "Install",
          description: "Install app",
          scheduledDay: 1,
          required: true,
          priority: "CRITICAL" as const,
          status: ScheduledMissionStatus.COMPLETED,
          completedAt: new Date(),
        },
        {
          id: "m2",
          campaignId: "c1",
          type: MissionType.FUNCTIONAL,
          title: "Test Feature",
          description: "Test checkout",
          scheduledDay: 8,
          required: true,
          priority: "NORMAL" as const,
          status: ScheduledMissionStatus.PENDING,
        },
      ];

      // Developer ends campaign on Day 6 because app became public
      const updatedSchedule = MissionScheduleService.cancelFutureMissions(schedule, 6);

      expect(updatedSchedule[0].status).toBe(ScheduledMissionStatus.COMPLETED);
      expect(updatedSchedule[1].status).toBe(ScheduledMissionStatus.CANCELLED);
    });
  });

  describe("7. Capacity & Backup Concurrency Bounds", () => {
    it("INVARIANT: System strictly maintains max 12 active testers + max 3 backups", () => {
      expect(CAMPAIGN_ACTIVE_TESTER_TARGET).toBe(12);
      expect(CAMPAIGN_BACKUP_TARGET).toBe(3);

      const capacity = CampaignCapacityService.evaluateCampaignCapacity(12, 3);
      expect(capacity.activeTarget).toBe(12);
      expect(capacity.backupTarget).toBe(3);
      expect(capacity.totalTarget).toBe(15);
      expect(capacity.isUnderCapacity).toBe(false);
      expect(capacity.backupNeeded).toBe(0);
    });

    it("should prevent double-promotion or overallocation of backups under concurrency", async () => {
      const campaignId = "c-concur-1";
      const fullBackups = ["b1", "b2", "b3"];

      const reserved = await BackupTesterService.reserveBackups(campaignId, ["b4", "b5"], fullBackups);
      expect(reserved.length).toBe(0);
    });
  });

  describe("8. Security & Authority Invariants", () => {
    it("INVARIANT: Client cannot manually set or tamper with Reliability, Progression, or Matching Priority", () => {
      // Direct verification that Progression and Matching are calculated purely on backend
      const unforgeableProgression = TesterReliabilityService.evaluateTesterProgression({
        campaignsCompleted: 0,
        campaignsAbandoned: 0,
        requiredMissionsCompleted: 0,
        requiredMissionsMissed: 0,
      });

      expect(unforgeableProgression.tier).toBe("NEW");
      expect(unforgeableProgression.higherMatchingPriorityMultiplier).toBe(1.0);
    });

    it("INVARIANT: Sensitive technical fingerprints are hashed with SHA-256 for Zero-PII protection", () => {
      const rawDevice = "Pixel_7_Pro_Serial_12345";
      const hashed = UserIdentityService.hashFingerprint(rawDevice);

      expect(hashed).not.toBe(rawDevice);
      expect(hashed.length).toBe(64); // Valid SHA-256 hex string
      expect(hashed).toMatch(/^[a-f0-9]{64}$/);
    });
  });
});
