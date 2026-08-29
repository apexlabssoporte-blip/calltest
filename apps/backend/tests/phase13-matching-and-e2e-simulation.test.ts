import { describe, it, expect, vi, beforeEach } from "vitest";
import { TesterMatchingService, TesterCandidateProfile } from "../src/modules/matching/tester-matching.service.js";
import { CampaignCapacityService } from "../src/modules/campaigns/capacity.service.js";
import { BackupTesterService } from "../src/modules/campaign-testers/backup-tester.service.js";
import { ReplacementService } from "../src/modules/campaign-testers/replacement.service.js";
import { TesterReliabilityService } from "../src/modules/trust/tester-reliability.service.js";
import { NotificationService } from "../src/modules/notifications/service.js";
import { prisma } from "../src/core/database/prisma.js";
import { TesterStatus, TesterAssignmentType } from "@calltest/shared-types";

describe("Phase 13: Matching Engine & Full Lifecycle E2E Simulation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(NotificationService, "createNotification").mockResolvedValue({} as any);
    vi.spyOn(prisma.notification, "findUnique").mockResolvedValue(null);
    vi.spyOn(prisma.notification, "create").mockResolvedValue({} as any);
  });

  describe("1. Independent Component Matching Score", () => {
    it("should compute matching score emphasizing Reliability, Quality, Activity, and Experience over XP", () => {
      const candidate: TesterCandidateProfile = {
        id: "cand-1",
        displayName: "High Reliability Junior",
        reliabilityScore: 95,
        qualityScore: 90,
        activityScore: 90,
        completedCampaignsCount: 3,
        level: 1, // Junior XP level
      };

      const result = TesterMatchingService.calculateMatchingScore(candidate, {
        campaignId: "c-1",
        targetSlot: 5, // Core slot
      });

      // 40% of 95 (38) + 25% of 90 (22.5) + 20% of 90 (18) + 3*3 (9) = ~88
      expect(result.matchingScore).toBeGreaterThanOrEqual(85);
      expect(result.isEligibleForSlot).toBe(true);
    });

    it("should grant matching priority bonus for developers with high reliability track records", () => {
      const candidate: TesterCandidateProfile = {
        id: "cand-rel",
        displayName: "Reliable Candidate",
        reliabilityScore: 85,
        qualityScore: 80,
        activityScore: 85,
        completedCampaignsCount: 2,
        level: 2,
      };

      const standardScore = TesterMatchingService.calculateMatchingScore(candidate, {
        campaignId: "c-1",
        targetSlot: 1,
        developerReliabilityScore: 50,
      });

      const prioritizedScore = TesterMatchingService.calculateMatchingScore(candidate, {
        campaignId: "c-2",
        targetSlot: 1,
        developerReliabilityScore: 90, // High developer reliability!
      });

      expect(prioritizedScore.matchingScore).toBeGreaterThan(standardScore.matchingScore);
      expect(prioritizedScore.scoreBreakdown.developerBonus).toBe(10);
    });
  });

  describe("2. Full E2E User & Campaign Lifecycle Simulation", () => {
    it("should simulate entire lifecycle: 12 core -> #13 -> #14 -> abandon/backup -> #15 -> complete -> new app priority", async () => {
      const campaignId = "c-sim-001";
      const devId = "dev-juan-001";

      // Step 1: Juan publishes app, matching fills 12 Core Testers + 3 Backups
      const coreCapacity = CampaignCapacityService.calculateDeveloperCapacity(10);
      expect(coreCapacity.maxCoreTesters).toBe(12);

      vi.spyOn(prisma.campaignTester, "findMany").mockResolvedValue([]);
      vi.spyOn(prisma.campaignTester, "create").mockResolvedValue({ id: "ct-created" } as any);
      vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

      const backups = await BackupTesterService.reserveBackups(campaignId, ["bk-1", "bk-2", "bk-3"]);
      expect(backups.length).toBe(3);

      // Step 2: Day 3 reaches -> Slot #13 unlocked and assigned
      const day3Eval = CampaignCapacityService.evaluateReinforcementSlot(3, 12);
      expect(day3Eval.canUnlock).toBe(true);
      expect(day3Eval.targetSlot).toBe(13);

      const candidate13: TesterCandidateProfile = {
        id: "t-13",
        displayName: "Tester 13",
        reliabilityScore: 80, // >= 75
        qualityScore: 80,
        activityScore: 80,
        completedCampaignsCount: 2,
        level: 2,
      };
      const match13 = TesterMatchingService.selectBestCandidate([candidate13], { campaignId, targetSlot: 13 });
      expect(match13?.candidate.id).toBe("t-13");

      // Step 3: Day 6 reaches -> Slot #14 unlocked and assigned
      const day6Eval = CampaignCapacityService.evaluateReinforcementSlot(6, 13);
      expect(day6Eval.canUnlock).toBe(true);
      expect(day6Eval.targetSlot).toBe(14);

      // Step 4: Day 7 -> Core tester abandons -> Backup replaces automatically
      vi.spyOn(prisma.campaignTester, "findUnique").mockImplementation(async (args: any) => {
        if (args.where.id === "ct-abandoned") {
          return {
            id: "ct-abandoned",
            campaignId,
            testerId: "t-abandoned-user",
            status: TesterStatus.ACTIVE,
            campaign: { id: campaignId, name: "Juan's App", app: { developerId: devId, name: "Juan App" } },
            tester: { displayName: "Abandoned Tester" },
          } as any;
        }
        if (args.where.id === "ct-backup-first") {
          return {
            id: "ct-backup-first",
            campaignId,
            testerId: "bk-1",
            assignmentType: TesterAssignmentType.BACKUP,
            status: TesterStatus.INVITED,
          } as any;
        }
        return null;
      });

      vi.spyOn(prisma.campaignTester, "findFirst").mockResolvedValue({
        id: "ct-backup-first",
        campaignId,
        testerId: "bk-1",
        assignmentType: TesterAssignmentType.BACKUP,
        status: TesterStatus.INVITED,
        tester: { displayName: "Backup Tester One" },
      } as any);

      vi.spyOn(prisma.campaignTester, "update").mockResolvedValue({} as any);
      vi.spyOn(prisma.notification, "create").mockResolvedValue({} as any);

      const replacement = await ReplacementService.replaceAbandonedTester("ct-abandoned");
      expect(replacement.source).toBe("BACKUP");
      expect(replacement.replacementTesterId).toBe("bk-1");

      // Step 5: Day 9 reaches -> Slot #15 unlocked and assigned
      const day9Eval = CampaignCapacityService.evaluateReinforcementSlot(9, 14);
      expect(day9Eval.canUnlock).toBe(true);
      expect(day9Eval.targetSlot).toBe(15);

      // Step 6: Day 14 -> Campaign completes successfully
      const completionMessage = TesterMatchingService.getCampaignCompletionIncentiveMessage();
      expect(completionMessage).toContain("¡Tu campaña terminó correctamente!");

      // Step 7: Juan continues participating -> Reliability increases to 95 -> Publishes 2nd app with high matching priority!
      const juanReliability = TesterReliabilityService.calculateReliability({
        completedMissionsCount: 20,
        missedMissionsCount: 0,
        lateMissionsCount: 0,
        completedCampaignsCount: 2,
        abandonedCampaignsCount: 0,
        replacedAsInactiveCount: 0,
        initialBaseScore: 85,
      });

      expect(juanReliability.score).toBeGreaterThanOrEqual(90);

      const secondAppCandidate: TesterCandidateProfile = {
        id: "cand-top",
        displayName: "Top Tester",
        reliabilityScore: 92,
        qualityScore: 90,
        activityScore: 90,
        completedCampaignsCount: 4,
        level: 3,
      };

      const secondAppMatch = TesterMatchingService.calculateMatchingScore(secondAppCandidate, {
        campaignId: "c-sim-002",
        targetSlot: 1,
        developerReliabilityScore: juanReliability.score,
      });

      expect(secondAppMatch.scoreBreakdown.developerBonus).toBe(10);
      expect(secondAppMatch.matchingScore).toBeGreaterThanOrEqual(90);
    });
  });
});
