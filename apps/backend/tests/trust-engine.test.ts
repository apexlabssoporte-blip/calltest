import { describe, it, expect, vi, beforeEach } from "vitest";
import { TrustProfileService } from "../src/modules/trust/trust-profile-service.js";
import { TrustScoreService } from "../src/modules/trust/trust-score-service.js";
import { TrustPenaltyService } from "../src/modules/trust/penalty-service.js";
import { TrustRecoveryService } from "../src/modules/trust/recovery-service.js";
import { FraudScoreService } from "../src/modules/fraud/fraud-score-service.js";
import { prisma } from "../src/core/database/prisma.js";
import {
  FraudSeverity,
  ReputationStatus,
  TesterStatus,
  TrustEventType,
  TrustPenaltyType,
  TrustRank,
} from "@calltest/shared-types";

describe("Trust Engine: Profile, Score, Bounds, and Recovery", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Initial Uncertainty Condition", () => {
    it("should initialize a new user with trustScore = 50 and trustRank = NEW", async () => {
      vi.spyOn(prisma.trustProfile, "findUnique").mockResolvedValue(null);
      vi.spyOn(prisma.trustProfile, "create").mockResolvedValue({
        id: "prof-1",
        userId: "user-new",
        trustScore: 50,
        trustRank: TrustRank.NEW,
        reputationStatus: ReputationStatus.NORMAL,
        completedCampaignsCount: 0,
        abandonedCampaignsCount: 0,
        consecutiveGoodCampaigns: 0,
      } as any);

      const profile = await TrustProfileService.getOrCreateProfile("user-new");

      expect(profile.trustScore).toBe(50);
      expect(profile.trustRank).toBe(TrustRank.NEW);
      expect(profile.reputationStatus).toBe(ReputationStatus.NORMAL);
    });
  });

  describe("Multi-Signal Trust Progression & Bounds", () => {
    it("should increase trust score on validated missions and completed campaigns", async () => {
      vi.spyOn(TrustProfileService, "getOrCreateProfile").mockResolvedValue({
        id: "prof-1",
        userId: "user-good",
        trustScore: 50,
        trustRank: TrustRank.NEW,
        reputationStatus: ReputationStatus.NORMAL,
      } as any);

      vi.spyOn(FraudScoreService, "calculateFraudScore").mockResolvedValue({
        userId: "user-good",
        fraudScore: 0,
        unresolvedEventsCount: 0,
        criticalEventsCount: 0,
        highestSeverity: null,
        recommendedStatus: ReputationStatus.NORMAL,
      });

      // 3 completed campaigns, 10 validated missions, 2 useful feedbacks
      vi.spyOn(prisma.campaignTester, "findMany").mockResolvedValue([
        { status: TesterStatus.COMPLETED, isReplacement: false },
        { status: TesterStatus.COMPLETED, isReplacement: false },
        { status: TesterStatus.COMPLETED, isReplacement: false },
      ] as any);
      vi.spyOn(prisma.missionAttempt, "count").mockResolvedValue(10);
      vi.spyOn(prisma.feedback, "count").mockResolvedValue(2);
      vi.spyOn(prisma.trustPenalty, "findMany").mockResolvedValue([]);

      vi.spyOn(prisma, "$transaction").mockImplementation(async (cb: any) => {
        const txMock = {
          trustProfile: { update: vi.fn() },
          user: { update: vi.fn() },
          trustHistory: { create: vi.fn() },
        };
        return cb(txMock);
      });
      vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

      const result = await TrustScoreService.recalculateAndPersist({
        userId: "user-good",
        eventType: TrustEventType.CAMPAIGN_COMPLETED,
        reason: "Campaign completed with distinction",
      });

      // Base 50 + 10 (missions) + 15 (campaigns) + 4 (feedback) = 79
      expect(result.trustScore).toBe(79);
      expect(result.trustRank).toBe(TrustRank.RELIABLE);
      expect(result.completedCampaignsCount).toBe(3);
    });

    it("SCORE BOUNDARIES: should never exceed 100 or drop below 0", async () => {
      vi.spyOn(TrustProfileService, "getOrCreateProfile").mockResolvedValue({
        id: "prof-1",
        userId: "user-boundary",
        trustScore: 50,
        trustRank: TrustRank.NEW,
        reputationStatus: ReputationStatus.NORMAL,
      } as any);

      vi.spyOn(FraudScoreService, "calculateFraudScore").mockResolvedValue({
        userId: "user-boundary",
        fraudScore: 0,
        unresolvedEventsCount: 0,
        criticalEventsCount: 0,
        highestSeverity: null,
        recommendedStatus: ReputationStatus.NORMAL,
      });

      // Extreme positive metrics (20 missions, 10 campaigns, 10 feedbacks)
      vi.spyOn(prisma.campaignTester, "findMany").mockResolvedValue(
        Array.from({ length: 10 }, () => ({ status: TesterStatus.COMPLETED, isReplacement: false })) as any,
      );
      vi.spyOn(prisma.missionAttempt, "count").mockResolvedValue(20);
      vi.spyOn(prisma.feedback, "count").mockResolvedValue(10);
      vi.spyOn(prisma.trustPenalty, "findMany").mockResolvedValue([]);

      vi.spyOn(prisma, "$transaction").mockImplementation(async (cb: any) => {
        const txMock = {
          trustProfile: { update: vi.fn() },
          user: { update: vi.fn() },
          trustHistory: { create: vi.fn() },
        };
        return cb(txMock);
      });
      vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

      const maxResult = await TrustScoreService.recalculateAndPersist({
        userId: "user-boundary",
        eventType: TrustEventType.CAMPAIGN_COMPLETED,
        reason: "Max score boundary test",
      });

      expect(maxResult.trustScore).toBeLessThanOrEqual(100);
      expect(maxResult.trustRank).toBe(TrustRank.EXCELLENT);

      // Extreme negative metrics (10 abandonments, heavy penalties)
      vi.spyOn(prisma.campaignTester, "findMany").mockResolvedValue(
        Array.from({ length: 10 }, () => ({ status: TesterStatus.ABANDONED, isReplacement: false })) as any,
      );
      vi.spyOn(prisma.missionAttempt, "count").mockResolvedValue(0);
      vi.spyOn(prisma.feedback, "count").mockResolvedValue(0);
      vi.spyOn(prisma.trustPenalty, "findMany").mockResolvedValue([
        { scoreImpact: 50 },
        { scoreImpact: 50 },
      ] as any);

      const minResult = await TrustScoreService.recalculateAndPersist({
        userId: "user-boundary",
        eventType: TrustEventType.PENALTY_APPLIED,
        reason: "Min score boundary test",
      });

      expect(minResult.trustScore).toBe(0);
      expect(minResult.trustRank).toBe(TrustRank.RESTRICTED);
    });
  });

  describe("Trust Penalties & Idempotency", () => {
    it("should apply penalties idempotently without duplicate deductions", async () => {
      vi.spyOn(prisma.trustPenalty, "findUnique").mockResolvedValueOnce(null).mockResolvedValueOnce({
        id: "pen-1",
        userId: "user-pen",
        idempotencyKey: "idem-pen-1",
      } as any);

      vi.spyOn(prisma, "$transaction").mockImplementation(async (cb: any) => {
        const txMock = {
          trustPenalty: {
            create: vi.fn().mockResolvedValue({
              id: "pen-1",
              userId: "user-pen",
              scoreImpact: 15,
            }),
          },
        };
        return cb(txMock);
      });

      vi.spyOn(TrustScoreService, "recalculateAndPersist").mockResolvedValue({} as any);
      vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

      // First call -> creates penalty
      const firstCall = await TrustPenaltyService.applyPenalty({
        userId: "user-pen",
        type: TrustPenaltyType.CAMPAIGN_ABANDONMENT,
        severity: FraudSeverity.MEDIUM,
        scoreImpact: 15,
        reason: "Left campaign without completing required missions",
        idempotencyKey: "idem-pen-1",
      });
      expect(firstCall).toBeDefined();

      // Second call with same key -> skips creation
      const secondCall = await TrustPenaltyService.applyPenalty({
        userId: "user-pen",
        type: TrustPenaltyType.CAMPAIGN_ABANDONMENT,
        severity: FraudSeverity.MEDIUM,
        scoreImpact: 15,
        reason: "Left campaign without completing required missions",
        idempotencyKey: "idem-pen-1",
      });
      expect(secondCall.id).toBe("pen-1");
    });
  });

  describe("Gradual Recovery", () => {
    it("should grant gradual recovery bonus on sustained good conduct without active fraud", async () => {
      vi.spyOn(prisma.trustProfile, "findUnique").mockResolvedValue({
        id: "prof-1",
        userId: "user-recover",
        trustScore: 40,
        trustRank: TrustRank.RESTRICTED,
      } as any);

      vi.spyOn(FraudScoreService, "calculateFraudScore").mockResolvedValue({
        userId: "user-recover",
        fraudScore: 0,
        unresolvedEventsCount: 0,
        criticalEventsCount: 0,
        highestSeverity: null,
        recommendedStatus: ReputationStatus.NORMAL,
      });

      vi.spyOn(prisma.campaignTester, "findMany").mockResolvedValue([
        { status: TesterStatus.COMPLETED, activityScore: 85 },
        { status: TesterStatus.COMPLETED, activityScore: 80 },
      ] as any);
      vi.spyOn(prisma.missionAttempt, "count").mockResolvedValue(6);
      vi.spyOn(prisma.trustProfile, "update").mockResolvedValue({} as any);
      vi.spyOn(TrustScoreService, "recalculateAndPersist").mockResolvedValue({} as any);
      vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

      const recovery = await TrustRecoveryService.evaluateAndApplyRecovery("user-recover");

      expect(recovery.recovered).toBe(true);
      expect(recovery.recoveryBonus).toBe(10);
    });

    it("should NOT recover if unresolved fraud events exist", async () => {
      vi.spyOn(prisma.trustProfile, "findUnique").mockResolvedValue({
        id: "prof-1",
        userId: "user-fraudster",
      } as any);

      vi.spyOn(FraudScoreService, "calculateFraudScore").mockResolvedValue({
        userId: "user-fraudster",
        fraudScore: 50,
        unresolvedEventsCount: 2,
        criticalEventsCount: 0,
        highestSeverity: FraudSeverity.HIGH,
        recommendedStatus: ReputationStatus.RESTRICTED,
      });

      const recovery = await TrustRecoveryService.evaluateAndApplyRecovery("user-fraudster");

      expect(recovery.recovered).toBe(false);
      expect(recovery.reason).toContain("unresolved fraud");
    });
  });
});
