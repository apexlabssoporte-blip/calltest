import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/core/database/prisma.js";
import {
  UserRole,
  UserStatus,
  TesterExposureLevel,
  CampaignRisk,
} from "@calltest/shared-types";
import { CampaignHealthService } from "../src/modules/campaign-health/service.js";
import { MatchingEngine } from "../src/modules/matching/service.js";
import { signInternalServiceRequest } from "../src/core/middlewares/internal-service-guard.js";

describe("Phase 4 API End-to-End Integration", () => {
  const app = buildApp();
  let devToken: string;
  let testerToken: string;

  const devUserId = "a0000000-0000-0000-0000-000000000001";
  const testerUserId = "a0000000-0000-0000-0000-000000000002";
  const campaignId = "c0000000-0000-0000-0000-000000000001";

  beforeAll(async () => {
    await app.ready();
    devToken = app.jwt.sign({ sub: devUserId, email: "dev@calltest.com", role: UserRole.DEVELOPER });
    testerToken = app.jwt.sign({ sub: testerUserId, email: "tester@calltest.com", role: UserRole.TESTER });
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Campaign Health Endpoints", () => {
    it("GET /campaigns/:campaignId/health should return health metrics", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: devUserId,
        email: "dev@calltest.com",
        role: UserRole.DEVELOPER,
        status: UserStatus.ACTIVE,
        displayName: "Dev User",
      } as any);

      vi.spyOn(prisma.campaign, "findUnique").mockResolvedValue({
        id: campaignId,
        app: { developerId: devUserId },
      } as any);

      vi.spyOn(CampaignHealthService, "calculateHealth").mockResolvedValue({
        campaignId,
        targetActiveTesters: 12,
        maxActiveTesters: 15,
        activeTesters: 12,
        lowActivityTesters: 0,
        abandonedTesters: 0,
        completedTesters: 0,
        totalEnrolledTesters: 12,
        missionCompletionRate: 0.9,
        activityRate: 88.0,
        replacementNeed: 0,
        availableCapacity: 3,
        campaignRisk: CampaignRisk.HEALTHY,
      });

      const response = await app.inject({
        method: "GET",
        url: `/campaigns/${campaignId}/health`,
        headers: { authorization: `Bearer ${devToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.campaignRisk).toBe(CampaignRisk.HEALTHY);
      expect(body.activeTesters).toBe(12);
      expect(body.replacementNeed).toBe(0);
    });
  });

  describe("Matching Evaluation Endpoints", () => {
    it("POST /internal/matching/campaigns/:campaignId/evaluate should execute matching", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: devUserId,
        email: "dev@calltest.com",
        role: UserRole.DEVELOPER,
        status: UserStatus.ACTIVE,
        displayName: "Dev User",
      } as any);

      vi.spyOn(MatchingEngine, "evaluateAndAssignReplacements").mockResolvedValue({
        campaignId,
        assignedCount: 1,
        health: {
          campaignId,
          targetActiveTesters: 12,
          maxActiveTesters: 15,
          activeTesters: 12,
          lowActivityTesters: 0,
          abandonedTesters: 0,
          completedTesters: 0,
          totalEnrolledTesters: 12,
          missionCompletionRate: 0.9,
          activityRate: 85.0,
          replacementNeed: 0,
          availableCapacity: 3,
          campaignRisk: CampaignRisk.HEALTHY,
        },
        assignedTesters: [
          {
            testerId: testerUserId,
            campaignTesterId: "ct-assigned-1",
            score: 92,
            joinedAt: new Date(),
            expectedEndAt: new Date(Date.now() + 14 * 86400000),
            isReplacement: true,
          },
        ],
      });

      const signed = signInternalServiceRequest({
        method: "POST",
        path: `/internal/matching/campaigns/${campaignId}/evaluate`,
      });

      const response = await app.inject({
        method: "POST",
        url: `/internal/matching/campaigns/${campaignId}/evaluate`,
        headers: {
          "x-internal-signature": signed.signature,
          "x-internal-timestamp": signed.timestamp,
          "x-internal-nonce": signed.nonce,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.assignedCount).toBe(1);
      expect(body.assignedTesters.length).toBe(1);
    });
  });

  describe("Tester Exposure Endpoints", () => {
    it("GET /me/exposure should return exposure and capacity details", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: testerUserId,
        email: "tester@calltest.com",
        role: UserRole.TESTER,
        status: UserStatus.ACTIVE,
        displayName: "Tester User",
      } as any);

      vi.spyOn(prisma.testerExposureProfile, "findUnique").mockResolvedValue({
        userId: testerUserId,
        level: TesterExposureLevel.PROBATION,
        overrideMaxCampaigns: null,
      } as any);

      vi.spyOn(prisma.campaignTester, "findMany").mockResolvedValue([
        { status: "COMPLETED", activityScore: 75 },
      ] as any);

      vi.spyOn(prisma.campaignTester, "count").mockResolvedValue(1);

      const response = await app.inject({
        method: "GET",
        url: "/me/exposure",
        headers: { authorization: `Bearer ${testerToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.level).toBe(TesterExposureLevel.PROBATION);
      expect(body.maxActiveCampaigns).toBe(2);
      expect(body.currentActiveCampaigns).toBe(1);
    });
  });
});
