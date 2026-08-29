import { describe, it, expect, vi, beforeEach } from "vitest";
import { CampaignReadinessService } from "../src/modules/campaigns/operations/campaign-readiness.service.js";
import { CampaignOperationsService } from "../src/modules/campaigns/operations/campaign-operations.service.js";
import { CampaignCompletionService } from "../src/modules/campaigns/operations/campaign-completion.service.js";
import { CampaignHealthService } from "../src/modules/campaign-health/service.js";
import { prisma } from "../src/core/database/prisma.js";
import {
  AppStatus,
  CampaignRisk,
  CampaignStatus,
  GoogleGroupValidationStatus,
  MissionStatus,
  PlayStoreValidationStatus,
  TesterStatus,
  UserRole,
  UserStatus,
} from "@calltest/shared-types";
import { eventBus } from "../src/core/events/domain-event-bus.js";

describe("Campaign Readiness, Operations & Completion Services", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const baseCampaign = {
    id: "camp-ready-1",
    appId: "app-1",
    name: "Alpha Test Sprint",
    status: CampaignStatus.DRAFT,
    targetTesters: 12,
    maxTesters: 15,
    durationDays: 14,
    developerConfirmedLinksTest: true,
    storeValidationStatus: PlayStoreValidationStatus.TESTING,
    groupValidationStatus: GoogleGroupValidationStatus.ACCESSIBLE,
    startsAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    endsAt: null,
    publicVerifiedAt: null,
    app: {
      id: "app-1",
      developerId: "dev-1",
      name: "Alpha App",
      packageName: "com.alpha.app",
      status: AppStatus.ACTIVE,
      playStoreUrl: "https://play.google.com/apps/testing/com.alpha.app?id=com.alpha.app",
      googleGroupUrl: "https://groups.google.com/g/alpha-testers",
      developer: {
        id: "dev-1",
        status: UserStatus.ACTIVE,
        role: UserRole.DEVELOPER,
      },
    },
    missions: [
      {
        id: "m-1",
        status: MissionStatus.ACTIVE,
      },
    ],
    campaignTesters: [
      {
        id: "ct-1",
        testerId: "t-1",
        status: TesterStatus.ACTIVE,
        isReplacement: false,
        missionAttempts: [{ status: "VALIDATED" }],
      },
      {
        id: "ct-2",
        testerId: "t-2",
        status: TesterStatus.LOW_ACTIVITY,
        isReplacement: true,
        missionAttempts: [{ status: "SUBMITTED" }],
      },
    ],
  };

  describe("CampaignReadinessService", () => {
    it("should return ready: true when all checks pass", async () => {
      vi.spyOn(prisma.campaign, "findUnique").mockResolvedValue(baseCampaign as any);

      const readiness = await CampaignReadinessService.evaluateReadiness("camp-ready-1");

      expect(readiness.ready).toBe(true);
      expect(readiness.blockingReasons.length).toBe(0);
      expect(readiness.checks.every((c) => c.passed)).toBe(true);
    });

    it("should block readiness if developer has not confirmed manual device link test", async () => {
      vi.spyOn(prisma.campaign, "findUnique").mockResolvedValue({
        ...baseCampaign,
        developerConfirmedLinksTest: false,
      } as any);

      const readiness = await CampaignReadinessService.evaluateReadiness("camp-ready-1");

      expect(readiness.ready).toBe(false);
      expect(readiness.blockingReasons).toContain(
        "Developer must test and confirm links from a real mobile device before activation",
      );
    });

    it("should block readiness if campaign has 0 active or approved missions", async () => {
      vi.spyOn(prisma.campaign, "findUnique").mockResolvedValue({
        ...baseCampaign,
        missions: [],
      } as any);

      const readiness = await CampaignReadinessService.evaluateReadiness("camp-ready-1");

      expect(readiness.ready).toBe(false);
      expect(readiness.blockingReasons).toContain(
        "At least 1 approved/active mission is required to start the campaign",
      );
    });
  });

  describe("CampaignOperationsService", () => {
    it("should compute operational metrics, days elapsed/remaining, and progress", async () => {
      vi.spyOn(prisma.campaign, "findUnique").mockResolvedValue(baseCampaign as any);
      vi.spyOn(CampaignHealthService, "calculateHealth").mockResolvedValue({
        campaignId: "camp-ready-1",
        targetActiveTesters: 12,
        maxActiveTesters: 15,
        activeTesters: 1,
        lowActivityTesters: 1,
        abandonedTesters: 0,
        completedTesters: 0,
        totalEnrolledTesters: 2,
        missionCompletionRate: 100,
        activityRate: 85,
        replacementNeed: 11,
        availableCapacity: 13,
        campaignRisk: CampaignRisk.HEALTHY,
      });

      const summary = await CampaignOperationsService.getCampaignOperationsSummary("camp-ready-1");

      expect(summary.campaignName).toBe("Alpha Test Sprint");
      expect(summary.daysElapsed).toBe(5);
      expect(summary.daysRemaining).toBe(9);
      expect(summary.activeTestersCount).toBe(1);
      expect(summary.lowActivityTestersCount).toBe(1);
      expect(summary.replacementCount).toBe(1);
      expect(summary.health.risk).toBe(CampaignRisk.HEALTHY);
    });
  });

  describe("CampaignCompletionService", () => {
    it("should complete testing, update testers (including replacements), and emit domain events", async () => {
      vi.spyOn(prisma.campaign, "findUnique").mockResolvedValue(baseCampaign as any);
      vi.spyOn(prisma.app, "findUnique").mockResolvedValue(baseCampaign.app as any);
      vi.spyOn(prisma, "$transaction").mockImplementation(async (cb: any) =>
        cb({
          campaign: { update: vi.fn().mockResolvedValue({}) },
          campaignTester: { update: vi.fn().mockResolvedValue({}) },
        }),
      );

      const publishSpy = vi.spyOn(eventBus, "publish");

      const result = await CampaignCompletionService.completeCampaign("camp-ready-1", "dev-1");

      expect(result.previousStatus).toBe(CampaignStatus.DRAFT);
      expect(result.newStatus).toBe(CampaignStatus.COMPLETED);
      expect(result.completedTestersCount).toBe(2);

      // Verify domain events published
      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "campaign.completed",
        }),
      );
      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "tester.participation_completed",
        }),
      );
    });
  });
});
