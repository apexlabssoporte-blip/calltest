import { describe, it, expect, vi, beforeEach } from "vitest";
import { MatchingEngine } from "../src/modules/matching/service.js";
import { DefaultMatchingStrategy } from "../src/modules/matching/matching-strategy.js";
import { CampaignHealthService } from "../src/modules/campaign-health/service.js";
import { CampaignCompatibilityService } from "../src/modules/matching/compatibility-service.js";
import { TrustProfileService } from "../src/modules/trust/trust-profile-service.js";
import { prisma } from "../src/core/database/prisma.js";
import {
  CampaignRisk,
  TesterExposureLevel,
  UserRole,
  TrustRank,
  ReputationStatus,
} from "@calltest/shared-types";

describe("MatchingEngine & Transactional Assignment", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(TrustProfileService, "getOrCreateProfile").mockResolvedValue({
      id: "prof-mock",
      userId: "user-mock",
      trustScore: 75,
      trustRank: TrustRank.RELIABLE,
      reputationStatus: ReputationStatus.NORMAL,
    } as any);
  });

  const baseCampaign = {
    id: "campaign-1",
    appId: "app-1",
    targetTesters: 12,
    maxTesters: 15,
    durationDays: 14,
    app: { developerId: "dev-1" },
  };

  describe("Candidate Ranking & MatchingStrategy", () => {
    it("should rank candidates by composite score descending", async () => {
      vi.spyOn(prisma.user, "findMany").mockResolvedValue([
        { id: "tester-1" },
        { id: "tester-2" },
      ] as any);

      // Tester 1: Top performer with score 90
      vi.spyOn(CampaignCompatibilityService, "evaluateCompatibility").mockImplementation(async (_, testerId) => {
        if (testerId === "tester-1") {
          return {
            isCompatible: true,
            load: {
              userId: "tester-1",
              activeCampaignsCount: 0,
              maxActiveCampaigns: 4,
              canAcceptMore: true,
              exposure: {
                userId: "tester-1",
                level: TesterExposureLevel.HIGH_PERFORMER,
                maxActiveCampaigns: 4,
                completedCampaignsCount: 6,
                abandonedCampaignsCount: 0,
                averageActivityScore: 95,
              },
            },
          };
        }
        // Tester 2: New tester
        return {
          isCompatible: true,
          load: {
            userId: "tester-2",
            activeCampaignsCount: 0,
            maxActiveCampaigns: 1,
            canAcceptMore: true,
            exposure: {
              userId: "tester-2",
              level: TesterExposureLevel.NEW,
              maxActiveCampaigns: 1,
              completedCampaignsCount: 0,
              abandonedCampaignsCount: 0,
              averageActivityScore: 80,
            },
          },
        };
      });

      const strategy = new DefaultMatchingStrategy();
      const ranked = await strategy.rankCandidates("campaign-1", 10);

      expect(ranked.length).toBe(2);
      expect(ranked[0].testerId).toBe("tester-1"); // Higher score ranked first
      expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
    });
  });

  describe("MatchingEngine.evaluateAndAssignReplacements", () => {
    it("should assign 1 replacement with individual expectedEndAt when active = 11", async () => {
      vi.spyOn(prisma.campaign, "findUnique").mockResolvedValue(baseCampaign as any);

      vi.spyOn(CampaignHealthService, "calculateHealth").mockResolvedValue({
        campaignId: "campaign-1",
        targetActiveTesters: 12,
        maxActiveTesters: 15,
        activeTesters: 11,
        lowActivityTesters: 0,
        abandonedTesters: 1,
        completedTesters: 0,
        totalEnrolledTesters: 12,
        missionCompletionRate: 0.8,
        activityRate: 80.0,
        replacementNeed: 1,
        availableCapacity: 4,
        campaignRisk: CampaignRisk.WARNING,
      });

      // Mock strategy candidate
      vi.spyOn(DefaultMatchingStrategy.prototype, "rankCandidates").mockResolvedValue([
        {
          testerId: "candidate-rep-1",
          score: 88,
          activityScore: 90,
          completionRate: 1.0,
          currentLoad: 0,
          exposureLevel: TesterExposureLevel.PROBATION,
        },
      ]);

      // Mock prisma transaction
      vi.spyOn(prisma, "$transaction").mockImplementation(async (cb: any) => {
        const txMock = {
          campaignTester: {
            count: vi.fn().mockResolvedValue(11), // 11 active
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockImplementation(async (args: any) => ({
              id: "new-ct-replacement-1",
              ...args.data,
            })),
          },
        };
        return cb(txMock);
      });

      vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

      const result = await MatchingEngine.evaluateAndAssignReplacements(
        "campaign-1",
        "dev-1",
        UserRole.DEVELOPER,
      );

      expect(result.assignedCount).toBe(1);
      expect(result.assignedTesters[0].testerId).toBe("candidate-rep-1");
      expect(result.assignedTesters[0].isReplacement).toBe(true);

      // Verify replacement dates: expectedEndAt is joinedAt + 14 days
      const joinedAt = result.assignedTesters[0].joinedAt;
      const expectedEndAt = result.assignedTesters[0].expectedEndAt;
      const diffDays = Math.round((expectedEndAt.getTime() - joinedAt.getTime()) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(14);
    });

    it("CONCURRENCY & 15 LIMIT INVARIANT: should not exceed 15 active testers even if candidates available", async () => {
      vi.spyOn(prisma.campaign, "findUnique").mockResolvedValue(baseCampaign as any);

      vi.spyOn(CampaignHealthService, "calculateHealth").mockResolvedValue({
        campaignId: "campaign-1",
        targetActiveTesters: 12,
        maxActiveTesters: 15,
        activeTesters: 10,
        lowActivityTesters: 0,
        abandonedTesters: 2,
        completedTesters: 0,
        totalEnrolledTesters: 12,
        missionCompletionRate: 0.7,
        activityRate: 75.0,
        replacementNeed: 2,
        availableCapacity: 5,
        campaignRisk: CampaignRisk.AT_RISK,
      });

      // 4 candidates available
      vi.spyOn(DefaultMatchingStrategy.prototype, "rankCandidates").mockResolvedValue([
        { testerId: "cand-1", score: 90, activityScore: 90, completionRate: 1, currentLoad: 0, exposureLevel: TesterExposureLevel.PROBATION },
        { testerId: "cand-2", score: 85, activityScore: 85, completionRate: 1, currentLoad: 0, exposureLevel: TesterExposureLevel.PROBATION },
        { testerId: "cand-3", score: 80, activityScore: 80, completionRate: 1, currentLoad: 0, exposureLevel: TesterExposureLevel.PROBATION },
        { testerId: "cand-4", score: 75, activityScore: 75, completionRate: 1, currentLoad: 0, exposureLevel: TesterExposureLevel.PROBATION },
      ]);

      // Suppose concurrent requests brought active testers to 14 inside transaction
      vi.spyOn(prisma, "$transaction").mockImplementation(async (cb: any) => {
        const txMock = {
          campaignTester: {
            count: vi.fn().mockResolvedValue(14), // Already 14 active testers!
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockImplementation(async (args: any) => ({
              id: `ct-${Math.random()}`,
              ...args.data,
            })),
          },
        };
        return cb(txMock);
      });

      vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

      const result = await MatchingEngine.evaluateAndAssignReplacements(
        "campaign-1",
        "dev-1",
        UserRole.DEVELOPER,
      );

      // Since active was 14 and max is 15, only 1 candidate was assigned despite 4 candidates being returned
      expect(result.assignedCount).toBe(1);
    });

    it("IDEMPOTENCY: should skip candidate if already actively enrolled in campaign", async () => {
      vi.spyOn(prisma.campaign, "findUnique").mockResolvedValue(baseCampaign as any);

      vi.spyOn(CampaignHealthService, "calculateHealth").mockResolvedValue({
        campaignId: "campaign-1",
        targetActiveTesters: 12,
        maxActiveTesters: 15,
        activeTesters: 11,
        lowActivityTesters: 0,
        abandonedTesters: 1,
        completedTesters: 0,
        totalEnrolledTesters: 12,
        missionCompletionRate: 0.8,
        activityRate: 80.0,
        replacementNeed: 1,
        availableCapacity: 4,
        campaignRisk: CampaignRisk.WARNING,
      });

      vi.spyOn(DefaultMatchingStrategy.prototype, "rankCandidates").mockResolvedValue([
        { testerId: "cand-already-in", score: 90, activityScore: 90, completionRate: 1, currentLoad: 0, exposureLevel: TesterExposureLevel.PROBATION },
      ]);

      // Inside transaction, candidate is found to be already active
      vi.spyOn(prisma, "$transaction").mockImplementation(async (cb: any) => {
        const txMock = {
          campaignTester: {
            count: vi.fn().mockResolvedValue(11),
            findFirst: vi.fn().mockResolvedValue({ id: "existing-ct" }), // Already enrolled
            create: vi.fn(),
          },
        };
        return cb(txMock);
      });

      const result = await MatchingEngine.evaluateAndAssignReplacements(
        "campaign-1",
        "dev-1",
        UserRole.DEVELOPER,
      );

      expect(result.assignedCount).toBe(0);
    });
  });
});
