import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  CampaignCapacityService,
  CAMPAIGN_ACTIVE_TESTER_TARGET,
  CAMPAIGN_BACKUP_TARGET,
  CAMPAIGN_TOTAL_TARGET,
} from "../src/modules/campaigns/capacity.service.js";
import { BackupTesterService } from "../src/modules/campaign-testers/backup-tester.service.js";
import { ReplacementService } from "../src/modules/campaign-testers/replacement.service.js";
import { TesterActivityService } from "../src/modules/activity/tester-activity.service.js";
import { MissionScheduleService } from "../src/modules/missions/mission-schedule.service.js";
import { TesterReliabilityService } from "../src/modules/trust/tester-reliability.service.js";
import { NotificationService } from "../src/modules/notifications/service.js";
import { prisma } from "../src/core/database/prisma.js";
import { TesterStatus, TesterAssignmentType } from "@calltest/shared-types";

describe("Phase 13.3: Capacity, 3 Backups & Automatic Replacement Invariants", () => {
  const campaignId = "c-cap-test-001";
  const devId = "d-cap-dev-001";

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(NotificationService, "createNotification").mockResolvedValue({} as any);
  });

  describe("1. Capacity Constants & Target Invariants", () => {
    it("should enforce centralized targets: 12 active, 3 backups, 15 total", () => {
      expect(CAMPAIGN_ACTIVE_TESTER_TARGET).toBe(12);
      expect(CAMPAIGN_BACKUP_TARGET).toBe(3);
      expect(CAMPAIGN_TOTAL_TARGET).toBe(15);
    });

    it("should evaluate healthy capacity with 12 active and 3 backups", () => {
      const evaluation = CampaignCapacityService.evaluateCampaignCapacity(12, 3, campaignId);
      expect(evaluation.isUnderCapacity).toBe(false);
      expect(evaluation.replacementRequired).toBe(false);
      expect(evaluation.backupNeeded).toBe(0);
      expect(evaluation.statusSummary).toContain("Campaña saludable");
    });

    it("should flag UNDER_CAPACITY and replacementRequired when active testers drop below 12", () => {
      const evaluation = CampaignCapacityService.evaluateCampaignCapacity(11, 3, campaignId);
      expect(evaluation.isUnderCapacity).toBe(true);
      expect(evaluation.replacementRequired).toBe(true);
      expect(evaluation.backupNeeded).toBe(0);
      expect(evaluation.statusSummary).toContain("11/12 testers activos");
    });

    it("should flag backupNeeded when backup count is below 3", () => {
      const evaluation = CampaignCapacityService.evaluateCampaignCapacity(12, 2, campaignId);
      expect(evaluation.isUnderCapacity).toBe(false);
      expect(evaluation.replacementRequired).toBe(false);
      expect(evaluation.backupNeeded).toBe(1);
      expect(evaluation.statusSummary).toContain("2/3 testers de respaldo");
    });
  });

  describe("2. Backup Reservation & Concurrency Capping", () => {
    it("should reserve up to exactly 3 backups and reject overallocation (> 3 backups)", async () => {
      vi.spyOn(prisma.campaignTester, "findMany").mockResolvedValue([]);
      const createSpy = vi.spyOn(prisma.campaignTester, "create").mockImplementation(async (args: any) => ({
        id: `bk-${args.data.testerId}`,
        ...args.data,
      }));
      vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

      // Attempting to reserve 5 candidates when max is 3
      const candidates = ["t1", "t2", "t3", "t4", "t5"];
      const assigned = await BackupTesterService.reserveBackups(campaignId, candidates);

      expect(assigned.length).toBe(3); // Capped at exactly 3
      expect(createSpy).toHaveBeenCalledTimes(3);
    });

    it("should return empty array if 3 backups are already reserved (anti-race condition)", async () => {
      vi.spyOn(prisma.campaignTester, "findMany").mockResolvedValue([
        { id: "bk-1" },
        { id: "bk-2" },
        { id: "bk-3" },
      ] as any);

      const assigned = await BackupTesterService.reserveBackups(campaignId, ["t-extra-1"]);
      expect(assigned.length).toBe(0);
    });
  });

  describe("3. AT_RISK, Persistence & Recovery Lifecycle", () => {
    it("should NOT immediately replace on single missed mission; must transition to AT_RISK first", () => {
      // 50h inactivity with pending missions
      const result = TesterActivityService.evaluateActivity({
        lastActivityAt: new Date(Date.now() - 50 * 60 * 60 * 1000),
        pendingMissionsCount: 1,
        hasOverdueMission: false,
      });

      expect(result.state).toBe("AT_RISK");
      expect(result.canRecover).toBe(true);
    });

    it("should recover from AT_RISK back to ACTIVE when tester completes activity", () => {
      const recoveredState = TesterActivityService.recoverFromRisk("AT_RISK");
      expect(recoveredState).toBe("ACTIVE");
    });

    it("should transition from AT_RISK to INACTIVE when inactivity exceeds abandonment threshold (96h)", () => {
      const result = TesterActivityService.evaluateActivity({
        lastActivityAt: new Date(Date.now() - 100 * 60 * 60 * 1000), // 100h
        pendingMissionsCount: 2,
        hasOverdueMission: true,
      });

      expect(result.state).toBe("INACTIVE");
      expect(result.canRecover).toBe(false);
    });
  });

  describe("4. Replacement & Backup Depletion Workflow", () => {
    it("should replace abandoned tester by promoting backup, decrementing backup count", async () => {
      const abandonedAssignmentId = "ct-abandoned-alpha";
      const backupAssignmentId = "ct-backup-alpha";

      vi.spyOn(prisma.campaignTester, "findUnique").mockImplementation(async (args: any) => {
        if (args.where.id === abandonedAssignmentId) {
          return {
            id: abandonedAssignmentId,
            campaignId,
            testerId: "t-abandoned-alpha",
            status: TesterStatus.ACTIVE,
            campaign: {
              id: campaignId,
              name: "Test App",
              app: { developerId: devId, name: "Test App" },
            },
            tester: { displayName: "Tester Abandoned" },
          } as any;
        }
        if (args.where.id === backupAssignmentId) {
          return {
            id: backupAssignmentId,
            campaignId,
            testerId: "t-backup-alpha",
            assignmentType: TesterAssignmentType.BACKUP,
            status: TesterStatus.INVITED,
          } as any;
        }
        return null;
      });

      vi.spyOn(prisma.campaignTester, "findFirst").mockResolvedValue({
        id: backupAssignmentId,
        campaignId,
        testerId: "t-backup-alpha",
        assignmentType: TesterAssignmentType.BACKUP,
        status: TesterStatus.INVITED,
        tester: { displayName: "Backup Tester Alpha" },
      } as any);

      const updateSpy = vi.spyOn(prisma.campaignTester, "update").mockImplementation(async (args: any) => ({
        id: args.where.id,
        ...args.data,
      }));
      vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

      const result = await ReplacementService.replaceAbandonedTester(abandonedAssignmentId);

      expect(result.source).toBe("BACKUP");
      expect(result.replacementTesterId).toBe("t-backup-alpha");
      expect(updateSpy).toHaveBeenCalledWith({
        where: { id: backupAssignmentId },
        data: expect.objectContaining({
          assignmentType: TesterAssignmentType.REPLACEMENT,
          status: TesterStatus.ACTIVE,
          isReplacement: true,
        }),
      });
    });
  });

  describe("5. Notifications & Privacy (Zero PII leak)", () => {
    it("should notify tester upon entering AT_RISK without exposing internal score algorithms", async () => {
      const notifSpy = vi.spyOn(NotificationService, "createNotification");

      await ReplacementService.notifyTesterAtRisk("u-tester-1", campaignId, "CallShield");

      expect(notifSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "u-tester-1",
          body: expect.stringContaining("Tienes misiones pendientes para \"CallShield\" que requieren tu atención"),
        })
      );
    });

    it("should notify tester upon recovering to ACTIVE", async () => {
      const notifSpy = vi.spyOn(NotificationService, "createNotification");

      await ReplacementService.notifyTesterRecovered("u-tester-1", campaignId, "CallShield");

      expect(notifSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "u-tester-1",
          body: expect.stringContaining("Tu participación en \"CallShield\" está al día"),
        })
      );
    });

    it("should dispatch campaign completion encouragement notification on Day 14", async () => {
      const notifSpy = vi.spyOn(NotificationService, "createNotification");

      await ReplacementService.notifyCampaignCompletedReward("u-tester-1", "CallShield");

      expect(notifSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "u-tester-1",
          title: expect.stringContaining("Campaña completada con éxito"),
        })
      );
    });
  });

  describe("6. Full End-to-End Simulation (12 Actives + 3 Backups + Lifecycle)", () => {
    it("should simulate entire campaign lifecycle with AT_RISK, recovery, abandonment, replacement, and completion", async () => {
      // Step 1: Initialize 12 active testers + 3 backups
      let activeCount = 12;
      let backupCount = 3;

      let capStatus = CampaignCapacityService.evaluateCampaignCapacity(activeCount, backupCount, campaignId);
      expect(capStatus.isUnderCapacity).toBe(false);
      expect(capStatus.backupNeeded).toBe(0);

      // Step 2: Day 3 -> Tester A enters AT_RISK
      const activityTesterA = TesterActivityService.evaluateActivity({
        lastActivityAt: new Date(Date.now() - 50 * 60 * 60 * 1000),
        pendingMissionsCount: 1,
        hasOverdueMission: false,
      });
      expect(activityTesterA.state).toBe("AT_RISK");

      // Step 3: Day 4 -> Tester A completes mission & recovers to ACTIVE
      const recoveredTesterA = TesterActivityService.recoverFromRisk(activityTesterA.state);
      expect(recoveredTesterA).toBe("ACTIVE");

      // Step 4: Day 7 -> Tester B enters AT_RISK, Day 8 -> becomes INACTIVE
      const activityTesterB = TesterActivityService.evaluateActivity({
        lastActivityAt: new Date(Date.now() - 100 * 60 * 60 * 1000),
        pendingMissionsCount: 3,
        hasOverdueMission: true,
      });
      expect(activityTesterB.state).toBe("INACTIVE");

      // Step 5: Day 8 -> Tester B is REPLACED, Backup 1 is promoted to ACTIVE
      activeCount = 12; // maintained at 12
      backupCount = 2;  // decremented to 2

      capStatus = CampaignCapacityService.evaluateCampaignCapacity(activeCount, backupCount, campaignId);
      expect(capStatus.activeCount).toBe(12);
      expect(capStatus.backupCount).toBe(2);
      expect(capStatus.backupNeeded).toBe(1);

      // Replacement tester receives Day 8..14 developer missions only
      const replacementSchedule = MissionScheduleService.distributeDeveloperMissionsForReplacement(
        campaignId,
        "ct-backup-1",
        MissionScheduleService.getRecommendedTemplate(campaignId),
        8,
        new Date("2026-08-01T00:00:00Z")
      );
      expect(replacementSchedule.every((m) => m.scheduledDay >= 8 && m.scheduledDay <= 14)).toBe(true);

      // Step 6: Day 9 -> New backup candidate found from matching pool
      backupCount = 3;
      capStatus = CampaignCapacityService.evaluateCampaignCapacity(activeCount, backupCount, campaignId);
      expect(capStatus.backupCount).toBe(3);
      expect(capStatus.backupNeeded).toBe(0);

      // Step 7: Day 14 -> Campaign completed successfully
      const reliabilityResult = TesterReliabilityService.calculateReliability({
        requiredMissionsCompletedCount: 14,
        requiredMissionsMissedCount: 0,
        completedCampaignsCount: 1,
        abandonedCampaignsCount: 0,
        replacedAsInactiveCount: 0,
        initialBaseScore: 75,
      });

      expect(reliabilityResult.score).toBeGreaterThan(80);
      expect(reliabilityResult.tier).toBe("HIGHLY_RELIABLE");
    });
  });
});
