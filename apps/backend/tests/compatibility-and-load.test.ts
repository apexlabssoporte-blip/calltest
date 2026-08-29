import { describe, it, expect, vi, beforeEach } from "vitest";
import { CampaignCompatibilityService } from "../src/modules/matching/compatibility-service.js";
import { TesterLoadService } from "../src/modules/matching/load-service.js";
import { TrustProfileService } from "../src/modules/trust/trust-profile-service.js";
import { prisma } from "../src/core/database/prisma.js";
import { UserRole, UserStatus, TesterExposureLevel, ReputationStatus, TrustRank } from "@calltest/shared-types";

describe("CampaignCompatibilityService & Self-Testing Guard", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(TrustProfileService, "getOrCreateProfile").mockResolvedValue({
      id: "prof-default",
      userId: "user-default",
      trustScore: 50,
      trustRank: TrustRank.NEW,
      reputationStatus: ReputationStatus.NORMAL,
    } as any);
  });

  const baseCampaign = {
    id: "campaign-1",
    appId: "app-1",
    app: {
      id: "app-1",
      developerId: "dev-owner-1",
    },
  };

  it("SELF-TESTING GUARD: should reject Developer from testing their own application", async () => {
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
      id: "dev-owner-1",
      role: UserRole.DEVELOPER,
      status: UserStatus.ACTIVE,
    } as any);

    vi.spyOn(prisma.campaign, "findUnique").mockResolvedValue(baseCampaign as any);

    const result = await CampaignCompatibilityService.evaluateCompatibility(
      "campaign-1",
      "dev-owner-1",
    );

    expect(result.isCompatible).toBe(false);
    expect(result.reason).toBe("SELF_TESTING_NOT_ALLOWED");
  });

  it("SELF-TESTING GUARD: should reject user with BOTH role from testing their own application", async () => {
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
      id: "dev-owner-1",
      role: UserRole.BOTH, // User can act as both developer and tester
      status: UserStatus.ACTIVE,
    } as any);

    vi.spyOn(prisma.campaign, "findUnique").mockResolvedValue(baseCampaign as any);

    const result = await CampaignCompatibilityService.evaluateCompatibility(
      "campaign-1",
      "dev-owner-1",
    );

    expect(result.isCompatible).toBe(false);
    expect(result.reason).toBe("SELF_TESTING_NOT_ALLOWED");
  });

  it("DUAL-ROLE ELIGIBILITY: should allow user with BOTH role to test another developer's application", async () => {
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
      id: "tester-both-user",
      role: UserRole.BOTH,
      status: UserStatus.ACTIVE,
    } as any);

    vi.spyOn(prisma.campaign, "findUnique").mockResolvedValue(baseCampaign as any);
    vi.spyOn(prisma.campaignTester, "findFirst").mockResolvedValue(null);

    vi.spyOn(TesterLoadService, "calculateLoad").mockResolvedValue({
      userId: "tester-both-user",
      activeCampaignsCount: 0,
      maxActiveCampaigns: 2,
      canAcceptMore: true,
      exposure: {
        userId: "tester-both-user",
        level: TesterExposureLevel.PROBATION,
        maxActiveCampaigns: 2,
        completedCampaignsCount: 1,
        abandonedCampaignsCount: 0,
        averageActivityScore: 80,
      },
    });

    const result = await CampaignCompatibilityService.evaluateCompatibility(
      "campaign-1",
      "tester-both-user",
    );

    expect(result.isCompatible).toBe(true);
  });

  it("CAPACITY EXCEEDED: should reject candidate if active campaigns reach max exposure limit", async () => {
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
      id: "tester-new",
      role: UserRole.TESTER,
      status: UserStatus.ACTIVE,
    } as any);

    vi.spyOn(prisma.campaign, "findUnique").mockResolvedValue(baseCampaign as any);
    vi.spyOn(prisma.campaignTester, "findFirst").mockResolvedValue(null);

    // NEW tester with maxActiveCampaigns = 1 who already has 1 active campaign
    vi.spyOn(TesterLoadService, "calculateLoad").mockResolvedValue({
      userId: "tester-new",
      activeCampaignsCount: 1,
      maxActiveCampaigns: 1,
      canAcceptMore: false,
      exposure: {
        userId: "tester-new",
        level: TesterExposureLevel.NEW,
        maxActiveCampaigns: 1,
        completedCampaignsCount: 0,
        abandonedCampaignsCount: 0,
        averageActivityScore: 100,
      },
    });

    const result = await CampaignCompatibilityService.evaluateCompatibility(
      "campaign-1",
      "tester-new",
    );

    expect(result.isCompatible).toBe(false);
    expect(result.reason).toBe("CAPACITY_EXCEEDED");
  });
});
