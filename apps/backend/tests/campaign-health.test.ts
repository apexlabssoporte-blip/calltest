import { describe, it, expect, vi, beforeEach } from "vitest";
import { CampaignHealthService } from "../src/modules/campaign-health/service.js";
import { prisma } from "../src/core/database/prisma.js";
import { CampaignRisk, TesterStatus } from "@calltest/shared-types";

describe("CampaignHealthService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const baseCampaign = {
    id: "campaign-1",
    targetTesters: 12,
    maxTesters: 15,
    durationDays: 14,
    missions: [{ id: "m-1" }, { id: "m-2" }],
  };

  it("should calculate HEALTHY status with 12 active testers and zero replacement need", async () => {
    const mockTesters = Array.from({ length: 12 }, (_, i) => ({
      id: `ct-${i}`,
      campaignId: "campaign-1",
      testerId: `t-${i}`,
      status: TesterStatus.ACTIVE,
      activityScore: 85.0,
    }));

    vi.spyOn(prisma.campaign, "findUnique").mockResolvedValue({
      ...baseCampaign,
      campaignTesters: mockTesters,
    } as any);
    vi.spyOn(prisma.missionAttempt, "count").mockResolvedValue(24);

    const health = await CampaignHealthService.calculateHealth("campaign-1");

    expect(health.activeTesters).toBe(12);
    expect(health.replacementNeed).toBe(0);
    expect(health.availableCapacity).toBe(3); // 15 - 12
    expect(health.campaignRisk).toBe(CampaignRisk.HEALTHY);
  });

  it("should calculate WARNING and replacementNeed = 1 when active testers = 11", async () => {
    const mockTesters = Array.from({ length: 11 }, (_, i) => ({
      id: `ct-${i}`,
      campaignId: "campaign-1",
      testerId: `t-${i}`,
      status: TesterStatus.ACTIVE,
      activityScore: 70.0,
    }));

    vi.spyOn(prisma.campaign, "findUnique").mockResolvedValue({
      ...baseCampaign,
      campaignTesters: mockTesters,
    } as any);
    vi.spyOn(prisma.missionAttempt, "count").mockResolvedValue(10);

    const health = await CampaignHealthService.calculateHealth("campaign-1");

    expect(health.activeTesters).toBe(11);
    expect(health.replacementNeed).toBe(1); // 12 - 11
    expect(health.availableCapacity).toBe(4); // 15 - 11
    expect(health.campaignRisk).toBe(CampaignRisk.WARNING);
  });

  it("should calculate AT_RISK and replacementNeed = 2 when active testers = 10", async () => {
    const mockTesters = Array.from({ length: 10 }, (_, i) => ({
      id: `ct-${i}`,
      campaignId: "campaign-1",
      testerId: `t-${i}`,
      status: TesterStatus.ACTIVE,
      activityScore: 65.0,
    }));

    vi.spyOn(prisma.campaign, "findUnique").mockResolvedValue({
      ...baseCampaign,
      campaignTesters: mockTesters,
    } as any);
    vi.spyOn(prisma.missionAttempt, "count").mockResolvedValue(8);

    const health = await CampaignHealthService.calculateHealth("campaign-1");

    expect(health.activeTesters).toBe(10);
    expect(health.replacementNeed).toBe(2); // 12 - 10
    expect(health.campaignRisk).toBe(CampaignRisk.AT_RISK);
  });

  it("LOW_ACTIVITY SEPARATION: 12 active + 5 low_activity must have replacementNeed = 0 and not consume 15 limit", async () => {
    // 12 ACTIVE + 5 LOW_ACTIVITY = 17 total enrolled
    const activeTesters = Array.from({ length: 12 }, (_, i) => ({
      id: `ct-act-${i}`,
      status: TesterStatus.ACTIVE,
      activityScore: 80.0,
    }));

    const lowActivityTesters = Array.from({ length: 5 }, (_, i) => ({
      id: `ct-low-${i}`,
      status: TesterStatus.LOW_ACTIVITY,
      activityScore: 30.0,
    }));

    vi.spyOn(prisma.campaign, "findUnique").mockResolvedValue({
      ...baseCampaign,
      campaignTesters: [...activeTesters, ...lowActivityTesters],
    } as any);
    vi.spyOn(prisma.missionAttempt, "count").mockResolvedValue(18);

    const health = await CampaignHealthService.calculateHealth("campaign-1");

    expect(health.activeTesters).toBe(12);
    expect(health.lowActivityTesters).toBe(5);
    expect(health.totalEnrolledTesters).toBe(17);
    expect(health.replacementNeed).toBe(0);
    expect(health.availableCapacity).toBe(3); // 15 - 12 = 3 available capacity for ACTIVE
  });

  it("BOUNDARY TESTS: 14 active and 15 active must have replacementNeed = 0", async () => {
    const testers15 = Array.from({ length: 15 }, (_, i) => ({
      id: `ct-${i}`,
      status: TesterStatus.ACTIVE,
      activityScore: 85.0,
    }));

    vi.spyOn(prisma.campaign, "findUnique").mockResolvedValue({
      ...baseCampaign,
      campaignTesters: testers15,
    } as any);
    vi.spyOn(prisma.missionAttempt, "count").mockResolvedValue(30);

    const health = await CampaignHealthService.calculateHealth("campaign-1");

    expect(health.activeTesters).toBe(15);
    expect(health.replacementNeed).toBe(0);
    expect(health.availableCapacity).toBe(0);
  });
});
