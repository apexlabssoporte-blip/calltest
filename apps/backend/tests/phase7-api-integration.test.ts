import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/core/database/prisma.js";
import {
  UserRole,
  UserStatus,
  CampaignStatus,
  CampaignRisk,
  PlayStoreValidationStatus,
  GoogleGroupValidationStatus,
  TesterStatus,
  TesterAssignmentType,
} from "@calltest/shared-types";
import { CampaignOperationsService } from "../src/modules/campaigns/operations/campaign-operations.service.js";
import { CampaignReadinessService } from "../src/modules/campaigns/operations/campaign-readiness.service.js";
import { CampaignCompletionService } from "../src/modules/campaigns/operations/campaign-completion.service.js";
import { ActivityClassificationService } from "../src/modules/activity/classification-service.js";

describe("Phase 7 API End-to-End Integration", () => {
  const app = buildApp();
  let devOwnerToken: string;
  let otherDevToken: string;
  let testerToken: string;

  const devOwnerId = "a0000000-0000-0000-0000-000000000001";
  const otherDevId = "a0000000-0000-0000-0000-000000000002";
  const testerId = "a0000000-0000-0000-0000-000000000003";

  const campaignId = "c0000000-0000-0000-0000-000000000001";
  const appId = "e0000000-0000-0000-0000-000000000001";

  beforeAll(async () => {
    await app.ready();
    devOwnerToken = app.jwt.sign({ sub: devOwnerId, email: "dev@calltest.com", role: UserRole.DEVELOPER });
    otherDevToken = app.jwt.sign({ sub: otherDevId, email: "otherdev@calltest.com", role: UserRole.DEVELOPER });
    testerToken = app.jwt.sign({ sub: testerId, email: "tester@calltest.com", role: UserRole.TESTER });
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const baseCampaign = {
    id: campaignId,
    appId,
    name: "Dashboard Sprint",
    status: CampaignStatus.ACTIVE,
    targetTesters: 12,
    maxTesters: 15,
    durationDays: 14,
    developerConfirmedLinksTest: true,
    storeValidationStatus: PlayStoreValidationStatus.TESTING,
    groupValidationStatus: GoogleGroupValidationStatus.ACCESSIBLE,
    app: {
      id: appId,
      developerId: devOwnerId,
      name: "Dashboard App",
      packageName: "com.dashboard.app",
      playStoreUrl: "https://play.google.com/apps/testing/com.dashboard.app?id=com.dashboard.app",
      googleGroupUrl: "https://groups.google.com/g/dashboard-testers",
    },
  };

  describe("Developer Campaign Dashboard", () => {
    it("GET /campaigns/:id/dashboard: Owner Developer should receive operational dashboard", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: devOwnerId,
        role: UserRole.DEVELOPER,
        status: UserStatus.ACTIVE,
      } as any);

      vi.spyOn(prisma.campaign, "findUnique").mockResolvedValue(baseCampaign as any);

      vi.spyOn(CampaignOperationsService, "getCampaignOperationsSummary").mockResolvedValue({
        campaignId,
        campaignName: "Dashboard Sprint",
        appId,
        appName: "Dashboard App",
        packageName: "com.dashboard.app",
        status: CampaignStatus.ACTIVE,
        durationDays: 14,
        daysElapsed: 7,
        daysRemaining: 7,
        startsAt: new Date(),
        endsAt: null,
        expectedEndAt: new Date(),
        targetActiveTesters: 12,
        assignedTestersCount: 12,
        installationClaimedCount: 12,
        installationVerifiedCount: 12,
        participationVerifiedCount: 12,
        pendingVerificationCount: 0,
        activeTestersCount: 12,
        lowActivityTestersCount: 0,
        abandonedTestersCount: 0,
        completedTestersCount: 0,
        replacementCount: 0,
        missionProgress: {
          totalMissions: 5,
          totalAttempts: 30,
          completedAttempts: 25,
          completionRate: 83.3,
        },
        missionsSummary: {
          totalMissions: 5,
          completedAttempts: 25,
          pendingAttempts: 5,
          rejectedAttempts: 0,
        },
        health: {
          risk: CampaignRisk.HEALTHY,
          score: 95,
          replacementNeeded: 0,
          canAddTesters: true,
        },
        storeValidationStatus: PlayStoreValidationStatus.TESTING,
        groupValidationStatus: GoogleGroupValidationStatus.ACCESSIBLE,
        developerConfirmedLinksTest: true,
        publicVerifiedAt: null,
      });

      const response = await app.inject({
        method: "GET",
        url: `/campaigns/${campaignId}/dashboard`,
        headers: { authorization: `Bearer ${devOwnerToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.campaignName).toBe("Dashboard Sprint");
      expect(body.activeTestersCount).toBe(12);
      expect(body.health.risk).toBe(CampaignRisk.HEALTHY);

      // Privacy Check: Fraud data & internal secrets must NOT exist in the response
      expect(body.fraudScore).toBeUndefined();
      expect(body.fraudEvents).toBeUndefined();
    });

    it("IDOR GUARD: Other Developer attempting to access campaign dashboard should be rejected (403)", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: otherDevId,
        role: UserRole.DEVELOPER,
        status: UserStatus.ACTIVE,
      } as any);

      vi.spyOn(prisma.campaign, "findUnique").mockResolvedValue(baseCampaign as any);

      const response = await app.inject({
        method: "GET",
        url: `/campaigns/${campaignId}/dashboard`,
        headers: { authorization: `Bearer ${otherDevToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it("RBAC GUARD: Tester attempting to access developer campaign dashboard should be rejected (403)", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: testerId,
        role: UserRole.TESTER,
        status: UserStatus.ACTIVE,
      } as any);

      const response = await app.inject({
        method: "GET",
        url: `/campaigns/${campaignId}/dashboard`,
        headers: { authorization: `Bearer ${testerToken}` },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe("Campaign Readiness & Link Confirmation", () => {
    it("GET /campaigns/:id/readiness: should return readiness status and checks", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: devOwnerId,
        role: UserRole.DEVELOPER,
        status: UserStatus.ACTIVE,
      } as any);

      vi.spyOn(prisma.campaign, "findUnique").mockResolvedValue(baseCampaign as any);

      vi.spyOn(CampaignReadinessService, "evaluateReadiness").mockResolvedValue({
        campaignId,
        ready: true,
        checks: [
          {
            code: "DEVELOPER_ACTIVE",
            name: "Developer Active",
            passed: true,
            isBlocking: true,
            message: "Active",
          },
        ],
        blockingReasons: [],
        warnings: [],
      });

      const response = await app.inject({
        method: "GET",
        url: `/campaigns/${campaignId}/readiness`,
        headers: { authorization: `Bearer ${devOwnerToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.ready).toBe(true);
    });

    it("POST /campaigns/:id/confirm-links-test: should update developerConfirmedLinksTest to true", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: devOwnerId,
        role: UserRole.DEVELOPER,
        status: UserStatus.ACTIVE,
      } as any);

      vi.spyOn(prisma.campaign, "findUnique").mockResolvedValue(baseCampaign as any);
      vi.spyOn(prisma.campaign, "update").mockResolvedValue({
        ...baseCampaign,
        developerConfirmedLinksTest: true,
      } as any);
      vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

      const response = await app.inject({
        method: "POST",
        url: `/campaigns/${campaignId}/confirm-links-test`,
        headers: { authorization: `Bearer ${devOwnerToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.developerConfirmedLinksTest).toBe(true);
    });
  });

  describe("Campaign Completion & Sanitized Tester Overview", () => {
    it("POST /campaigns/:id/complete: should complete testing and return summary", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: devOwnerId,
        role: UserRole.DEVELOPER,
        status: UserStatus.ACTIVE,
      } as any);

      vi.spyOn(prisma.campaign, "findUnique").mockResolvedValue(baseCampaign as any);

      vi.spyOn(CampaignCompletionService, "completeCampaign").mockResolvedValue({
        campaignId,
        previousStatus: CampaignStatus.ACTIVE,
        newStatus: CampaignStatus.COMPLETED,
        completedTestersCount: 12,
        isPubliclyVerified: false,
        completedAt: new Date(),
      });

      const response = await app.inject({
        method: "POST",
        url: `/campaigns/${campaignId}/complete`,
        headers: { authorization: `Bearer ${devOwnerToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.newStatus).toBe(CampaignStatus.COMPLETED);
      expect(body.completedTestersCount).toBe(12);
    });

    it("GET /campaigns/:campaignId/testers/:testerId/overview: should return sanitized tester overview", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: devOwnerId,
        role: UserRole.DEVELOPER,
        status: UserStatus.ACTIVE,
      } as any);

      vi.spyOn(prisma.campaign, "findUnique").mockResolvedValue(baseCampaign as any);

      vi.spyOn(prisma.campaignTester, "findFirst").mockResolvedValue({
        id: "ct-100",
        campaignId,
        testerId,
        status: TesterStatus.ACTIVE,
        assignmentType: TesterAssignmentType.PRIMARY,
        isReplacement: false,
        joinedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        expectedEndAt: new Date(),
        actualEndAt: null,
        activityScore: 88,
        tester: {
          id: testerId,
          displayName: "Tester One",
          email: "tester@calltest.com",
        },
        missionAttempts: [
          { status: "VALIDATED" },
          { status: "VALIDATED" },
        ],
        difficultyFeedbacks: [],
        qualityFeedbacks: [],
        activityEvents: [
          { serverTimestamp: new Date() },
        ],
      } as any);

      vi.spyOn(prisma.mission, "count").mockResolvedValue(4);

      vi.spyOn(ActivityClassificationService, "classifyTester").mockResolvedValue({
        state: "ACTIVE" as any,
        score: 88,
        signals: {
          daysEnrolled: 6,
          completedMissions: 2,
          activeDaysCount: 4,
          sessionsCount: 8,
          continuityRate: 0.9,
        },
      });

      const response = await app.inject({
        method: "GET",
        url: `/campaigns/${campaignId}/testers/${testerId}/overview`,
        headers: { authorization: `Bearer ${devOwnerToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.displayName).toBe("Tester One");
      expect(body.completedMissionsCount).toBe(2);
      expect(body.daysParticipating).toBe(6);
      expect(body.activityScore).toBe(88);
      expect(body.activityState).toBe("ACTIVE");

      // Privacy Check: Internal security telemetry must NOT leak to developer
      expect(body.fraudScore).toBeUndefined();
      expect(body.ipAddress).toBeUndefined();
    });
  });
});
