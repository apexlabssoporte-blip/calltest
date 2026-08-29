import { describe, it, expect, vi, beforeEach } from "vitest";
import { TesterExposureService } from "../src/modules/matching/exposure-service.js";
import { prisma } from "../src/core/database/prisma.js";
import { TesterExposureLevel, TesterStatus } from "@calltest/shared-types";

describe("TesterExposureService: Progression & Capacity Tiers", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should assign NEW tier with capacity = 1 for a new tester without completed campaigns", async () => {
    vi.spyOn(prisma.testerExposureProfile, "findUnique").mockResolvedValue(null);
    vi.spyOn(prisma.testerExposureProfile, "create").mockResolvedValue({
      id: "prof-1",
      userId: "user-new",
      level: TesterExposureLevel.NEW,
      overrideMaxCampaigns: null,
      completedCampaignsCount: 0,
      abandonedCampaignsCount: 0,
    } as any);

    vi.spyOn(prisma.campaignTester, "findMany").mockResolvedValue([]);

    const exposure = await TesterExposureService.getExposureDetails("user-new");

    expect(exposure.level).toBe(TesterExposureLevel.NEW);
    expect(exposure.maxActiveCampaigns).toBe(1);
  });

  it("should promote to PROBATION (capacity = 2) on sustained good behavior (1 completed campaign, score >= 60)", async () => {
    vi.spyOn(prisma.testerExposureProfile, "findUnique").mockResolvedValue({
      id: "prof-1",
      userId: "user-probation",
      level: TesterExposureLevel.NEW,
      overrideMaxCampaigns: null,
    } as any);

    const participations = [
      { status: TesterStatus.COMPLETED, activityScore: 75.0 },
    ];
    vi.spyOn(prisma.campaignTester, "findMany").mockResolvedValue(participations as any);
    vi.spyOn(prisma.testerExposureProfile, "update").mockResolvedValue({
      level: TesterExposureLevel.PROBATION,
    } as any);

    const exposure = await TesterExposureService.getExposureDetails("user-probation");

    expect(exposure.level).toBe(TesterExposureLevel.PROBATION);
    expect(exposure.maxActiveCampaigns).toBe(2);
  });

  it("should promote to ESTABLISHED (capacity = 3) on sustained excellence (3 completed campaigns, score >= 75)", async () => {
    vi.spyOn(prisma.testerExposureProfile, "findUnique").mockResolvedValue({
      id: "prof-1",
      userId: "user-established",
      level: TesterExposureLevel.PROBATION,
      overrideMaxCampaigns: null,
    } as any);

    const participations = [
      { status: TesterStatus.COMPLETED, activityScore: 80.0 },
      { status: TesterStatus.COMPLETED, activityScore: 85.0 },
      { status: TesterStatus.COMPLETED, activityScore: 78.0 },
    ];
    vi.spyOn(prisma.campaignTester, "findMany").mockResolvedValue(participations as any);
    vi.spyOn(prisma.testerExposureProfile, "update").mockResolvedValue({
      level: TesterExposureLevel.ESTABLISHED,
    } as any);

    const exposure = await TesterExposureService.getExposureDetails("user-established");

    expect(exposure.level).toBe(TesterExposureLevel.ESTABLISHED);
    expect(exposure.maxActiveCampaigns).toBe(3);
  });

  it("should promote to HIGH_PERFORMER (capacity = 4) on top performance (6 completed campaigns, score >= 85)", async () => {
    vi.spyOn(prisma.testerExposureProfile, "findUnique").mockResolvedValue({
      id: "prof-1",
      userId: "user-top",
      level: TesterExposureLevel.ESTABLISHED,
      overrideMaxCampaigns: null,
    } as any);

    const participations = Array.from({ length: 6 }, () => ({
      status: TesterStatus.COMPLETED,
      activityScore: 90.0,
    }));

    vi.spyOn(prisma.campaignTester, "findMany").mockResolvedValue(participations as any);
    vi.spyOn(prisma.testerExposureProfile, "update").mockResolvedValue({
      level: TesterExposureLevel.HIGH_PERFORMER,
    } as any);

    const exposure = await TesterExposureService.getExposureDetails("user-top");

    expect(exposure.level).toBe(TesterExposureLevel.HIGH_PERFORMER);
    expect(exposure.maxActiveCampaigns).toBe(4);
  });

  it("should demote to NEW tier on repeated abandonment without deleting user", async () => {
    vi.spyOn(prisma.testerExposureProfile, "findUnique").mockResolvedValue({
      id: "prof-1",
      userId: "user-abandoner",
      level: TesterExposureLevel.ESTABLISHED,
      overrideMaxCampaigns: null,
    } as any);

    const participations = [
      { status: TesterStatus.COMPLETED, activityScore: 80.0 },
      { status: TesterStatus.ABANDONED, activityScore: 0.0 },
      { status: TesterStatus.ABANDONED, activityScore: 0.0 },
    ];

    vi.spyOn(prisma.campaignTester, "findMany").mockResolvedValue(participations as any);
    vi.spyOn(prisma.testerExposureProfile, "update").mockResolvedValue({
      level: TesterExposureLevel.NEW,
    } as any);

    const exposure = await TesterExposureService.getExposureDetails("user-abandoner");

    expect(exposure.level).toBe(TesterExposureLevel.NEW);
    expect(exposure.maxActiveCampaigns).toBe(1);
    expect(exposure.abandonedCampaignsCount).toBe(2);
  });
});
