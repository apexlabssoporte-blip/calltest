import { describe, it, expect } from "vitest";
import { CampaignCapacityService } from "../src/modules/campaigns/capacity.service.js";
import { TesterMatchingService } from "../src/modules/matching/tester-matching.service.js";
import { RELIABLE_THRESHOLD } from "../src/modules/trust/tester-reliability.service.js";

describe("Phase 13: Progressive Capacity & Reinforcement Expansion (12 -> 13 -> 14 -> 15)", () => {
  describe("1. Progressive Capacity by Completed Apps", () => {
    it("should allow max 3 testers for 1-3 completed apps", () => {
      const cap1 = CampaignCapacityService.calculateDeveloperCapacity(1);
      const cap3 = CampaignCapacityService.calculateDeveloperCapacity(3);

      expect(cap1.maxCoreTesters).toBe(3);
      expect(cap3.maxCoreTesters).toBe(3);
    });

    it("should allow max 6 testers for 4-6 completed apps", () => {
      const cap4 = CampaignCapacityService.calculateDeveloperCapacity(4);
      const cap6 = CampaignCapacityService.calculateDeveloperCapacity(6);

      expect(cap4.maxCoreTesters).toBe(6);
      expect(cap6.maxCoreTesters).toBe(6);
    });

    it("should allow max 9 testers for 7-9 completed apps", () => {
      const cap7 = CampaignCapacityService.calculateDeveloperCapacity(7);
      const cap9 = CampaignCapacityService.calculateDeveloperCapacity(9);

      expect(cap7.maxCoreTesters).toBe(9);
      expect(cap9.maxCoreTesters).toBe(9);
    });

    it("should allow max 12 testers for 10-12 completed apps", () => {
      const cap10 = CampaignCapacityService.calculateDeveloperCapacity(10);
      const cap12 = CampaignCapacityService.calculateDeveloperCapacity(12);

      expect(cap10.maxCoreTesters).toBe(12);
      expect(cap12.maxCoreTesters).toBe(12);
    });
  });

  describe("2. Reinforcement Slots Expansion (Day 3 -> 13, Day 6 -> 14, Day 9 -> 15)", () => {
    it("should NOT unlock reinforcements before Day 3", () => {
      const evalDay1 = CampaignCapacityService.evaluateReinforcementSlot(1, 12);
      const evalDay2 = CampaignCapacityService.evaluateReinforcementSlot(2, 12);

      expect(evalDay1.canUnlock).toBe(false);
      expect(evalDay2.canUnlock).toBe(false);
    });

    it("should unlock slot #13 on Day 3", () => {
      const evalDay3 = CampaignCapacityService.evaluateReinforcementSlot(3, 12);

      expect(evalDay3.canUnlock).toBe(true);
      expect(evalDay3.targetSlot).toBe(13);
      expect(evalDay3.requiredReliability).toBe(RELIABLE_THRESHOLD);
    });

    it("should unlock slot #14 on Day 6", () => {
      const evalDay6 = CampaignCapacityService.evaluateReinforcementSlot(6, 13);

      expect(evalDay6.canUnlock).toBe(true);
      expect(evalDay6.targetSlot).toBe(14);
      expect(evalDay6.requiredReliability).toBe(RELIABLE_THRESHOLD);
    });

    it("should unlock slot #15 on Day 9", () => {
      const evalDay9 = CampaignCapacityService.evaluateReinforcementSlot(9, 14);

      expect(evalDay9.canUnlock).toBe(true);
      expect(evalDay9.targetSlot).toBe(15);
      expect(evalDay9.requiredReliability).toBe(RELIABLE_THRESHOLD);
    });

    it("should REJECT candidate with Reliability < 75 for slot 13-15 and leave slot pending", () => {
      const unverifiedCandidate = {
        id: "cand-low",
        displayName: "Low Reliability User",
        reliabilityScore: 65, // < 75
        qualityScore: 90,
        activityScore: 90,
        completedCampaignsCount: 1,
        level: 5,
      };

      const result = TesterMatchingService.selectBestCandidate([unverifiedCandidate], {
        campaignId: "c-1",
        targetSlot: 13,
      });

      expect(result).toBeNull(); // Slot remains pending
    });

    it("should ACCEPT candidate with Reliability >= 75 for slot 13-15 even if Level is low", () => {
      const reliableCandidate = {
        id: "cand-reliable",
        displayName: "Reliable New User",
        reliabilityScore: 88, // >= 75
        qualityScore: 85,
        activityScore: 90,
        completedCampaignsCount: 2,
        level: 1, // Low level, high reliability
      };

      const result = TesterMatchingService.selectBestCandidate([reliableCandidate], {
        campaignId: "c-1",
        targetSlot: 13,
      });

      expect(result).not.toBeNull();
      expect(result?.candidate.id).toBe("cand-reliable");
      expect(result?.isEligibleForSlot).toBe(true);
    });
  });
});
