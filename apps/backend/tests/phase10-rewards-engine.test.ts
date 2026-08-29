import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/core/database/prisma.js";
import {
  RewardSource,
  RewardStatus,
  RewardType,
  UserRole,
  UserStatus,
} from "@calltest/shared-types";
import { RewardService } from "../src/modules/rewards/service.js";

describe("Phase 10: Rewards Engine, XP, Gold & Anti-Abuse", () => {
  const app = buildApp();

  const tester1Id = "10000000-0000-0000-0000-000000000001";
  const suspendedTesterId = "20000000-0000-0000-0000-000000000002";
  const campaignAId = "c0000000-0000-0000-0000-000000000001";
  const mission1Id = "m0000000-0000-0000-0000-000000000001";
  const attempt1Id = "a1111111-0000-0000-0000-000000000001";

  let tester1Token: string;

  beforeAll(async () => {
    await app.ready();
    tester1Token = app.jwt.sign({ sub: tester1Id, email: "tester1@calltest.com", role: UserRole.TESTER });
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("1. XP & Gold Award Calculation", () => {
    it("should grant 10 XP and 2 Gold for a validated mission attempt", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: tester1Id,
        status: UserStatus.ACTIVE,
        xpBalance: 50,
        goldBalance: 10,
      } as any);

      vi.spyOn(prisma.reward, "findFirst").mockResolvedValue(null);
      const userUpdateSpy = vi.spyOn(prisma.user, "update").mockResolvedValue({} as any);
      vi.spyOn(prisma.reward, "create").mockResolvedValue({
        id: "rew-1",
        userId: tester1Id,
        type: RewardType.XP,
        amount: 10,
        source: RewardSource.MISSION_VALIDATED,
        sourceId: attempt1Id,
        createdAt: new Date(),
      } as any);
      vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

      const reward = await RewardService.processReward({
        userId: tester1Id,
        campaignId: campaignAId,
        missionId: mission1Id,
        sourceType: RewardSource.MISSION_VALIDATED,
        sourceId: attempt1Id,
        reason: "Mission validated successfully",
      });

      expect(reward.xpAmount).toBe(10);
      expect(reward.goldAmount).toBe(2);
      expect(userUpdateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: tester1Id },
          data: {
            xpBalance: { increment: 10 },
            goldBalance: { increment: 2 },
          },
        }),
      );
    });

    it("should grant 5 XP and 1 Gold for useful qualitative feedback", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: tester1Id,
        status: UserStatus.ACTIVE,
        xpBalance: 60,
        goldBalance: 12,
      } as any);

      vi.spyOn(prisma.reward, "findFirst").mockResolvedValue(null);
      const userUpdateSpy = vi.spyOn(prisma.user, "update").mockResolvedValue({} as any);
      vi.spyOn(prisma.reward, "create").mockResolvedValue({
        id: "rew-2",
        userId: tester1Id,
        type: RewardType.XP,
        amount: 5,
        source: RewardSource.FEEDBACK_SUBMITTED,
        sourceId: "fb-1",
        createdAt: new Date(),
      } as any);
      vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

      const reward = await RewardService.processReward({
        userId: tester1Id,
        campaignId: campaignAId,
        missionId: mission1Id,
        sourceType: RewardSource.FEEDBACK_SUBMITTED,
        sourceId: "fb-1",
        reason: "Qualitative feedback submitted",
      });

      expect(reward.xpAmount).toBe(5);
      expect(reward.goldAmount).toBe(1);
      expect(userUpdateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            xpBalance: { increment: 5 },
            goldBalance: { increment: 1 },
          },
        }),
      );
    });

    it("should grant 25 XP and 5 Gold for 2-day valid replacement completion without penalty", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: tester1Id,
        status: UserStatus.ACTIVE,
        xpBalance: 100,
        goldBalance: 20,
      } as any);

      vi.spyOn(prisma.reward, "findFirst").mockResolvedValue(null);
      const userUpdateSpy = vi.spyOn(prisma.user, "update").mockResolvedValue({} as any);
      vi.spyOn(prisma.reward, "create").mockResolvedValue({
        id: "rew-3",
        userId: tester1Id,
        type: RewardType.XP,
        amount: 25,
        source: RewardSource.CAMPAIGN_PARTICIPATION_COMPLETED,
        sourceId: "ct-rep-1",
        createdAt: new Date(),
      } as any);
      vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

      const reward = await RewardService.processReward({
        userId: tester1Id,
        campaignId: campaignAId,
        sourceType: RewardSource.CAMPAIGN_PARTICIPATION_COMPLETED,
        sourceId: "ct-rep-1",
        reason: "Replacement participation completed",
      });

      expect(reward.xpAmount).toBe(25);
      expect(reward.goldAmount).toBe(5);
      expect(userUpdateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            xpBalance: { increment: 25 },
            goldBalance: { increment: 5 },
          },
        }),
      );
    });
  });

  describe("2. Strict Idempotency & Duplicate Prevention", () => {
    it("should not double-award Gold or XP when receiving duplicate events", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: tester1Id,
        status: UserStatus.ACTIVE,
      } as any);

      // Existing reward record already present in DB
      vi.spyOn(prisma.reward, "findFirst").mockResolvedValue({
        id: "rew-existing",
        userId: tester1Id,
        source: RewardSource.MISSION_VALIDATED,
        sourceId: attempt1Id,
        amount: 10,
      } as any);

      const userUpdateSpy = vi.spyOn(prisma.user, "update");
      const rewardCreateSpy = vi.spyOn(prisma.reward, "create");

      const duplicateCall = await RewardService.processReward({
        userId: tester1Id,
        campaignId: campaignAId,
        sourceType: RewardSource.MISSION_VALIDATED,
        sourceId: attempt1Id,
        reason: "Duplicate event trigger",
      });

      expect(duplicateCall.id).toBe("rew-existing");
      // No duplicate creation or balance updates
      expect(rewardCreateSpy).not.toHaveBeenCalled();
      expect(userUpdateSpy).not.toHaveBeenCalled();
    });
  });

  describe("3. Anti-Abuse & Fraud Guards", () => {
    it("should block granting rewards to suspended or banned testers", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: suspendedTesterId,
        status: UserStatus.SUSPENDED,
      } as any);

      await expect(
        RewardService.processReward({
          userId: suspendedTesterId,
          campaignId: campaignAId,
          sourceType: RewardSource.MISSION_VALIDATED,
          sourceId: attempt1Id,
          reason: "Suspended user attempt",
        }),
      ).rejects.toThrow(/status 'SUSPENDED'/i);
    });
  });

  describe("4. Pending vs Approved Rewards Lifecycle", () => {
    it("should hold reward in PENDING state and only increment balance when approved", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: tester1Id,
        status: UserStatus.ACTIVE,
      } as any);

      vi.spyOn(prisma.reward, "findFirst").mockResolvedValue(null);
      const userUpdateSpy = vi.spyOn(prisma.user, "update").mockResolvedValue({} as any);
      vi.spyOn(prisma.reward, "create").mockResolvedValue({
        id: "rew-pending-1",
        userId: tester1Id,
        type: RewardType.XP,
        amount: 10,
        source: RewardSource.MISSION_VALIDATED,
        sourceId: attempt1Id,
      } as any);
      vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

      // 1. Process as PENDING
      const pendingReward = await RewardService.processReward({
        userId: tester1Id,
        sourceType: RewardSource.MISSION_VALIDATED,
        sourceId: attempt1Id,
        reason: "Evidence awaiting developer review",
        status: RewardStatus.PENDING,
      });

      expect(pendingReward.status).toBe(RewardStatus.PENDING);
      // Balance NOT incremented yet
      expect(userUpdateSpy).not.toHaveBeenCalled();

      // 2. Approve Pending Reward
      vi.spyOn(prisma.reward, "findUnique").mockResolvedValue({
        id: "rew-pending-1",
        userId: tester1Id,
        amount: 10,
      } as any);

      await RewardService.approvePendingReward("rew-pending-1", "dev-1", UserRole.DEVELOPER);

      // Balance now incremented
      expect(userUpdateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: tester1Id },
          data: {
            xpBalance: { increment: 10 },
            goldBalance: { increment: 2 },
          },
        }),
      );
    });
  });

  describe("5. REST API Endpoints (/me/rewards & /me/rewards/history)", () => {
    it("GET /me/rewards should return user's total XP, Gold, and recent ledger", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: tester1Id,
        role: UserRole.TESTER,
        status: UserStatus.ACTIVE,
        xpBalance: 120,
        goldBalance: 24,
      } as any);

      vi.spyOn(prisma.missionAttempt, "count").mockResolvedValue(6);
      vi.spyOn(prisma.campaignTester, "count").mockResolvedValue(1);
      vi.spyOn(prisma.reward, "findMany").mockResolvedValue([
        {
          id: "rew-1",
          userId: tester1Id,
          source: RewardSource.MISSION_VALIDATED,
          sourceId: "att-1",
          type: RewardType.XP,
          amount: 10,
          createdAt: new Date(),
        } as any,
      ]);

      const response = await app.inject({
        method: "GET",
        url: "/me/rewards",
        headers: { authorization: `Bearer ${tester1Token}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.totalXp).toBe(120);
      expect(body.totalGold).toBe(24);
      expect(body.completedMissionsCount).toBe(6);
      expect(body.recentRewards.length).toBe(1);
    });

    it("GET /me/rewards/history should return paginated reward history", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: tester1Id,
        role: UserRole.TESTER,
        status: UserStatus.ACTIVE,
      } as any);

      vi.spyOn(prisma.reward, "count").mockResolvedValue(1);
      vi.spyOn(prisma.reward, "findMany").mockResolvedValue([
        {
          id: "rew-1",
          userId: tester1Id,
          source: RewardSource.MISSION_VALIDATED,
          sourceId: "att-1",
          type: RewardType.XP,
          amount: 10,
          createdAt: new Date(),
        } as any,
      ]);

      const response = await app.inject({
        method: "GET",
        url: "/me/rewards/history?page=1&limit=10",
        headers: { authorization: `Bearer ${tester1Token}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.total).toBe(1);
      expect(body.page).toBe(1);
      expect(body.items.length).toBe(1);
    });
  });
});
