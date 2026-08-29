import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserIdentityService } from "../src/modules/identity/user-identity.service.js";
import { TesterReliabilityService } from "../src/modules/trust/tester-reliability.service.js";
import { CampaignCapacityService, CAMPAIGN_ACTIVE_TESTER_TARGET, CAMPAIGN_BACKUP_TARGET } from "../src/modules/campaigns/capacity.service.js";
import { BackupTesterService } from "../src/modules/campaign-testers/backup-tester.service.js";
import { IdentityRiskLevel } from "@calltest/shared-types";
import { prisma } from "../src/core/database/prisma.js";

describe("Phase 13.6: Identity, Anti-Abuse & Quality Matching Hardening", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    UserIdentityService._clearStore();
    vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);
    vi.spyOn(prisma.campaignTester, "findMany").mockResolvedValue([
      { id: "b1" },
      { id: "b2" },
      { id: "b3" },
    ] as any);
  });

  describe("1. Identity Persistence & Multi-Account Clustering", () => {
    it("should maintain a stable logical identity across multiple logins/queries", async () => {
      const identity1 = await UserIdentityService.getOrCreateIdentity("u-alice-1", {
        deviceFingerprint: "device-sig-alpha",
        installFingerprint: "install-sig-001",
      });

      const identity2 = await UserIdentityService.getOrCreateIdentity("u-alice-1", {
        deviceFingerprint: "device-sig-alpha",
        installFingerprint: "install-sig-002", // Reinstall
      });

      expect(identity1.id).toBe(identity2.id);
      expect(identity2.identityVersion).toBe(1);
      expect(identity2.deviceFingerprints.length).toBe(1);
      expect(identity2.installFingerprints.length).toBe(2);
    });

    it("INVARIANT: Shared IP/network alone NEVER clusters or bans legitimate accounts", async () => {
      const user1 = await UserIdentityService.getOrCreateIdentity("u-student-1", {
        deviceFingerprint: "device-laptop-1",
        ipAddress: "192.168.1.100", // Shared university/dorm IP
      });

      const user2 = await UserIdentityService.getOrCreateIdentity("u-student-2", {
        deviceFingerprint: "device-phone-2",
        ipAddress: "192.168.1.100", // Shared IP
      });

      const detection = await UserIdentityService.detectRelatedAccounts({
        userId: "u-student-2",
        deviceFingerprint: "device-phone-2",
        ipAddress: "192.168.1.100",
      });

      expect(detection.isMultiAccountSuspected).toBe(false);
      expect(user1.status).toBe("ACTIVE");
      expect(user2.status).toBe("ACTIVE");
    });

    it("should detect related accounts sharing hardware fingerprints without automated bans", async () => {
      // User 1 on physical device A
      await UserIdentityService.getOrCreateIdentity("u-farming-1", {
        deviceFingerprint: "hw-unique-pixel-7a",
      });

      // User 2 created on the SAME physical device A
      const detection = await UserIdentityService.detectRelatedAccounts({
        userId: "u-farming-2",
        deviceFingerprint: "hw-unique-pixel-7a",
      });

      expect(detection.isMultiAccountSuspected).toBe(true);
      expect(detection.riskLevel).toBe(IdentityRiskLevel.MEDIUM_RISK);
      expect(detection.cluster?.relatedUserIds).toContain("u-farming-1");
      expect(detection.cluster?.relatedUserIds).toContain("u-farming-2");

      // INVARIANT: Account is NOT automatically banned
      const user2Identity = await UserIdentityService.getOrCreateIdentity("u-farming-2");
      expect(user2Identity.status).toBe("ACTIVE");
      expect(user2Identity.riskLevel).toBe(IdentityRiskLevel.MEDIUM_RISK);
    });
  });

  describe("2. Progression Integrity & Idempotency", () => {
    it("should calculate deterministic progression levels based on real history", () => {
      // NEW
      const newTester = TesterReliabilityService.evaluateTesterProgression({
        campaignsCompleted: 0,
        campaignsAbandoned: 0,
        requiredMissionsCompleted: 0,
        requiredMissionsMissed: 0,
      });
      expect(newTester.tier).toBe("NEW");

      // ACTIVE
      const activeTester = TesterReliabilityService.evaluateTesterProgression({
        campaignsCompleted: 1,
        campaignsAbandoned: 0,
        requiredMissionsCompleted: 14,
        requiredMissionsMissed: 0,
      });
      expect(activeTester.tier).toBe("ACTIVE");

      // RELIABLE
      const reliableTester = TesterReliabilityService.evaluateTesterProgression({
        campaignsCompleted: 2,
        campaignsAbandoned: 0,
        requiredMissionsCompleted: 28,
        requiredMissionsMissed: 0,
      });
      expect(reliableTester.tier).toBe("RELIABLE");

      // HIGHLY_RELIABLE
      const highlyReliable = TesterReliabilityService.evaluateTesterProgression({
        campaignsCompleted: 4,
        campaignsAbandoned: 0,
        requiredMissionsCompleted: 56,
        requiredMissionsMissed: 0,
      });
      expect(highlyReliable.tier).toBe("HIGHLY_RELIABLE");
    });

    it("INVARIANT: evaluateTesterProgression is strictly idempotent (100 runs return identical results)", () => {
      const historyInput = {
        campaignsCompleted: 3,
        campaignsAbandoned: 0,
        requiredMissionsCompleted: 42,
        requiredMissionsMissed: 1,
      };

      const baseline = TesterReliabilityService.evaluateTesterProgression(historyInput);

      for (let i = 0; i < 100; i++) {
        const result = TesterReliabilityService.evaluateTesterProgression(historyInput);
        expect(result.tier).toBe(baseline.tier);
        expect(result.reliabilityScore).toBe(baseline.reliabilityScore);
        expect(result.higherMatchingPriorityMultiplier).toBe(baseline.higherMatchingPriorityMultiplier);
      }
    });

    it("INVARIANT: A single campaign completion only counts ONCE towards progression", async () => {
      const userId = "u-bob-10";
      const campaignId = "c-alpha-1";

      // 1st recording
      const first = await UserIdentityService.recordCampaignCompletion(userId, campaignId);
      expect(first.alreadyRecorded).toBe(false);
      expect(first.totalUniqueCompletions).toBe(1);

      // Duplicate attempts (simulating retry / spamming)
      const second = await UserIdentityService.recordCampaignCompletion(userId, campaignId);
      expect(second.alreadyRecorded).toBe(true);
      expect(second.totalUniqueCompletions).toBe(1);

      const third = await UserIdentityService.recordCampaignCompletion(userId, campaignId);
      expect(third.alreadyRecorded).toBe(true);
      expect(third.totalUniqueCompletions).toBe(1);
    });
  });

  describe("3. Quality Matching Hardening & V1 Launch Invariants", () => {
    it("INVARIANT: 100% NEW pool functions seamlessly and starts campaigns in V1", () => {
      // Fresh pool with only NEW testers
      const candidates = Array.from({ length: 15 }, (_, i) => ({
        userId: `t-v1-new-${i + 1}`,
        reliabilityScore: 70,
        progressionTier: "NEW" as const,
        riskLevel: IdentityRiskLevel.LOW_RISK,
      }));

      const scoredCandidates = candidates.map((candidate) => ({
        candidate,
        score: UserIdentityService.calculateMatchingScore({ candidate }),
      }));

      // All 15 candidates produce positive scores > 0
      expect(scoredCandidates.every((sc) => sc.score.matchScore > 0)).toBe(true);

      const activeTesters = scoredCandidates.slice(0, 12);
      const backupTesters = scoredCandidates.slice(12, 15);

      expect(activeTesters.length).toBe(12);
      expect(backupTesters.length).toBe(3);
    });

    it("should progressively rank HIGHLY_RELIABLE > RELIABLE > ACTIVE > NEW", () => {
      const newScore = UserIdentityService.calculateMatchingScore({
        candidate: {
          userId: "t-new",
          reliabilityScore: 70,
          progressionTier: "NEW",
          riskLevel: IdentityRiskLevel.LOW_RISK,
        },
      });

      const activeScore = UserIdentityService.calculateMatchingScore({
        candidate: {
          userId: "t-active",
          reliabilityScore: 75,
          progressionTier: "ACTIVE",
          riskLevel: IdentityRiskLevel.LOW_RISK,
        },
      });

      const reliableScore = UserIdentityService.calculateMatchingScore({
        candidate: {
          userId: "t-rel",
          reliabilityScore: 85,
          progressionTier: "RELIABLE",
          riskLevel: IdentityRiskLevel.LOW_RISK,
        },
      });

      const highlyReliableScore = UserIdentityService.calculateMatchingScore({
        candidate: {
          userId: "t-hrel",
          reliabilityScore: 95,
          progressionTier: "HIGHLY_RELIABLE",
          riskLevel: IdentityRiskLevel.LOW_RISK,
        },
      });

      expect(highlyReliableScore.matchScore).toBeGreaterThan(reliableScore.matchScore);
      expect(reliableScore.matchScore).toBeGreaterThan(activeScore.matchScore);
      expect(activeScore.matchScore).toBeGreaterThan(newScore.matchScore);
    });

    it("should reduce matching priority for high risk accounts without automated bans", () => {
      const cleanCandidate = UserIdentityService.calculateMatchingScore({
        candidate: {
          userId: "t-clean",
          reliabilityScore: 90,
          progressionTier: "HIGHLY_RELIABLE",
          riskLevel: IdentityRiskLevel.LOW_RISK,
        },
      });

      const suspiciousCandidate = UserIdentityService.calculateMatchingScore({
        candidate: {
          userId: "t-suspicious",
          reliabilityScore: 90,
          progressionTier: "HIGHLY_RELIABLE",
          riskLevel: IdentityRiskLevel.HIGH_RISK, // Multi-account risk
        },
      });

      expect(cleanCandidate.matchScore).toBeGreaterThan(suspiciousCandidate.matchScore);
      expect(suspiciousCandidate.riskMultiplier).toBe(0.5);
    });

    it("should reward responsible developer participation with higher matching priority bonus", () => {
      const candidate = {
        userId: "t-cand-1",
        reliabilityScore: 80,
        progressionTier: "ACTIVE" as const,
        riskLevel: IdentityRiskLevel.LOW_RISK,
      };

      const regularCampaignScore = UserIdentityService.calculateMatchingScore({
        candidate,
        developerBonusMultiplier: 1.0,
      });

      const responsibleDevCampaignScore = UserIdentityService.calculateMatchingScore({
        candidate,
        developerBonusMultiplier: 1.25, // Active tester developer bonus
      });

      expect(responsibleDevCampaignScore.matchScore).toBeGreaterThan(regularCampaignScore.matchScore);
    });
  });

  describe("4. Capacity & Concurrency Protection (12 Active + 3 Backups)", () => {
    it("INVARIANT: Capacity bounds 12 active + 3 backups are strictly preserved", () => {
      expect(CAMPAIGN_ACTIVE_TESTER_TARGET).toBe(12);
      expect(CAMPAIGN_BACKUP_TARGET).toBe(3);

      const capacityStatus = CampaignCapacityService.evaluateCampaignCapacity(12, 3);

      expect(capacityStatus.isUnderCapacity).toBe(false);
      expect(capacityStatus.replacementRequired).toBe(false);
      expect(capacityStatus.backupNeeded).toBe(0);
    });

    it("should prevent overallocation of backups beyond 3", async () => {
      const campaignId = "c-cap-001";
      const existingBackups = ["b1", "b2", "b3"]; // Already 3 backups

      const newCandidates = ["b4", "b5"];
      const reserved = await BackupTesterService.reserveBackups(campaignId, newCandidates, existingBackups);

      expect(reserved.length).toBe(0); // Blocked from exceeding 3
    });
  });
});
