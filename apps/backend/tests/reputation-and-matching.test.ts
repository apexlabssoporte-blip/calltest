import { describe, it, expect, vi, beforeEach } from "vitest";
import { TrustProfileService } from "../src/modules/trust/trust-profile-service.js";
import { CampaignCompatibilityService } from "../src/modules/matching/compatibility-service.js";
import { DefaultMatchingStrategy } from "../src/modules/matching/matching-strategy.js";
import { prisma } from "../src/core/database/prisma.js";
import {
  ReputationStatus,
  TesterExposureLevel,
  TrustRank,
  UserRole,
  UserStatus,
} from "@calltest/shared-types";

describe("Reputation & Matching Integration", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const baseCampaign = {
    id: "campaign-1",
    appId: "app-1",
    app: {
      id: "app-1",
      developerId: "dev-other",
    },
  };

  describe("Reputation Restrictions in Matching Eligibility", () => {
    it("should reject SUSPENDED and BANNED testers from campaign participation", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: "tester-suspended",
        role: UserRole.TESTER,
        status: UserStatus.SUSPENDED,
      } as any);

      vi.spyOn(prisma.campaign, "findUnique").mockResolvedValue(baseCampaign as any);
      vi.spyOn(TrustProfileService, "getOrCreateProfile").mockResolvedValue({
        id: "prof-1",
        userId: "tester-suspended",
        reputationStatus: ReputationStatus.SUSPENDED,
      } as any);

      const result = await CampaignCompatibilityService.evaluateCompatibility(
        "campaign-1",
        "tester-suspended",
      );

      expect(result.isCompatible).toBe(false);
    });

    it("should cap max capacity to 1 for RESTRICTED testers even if exposure level is ESTABLISHED", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: "tester-restricted",
        role: UserRole.TESTER,
        status: UserStatus.ACTIVE,
      } as any);

      vi.spyOn(prisma.campaign, "findUnique").mockResolvedValue(baseCampaign as any);
      vi.spyOn(TrustProfileService, "getOrCreateProfile").mockResolvedValue({
        id: "prof-1",
        userId: "tester-restricted",
        reputationStatus: ReputationStatus.RESTRICTED,
      } as any);
      vi.spyOn(prisma.campaignTester, "findFirst").mockResolvedValue(null);

      // Suppose tester already has 1 active campaign
      vi.spyOn(prisma.campaignTester, "count").mockResolvedValue(1);
      vi.spyOn(prisma.testerExposureProfile, "findUnique").mockResolvedValue({
        userId: "tester-restricted",
        level: TesterExposureLevel.ESTABLISHED, // Normal capacity 3
      } as any);
      vi.spyOn(prisma.campaignTester, "findMany").mockResolvedValue([
        { status: "COMPLETED", activityScore: 80 },
        { status: "COMPLETED", activityScore: 80 },
        { status: "COMPLETED", activityScore: 80 },
      ] as any);

      const result = await CampaignCompatibilityService.evaluateCompatibility(
        "campaign-1",
        "tester-restricted",
      );

      // Since reputation is RESTRICTED, capacity is capped to 1, and they already have 1 -> CAPACITY_EXCEEDED
      expect(result.isCompatible).toBe(false);
      expect(result.reason).toBe("CAPACITY_EXCEEDED");
    });
  });

  describe("MatchingStrategy Trust-Weighted Candidate Ranking", () => {
    it("should rank candidates with higher Trust Score higher when other metrics are equal", async () => {
      vi.spyOn(prisma.user, "findMany").mockResolvedValue([
        { id: "tester-high-trust" },
        { id: "tester-low-trust" },
      ] as any);

      vi.spyOn(CampaignCompatibilityService, "evaluateCompatibility").mockImplementation(async (_, testerId) => {
        return {
          isCompatible: true,
          load: {
            userId: testerId,
            activeCampaignsCount: 0,
            maxActiveCampaigns: 2,
            canAcceptMore: true,
            exposure: {
              userId: testerId,
              level: TesterExposureLevel.PROBATION,
              maxActiveCampaigns: 2,
              completedCampaignsCount: 1,
              abandonedCampaignsCount: 0,
              averageActivityScore: 85,
            },
          },
        };
      });

      vi.spyOn(TrustProfileService, "getOrCreateProfile").mockImplementation(async (userId) => {
        if (userId === "tester-high-trust") {
          return {
            id: "prof-high",
            userId: "tester-high-trust",
            trustScore: 90,
            trustRank: TrustRank.EXCELLENT,
            reputationStatus: ReputationStatus.NORMAL,
          } as any;
        }
        return {
          id: "prof-low",
          userId: "tester-low-trust",
          trustScore: 50,
          trustRank: TrustRank.NEW,
          reputationStatus: ReputationStatus.NORMAL,
        } as any;
      });

      const strategy = new DefaultMatchingStrategy();
      const ranked = await strategy.rankCandidates("campaign-1", 10);

      expect(ranked.length).toBe(2);
      expect(ranked[0].testerId).toBe("tester-high-trust");
      expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
    });
  });
});
