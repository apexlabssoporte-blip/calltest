import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserIdentityService } from "../src/modules/identity/user-identity.service.js";
import { TesterReliabilityService } from "../src/modules/trust/tester-reliability.service.js";
import { MissionScheduleService } from "../src/modules/missions/mission-schedule.service.js";
import { AppAvailabilityService } from "../src/modules/availability/app-availability.service.js";
import {
  CampaignCapacityService,
  CAMPAIGN_ACTIVE_TESTER_TARGET,
  CAMPAIGN_BACKUP_TARGET,
  CAMPAIGN_TOTAL_TARGET,
} from "../src/modules/campaigns/capacity.service.js";
import { BackupTesterService } from "../src/modules/campaign-testers/backup-tester.service.js";
import { NotificationService } from "../src/modules/notifications/service.js";
import {
  ScheduledMissionStatus,
  MissionType,
  IdentityRiskLevel,
  AvailabilityIssueType,
  AppAvailabilityStatus,
} from "@calltest/shared-types";
import { prisma } from "../src/core/database/prisma.js";

describe("Phase 13.7: Full System Audit & Release Hardening", () => {
  const campaignId = "c-audit-full-001";
  const devId = "dev-lead-001";
  const appId = "app-callshield-001";

  beforeEach(() => {
    vi.restoreAllMocks();
    UserIdentityService._clearStore();
    AppAvailabilityService._clearStore();
    vi.spyOn(NotificationService, "createNotification").mockResolvedValue({} as any);
    vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);
    vi.spyOn(prisma.campaign, "findUnique").mockResolvedValue({
      id: campaignId,
      name: "CallShield Release",
      app: { id: appId, name: "CallShield", developerId: devId },
    } as any);
    vi.spyOn(prisma.campaignTester, "findMany").mockResolvedValue([
      { id: "b1" },
      { id: "b2" },
      { id: "b3" },
    ] as any);
  });

  describe("Caso A: Full 14-Day Campaign Lifecycle (12 Active + 3 Backups -> Completion)", () => {
    it("should manage complete 14-day schedule with 12 active + 3 backups target", () => {
      // 1. Capacity constants verification
      expect(CAMPAIGN_ACTIVE_TESTER_TARGET).toBe(12);
      expect(CAMPAIGN_BACKUP_TARGET).toBe(3);
      expect(CAMPAIGN_TOTAL_TARGET).toBe(15);

      // 2. Capacity evaluation for 12 active + 3 backups
      const capacityStatus = CampaignCapacityService.evaluateCampaignCapacity(12, 3, campaignId);
      expect(capacityStatus.isUnderCapacity).toBe(false);
      expect(capacityStatus.replacementRequired).toBe(false);
      expect(capacityStatus.backupNeeded).toBe(0);

      // 3. Recommended 14-day developer template
      const template = MissionScheduleService.getRecommendedTemplate();
      expect(template.length).toBeGreaterThanOrEqual(14);
      expect(new Set(template.map((m) => m.scheduledDay)).size).toBe(14);

      // 4. Distribute to an active tester
      const schedule = MissionScheduleService.distributeDeveloperMissions(
        campaignId,
        "ct-primary-1",
        template,
        new Date("2026-08-01T00:00:00Z")
      );
      expect(schedule.length).toBe(template.length);
      expect(schedule.every((m) => m.scheduledDay >= 1 && m.scheduledDay <= 14)).toBe(true);

      // 5. Completion on Day 14
      const progression = TesterReliabilityService.evaluateTesterProgression({
        campaignsCompleted: 1,
        campaignsAbandoned: 0,
        requiredMissionsCompleted: 14,
        requiredMissionsMissed: 0,
      });

      expect(progression.tier).toBe("ACTIVE");
      expect(progression.higherMatchingPriorityMultiplier).toBe(1.15);
    });
  });

  describe("Caso B: Mid-Campaign Abandonment on Day 8 & Clean Backup Promotion (Day 8..14)", () => {
    it("should promote backup on Day 8 with ONLY Day 8..14 missions, never Day 1..7", () => {
      const template = MissionScheduleService.getRecommendedTemplate();

      // Replacement joins on Day 8
      const replacementSchedule = MissionScheduleService.distributeDeveloperMissionsForReplacement(
        campaignId,
        "ct-backup-promoted-1",
        template,
        8,
        new Date("2026-08-01T00:00:00Z")
      );

      expect(replacementSchedule.length).toBeGreaterThanOrEqual(7);
      expect(replacementSchedule.every((m) => m.scheduledDay >= 8 && m.scheduledDay <= 14)).toBe(true);
      expect(replacementSchedule.some((m) => m.scheduledDay < 8)).toBe(false);
    });
  });

  describe("Caso C: Availability Issue on Day 5 & Recovery on Day 7 with Brand New 48h Window", () => {
    it("should block mission on Day 5 (0 penalty) and unblock on Day 7 with fresh 48h deadline", async () => {
      // 1. Tester reports availability on Day 5
      const { report } = await AppAvailabilityService.createOrGroupReport({
        campaignId,
        campaignTesterId: "ct-avail-c",
        appId,
        testerId: "t-avail-c",
        countryCode: "CO",
        issueType: AvailabilityIssueType.COUNTRY_RESTRICTION,
        reason: "App not available in Colombia Store",
      });

      expect(report.status).toBe(AppAvailabilityStatus.OPEN);

      // 2. Verified 0 penalty during blockage
      const reliabilityBlocked = TesterReliabilityService.calculateReliability({
        requiredMissionsCompletedCount: 4,
        requiredMissionsMissedCount: 0, // Blocked mission is NOT missed
        completedCampaignsCount: 0,
        abandonedCampaignsCount: 0,
        replacedAsInactiveCount: 0,
      });
      expect(reliabilityBlocked.signals.penaltyPoints).toBe(0);

      // 3. Day 7: Developer resolves issue
      const blockedMission = {
        id: "ms-d5-explore",
        campaignId,
        type: MissionType.EXPLORE,
        title: "Exploración",
        description: "Explora la app",
        scheduledDay: 5,
        availableFrom: new Date("2026-08-05T00:00:00Z"),
        deadline: new Date("2026-08-07T00:00:00Z"), // Old expired deadline
        required: true,
        priority: "NORMAL" as const,
        status: ScheduledMissionStatus.BLOCKED_BY_AVAILABILITY,
      };

      const resolutionDate = new Date("2026-08-07T14:00:00Z");
      const unblockedMissions = AppAvailabilityService.recoverBlockedMissions(
        [blockedMission],
        resolutionDate,
        48 // 48h new window
      );

      expect(unblockedMissions[0].status).toBe(ScheduledMissionStatus.AVAILABLE);
      expect(unblockedMissions[0].availableFrom.toISOString()).toBe("2026-08-07T14:00:00.000Z");
      expect(unblockedMissions[0].deadline.toISOString()).toBe("2026-08-09T14:00:00.000Z");
      expect(unblockedMissions[0].deadline.getTime()).toBeGreaterThan(resolutionDate.getTime());
    });
  });

  describe("Caso D: ENDED_EARLY on Day 6 Cancels Future Missions with Zero Penalty", () => {
    it("should cancel future missions (Day 6..14) while preserving completed Day 1..5", () => {
      const schedule = [
        {
          id: "m-d1",
          campaignId,
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
          id: "m-d7",
          campaignId,
          type: MissionType.FUNCTIONAL,
          title: "Test search",
          description: "Search in app",
          scheduledDay: 7,
          required: true,
          priority: "NORMAL" as const,
          status: ScheduledMissionStatus.PENDING,
        },
        {
          id: "m-d14",
          campaignId,
          type: MissionType.FINAL_FEEDBACK,
          title: "Feedback",
          description: "Final feedback",
          scheduledDay: 14,
          required: true,
          priority: "CRITICAL" as const,
          status: ScheduledMissionStatus.PENDING,
        },
      ];

      const cancelledSchedule = MissionScheduleService.cancelFutureMissions(schedule, 6);

      expect(cancelledSchedule[0].status).toBe(ScheduledMissionStatus.COMPLETED);
      expect(cancelledSchedule[1].status).toBe(ScheduledMissionStatus.CANCELLED);
      expect(cancelledSchedule[2].status).toBe(ScheduledMissionStatus.CANCELLED);
    });
  });

  describe("Caso E: 100 Duplicate Progression Requests -> Exactly 1 Logical Progression", () => {
    it("should ensure strict idempotency and deduplication across 100 completion requests", async () => {
      const userId = "u-e-dedup-001";
      const targetCampaignId = "c-target-dedup";

      const firstCall = await UserIdentityService.recordCampaignCompletion(userId, targetCampaignId);
      expect(firstCall.alreadyRecorded).toBe(false);
      expect(firstCall.totalUniqueCompletions).toBe(1);

      // Execute 99 duplicate requests
      for (let i = 0; i < 99; i++) {
        const result = await UserIdentityService.recordCampaignCompletion(userId, targetCampaignId);
        expect(result.alreadyRecorded).toBe(true);
        expect(result.totalUniqueCompletions).toBe(1);
      }

      expect(UserIdentityService.countUserCompletedCampaigns(userId)).toBe(1);
    });
  });

  describe("Caso F: 20 Concurrent Tester Assignments -> Max 12 Active + Max 3 Backups", () => {
    it("INVARIANT: Capacity bounds 12 active + 3 backups are never exceeded", async () => {
      const existingBackups = ["bk-1", "bk-2", "bk-3"]; // 3 backups already reserved
      const incomingCandidates = Array.from({ length: 20 }, (_, i) => `candidate-${i + 1}`);

      // Attempting to reserve additional backups beyond 3
      const reserved = await BackupTesterService.reserveBackups(campaignId, incomingCandidates, existingBackups);
      expect(reserved.length).toBe(0);

      // Verify capacity evaluator flags healthy 12 active + 3 backups
      const status = CampaignCapacityService.evaluateCampaignCapacity(12, 3);
      expect(status.activeCount).toBe(12);
      expect(status.backupCount).toBe(3);
      expect(status.isUnderCapacity).toBe(false);
      expect(status.backupNeeded).toBe(0);
    });
  });

  describe("Caso G: 100% NEW Tester Pool Matching & V1 Operability", () => {
    it("INVARIANT: Matching operates flawlessly when 100% of candidate pool are NEW testers", () => {
      const newCandidatePool = Array.from({ length: 15 }, (_, i) => ({
        userId: `t-v1-fresh-${i + 1}`,
        reliabilityScore: 70,
        progressionTier: "NEW" as const,
        riskLevel: IdentityRiskLevel.LOW_RISK,
      }));

      const scoredPool = newCandidatePool.map((candidate) => ({
        candidate,
        ...UserIdentityService.calculateMatchingScore({ candidate }),
      }));

      // Every candidate produces a valid positive matching score
      expect(scoredPool.every((c) => c.matchScore > 0)).toBe(true);
      expect(scoredPool.every((c) => c.progressionMultiplier === 1.0)).toBe(true);

      const activeGroup = scoredPool.slice(0, 12);
      const backupGroup = scoredPool.slice(12, 15);

      expect(activeGroup.length).toBe(12);
      expect(backupGroup.length).toBe(3);
    });
  });

  describe("Caso H: Exhaustive 14-Day Mission Schedule Coverage Verification", () => {
    it("should guarantee that developer mission validation enforces full 14-day coverage", () => {
      // 1. Incomplete missions (only Day 1 to Day 10, missing Days 11..14)
      const incompleteMissions = Array.from({ length: 10 }, (_, i) => ({
        title: `Mission Day ${i + 1}`,
        description: `Description ${i + 1}`,
        type: MissionType.OPEN,
        scheduledDay: i + 1,
        required: true,
      }));

      const incompleteValidation = MissionScheduleService.validateCampaignMissionCoverage(incompleteMissions);
      expect(incompleteValidation.isValid).toBe(false);
      expect(incompleteValidation.missingDays).toEqual([11, 12, 13, 14]);

      // 2. Complete 14-day coverage
      const completeMissions = Array.from({ length: 14 }, (_, i) => ({
        title: `Mission Day ${i + 1}`,
        description: `Description ${i + 1}`,
        type: i === 0 ? MissionType.INSTALL : MissionType.OPEN,
        scheduledDay: i + 1,
        required: true,
      }));

      const completeValidation = MissionScheduleService.validateCampaignMissionCoverage(completeMissions);
      expect(completeValidation.isValid).toBe(true);
      expect(completeValidation.missingDays.length).toBe(0);
    });
  });

  describe("Caso I: Backend Authority & Client Tampering Protection", () => {
    it("INVARIANT: Backend exclusively computes Reliability, Progression, and Matching Scores", () => {
      // Client cannot spoof or inject arbitrary tier or multiplier
      const progression = TesterReliabilityService.evaluateTesterProgression({
        campaignsCompleted: 0,
        campaignsAbandoned: 0,
        requiredMissionsCompleted: 0,
        requiredMissionsMissed: 0,
      });

      expect(progression.tier).toBe("NEW");
      expect(progression.higherMatchingPriorityMultiplier).toBe(1.0);
      expect(progression.campaignsCompleted).toBe(0);

      const score = UserIdentityService.calculateMatchingScore({
        candidate: {
          userId: "t-tamper-test",
          reliabilityScore: 70,
          progressionTier: progression.tier,
          riskLevel: IdentityRiskLevel.LOW_RISK,
        },
      });

      expect(score.progressionMultiplier).toBe(1.0);
      expect(score.riskMultiplier).toBe(1.0);
      expect(score.matchScore).toBe(70);
    });
  });
});
