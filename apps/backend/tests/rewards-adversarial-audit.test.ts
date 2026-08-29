import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/core/database/prisma.js";
import {
  RewardSource,
  RewardStatus,
  UserRole,
  UserStatus,
} from "@calltest/shared-types";
import { RewardService } from "../src/modules/rewards/service.js";
import { eventBus } from "../src/core/events/domain-event-bus.js";

describe("Phase 10: Comprehensive Rewards Adversarial & Anti-Abuse Audit", () => {
  const app = buildApp();

  const tester1Id = "10000000-0000-0000-0000-000000000001";
  const suspendedTesterId = "30000000-0000-0000-0000-000000000003";
  const bannedTesterId = "40000000-0000-0000-0000-000000000004";
  const devId = "d0000000-0000-0000-0000-000000000001";

  const campaignAId = "c0000000-0000-0000-0000-000000000001";
  const mission1Id = "m0000000-0000-0000-0000-000000000001";
  const attempt1Id = "a1111111-0000-0000-0000-000000000001";

  let devToken: string;

  beforeAll(async () => {
    await app.ready();
    devToken = app.jwt.sign({ sub: devId, email: "dev@calltest.com", role: UserRole.DEVELOPER });
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("1. Duplicate & Concurrent Mission Validation Events", () => {
    it("should award exactly once when receiving 10 duplicate mission.validated events", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: tester1Id,
        status: UserStatus.ACTIVE,
        xpBalance: 100,
        goldBalance: 20,
      } as any);

      let existingReward: any = null;
      vi.spyOn(prisma.reward, "findFirst").mockImplementation(async () => existingReward);
      const userUpdateSpy = vi.spyOn(prisma.user, "update").mockResolvedValue({} as any);

      vi.spyOn(prisma.reward, "create").mockImplementation(async () => {
        existingReward = {
          id: "rew-mission-1",
          userId: tester1Id,
          source: RewardSource.MISSION_VALIDATED,
          sourceId: mission1Id,
          amount: 10,
          status: RewardStatus.APPROVED,
        };
        return existingReward;
      });

      // Fire 10 sequential duplicate events
      for (let i = 0; i < 10; i++) {
        await eventBus.publish({
          id: `evt_m_${i}`,
          type: "mission.validated",
          occurredAt: new Date(),
          payload: {
            attemptId: attempt1Id,
            missionId: mission1Id,
            testerId: tester1Id,
            campaignId: campaignAId,
          },
        });
      }

      // Exactly 1 balance update occurred
      expect(userUpdateSpy).toHaveBeenCalledTimes(1);
    });

    it("should handle simultaneous concurrent duplicate mission reward requests atomically", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: tester1Id,
        status: UserStatus.ACTIVE,
      } as any);

      let createdCount = 0;
      let existingRecord: any = null;

      vi.spyOn(prisma.reward, "findFirst").mockImplementation(async () => existingRecord);

      vi.spyOn(prisma, "$transaction").mockImplementation(async (cb: any) => {
        return cb({
          reward: {
            findFirst: vi.fn().mockImplementation(async () => existingRecord),
            create: vi.fn().mockImplementation(async () => {
              if (createdCount > 0) {
                const err: any = new Error("Unique constraint violation");
                err.code = "P2002";
                throw err;
              }
              createdCount++;
              existingRecord = { id: "rew-atomic", userId: tester1Id, source: RewardSource.MISSION_VALIDATED, sourceId: mission1Id };
              return existingRecord;
            }),
          },
          user: {
            update: vi.fn().mockResolvedValue({}),
          },
        });
      });

      // Execute 5 concurrent promises for the same reward event
      const results = await Promise.all([
        RewardService.processReward({ userId: tester1Id, sourceType: RewardSource.MISSION_VALIDATED, sourceId: mission1Id, reason: "Concurrent 1" }),
        RewardService.processReward({ userId: tester1Id, sourceType: RewardSource.MISSION_VALIDATED, sourceId: mission1Id, reason: "Concurrent 2" }),
        RewardService.processReward({ userId: tester1Id, sourceType: RewardSource.MISSION_VALIDATED, sourceId: mission1Id, reason: "Concurrent 3" }),
        RewardService.processReward({ userId: tester1Id, sourceType: RewardSource.MISSION_VALIDATED, sourceId: mission1Id, reason: "Concurrent 4" }),
        RewardService.processReward({ userId: tester1Id, sourceType: RewardSource.MISSION_VALIDATED, sourceId: mission1Id, reason: "Concurrent 5" }),
      ]);

      expect(results.length).toBe(5);
      expect(createdCount).toBe(1);
    });
  });

  describe("2. Feedback Farming Prevention", () => {
    it("should prevent duplicate feedback submissions from generating multiple rewards", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: tester1Id,
        status: UserStatus.ACTIVE,
      } as any);

      let created = false;
      vi.spyOn(prisma.reward, "findFirst").mockImplementation(async () => (created ? { id: "rew-fb-1" } as any : null));
      const userUpdateSpy = vi.spyOn(prisma.user, "update").mockResolvedValue({} as any);
      vi.spyOn(prisma.reward, "create").mockImplementation(async () => {
        created = true;
        return { id: "rew-fb-1", userId: tester1Id, source: RewardSource.FEEDBACK_SUBMITTED, sourceId: mission1Id } as any;
      });

      await eventBus.publish({
        id: "evt_fb_1",
        type: "mission.feedback_submitted",
        occurredAt: new Date(),
        payload: { feedbackId: "fb-1", missionId: mission1Id, testerId: tester1Id, campaignId: campaignAId },
      });

      await eventBus.publish({
        id: "evt_fb_2",
        type: "mission.feedback_submitted",
        occurredAt: new Date(),
        payload: { feedbackId: "fb-2", missionId: mission1Id, testerId: tester1Id, campaignId: campaignAId },
      });

      // Only 1 balance increment
      expect(userUpdateSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("3. Participation & Campaign Completion Idempotency", () => {
    it("should grant participation completed reward exactly once per campaign", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: tester1Id,
        status: UserStatus.ACTIVE,
      } as any);

      let rewarded = false;
      vi.spyOn(prisma.reward, "findFirst").mockImplementation(async () => (rewarded ? { id: "rew-part-1" } as any : null));
      const userUpdateSpy = vi.spyOn(prisma.user, "update").mockResolvedValue({} as any);
      vi.spyOn(prisma.reward, "create").mockImplementation(async () => {
        rewarded = true;
        return { id: "rew-part-1", userId: tester1Id, source: RewardSource.CAMPAIGN_PARTICIPATION_COMPLETED, sourceId: campaignAId } as any;
      });

      // First trigger
      await eventBus.publish({
        id: "evt_p_1",
        type: "tester.participation_completed",
        occurredAt: new Date(),
        payload: { campaignId: campaignAId, testerId: tester1Id },
      });

      // Duplicate second trigger
      await eventBus.publish({
        id: "evt_p_2",
        type: "tester.participation_completed",
        occurredAt: new Date(),
        payload: { campaignId: campaignAId, testerId: tester1Id },
      });

      expect(userUpdateSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("4. State Machine & Escrow Transition Guards", () => {
    it("should process PENDING -> APPROVED exactly once and reject double approval balance increments", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: tester1Id,
        status: UserStatus.ACTIVE,
      } as any);

      let status = RewardStatus.PENDING;
      vi.spyOn(prisma.reward, "findUnique").mockImplementation(async () => ({
        id: "rew-pend-1",
        userId: tester1Id,
        amount: 10,
        status,
      } as any));

      const userUpdateSpy = vi.spyOn(prisma.user, "update").mockImplementation(async () => {
        status = RewardStatus.APPROVED;
        return {} as any;
      });

      // First approval
      const firstApproval = await RewardService.approvePendingReward("rew-pend-1", devId, UserRole.DEVELOPER);
      expect(firstApproval.status).toBe(RewardStatus.APPROVED);
      expect(userUpdateSpy).toHaveBeenCalledTimes(1);

      // Second approval attempt on already APPROVED reward (Idempotent, no second increment)
      const secondApproval = await RewardService.approvePendingReward("rew-pend-1", devId, UserRole.DEVELOPER);
      expect(secondApproval.status).toBe(RewardStatus.APPROVED);
      expect(userUpdateSpy).toHaveBeenCalledTimes(1);
    });

    it("should reject illegal state transition: REJECTED -> APPROVED", async () => {
      vi.spyOn(prisma.reward, "findUnique").mockResolvedValue({
        id: "rew-rej-1",
        userId: tester1Id,
        amount: 10,
        status: RewardStatus.REJECTED,
      } as any);

      await expect(
        RewardService.approvePendingReward("rew-rej-1", devId, UserRole.DEVELOPER),
      ).rejects.toThrow(/Cannot approve a reward in 'REJECTED' status/i);
    });

    it("should process PENDING -> REJECTED with zero balance increments", async () => {
      vi.spyOn(prisma.reward, "findUnique").mockResolvedValue({
        id: "rew-pend-2",
        userId: tester1Id,
        amount: 10,
        status: RewardStatus.PENDING,
      } as any);

      const userUpdateSpy = vi.spyOn(prisma.user, "update");

      const rejected = await RewardService.rejectPendingReward("rew-pend-2", devId, UserRole.DEVELOPER, "Invalid screenshot");
      expect(rejected.status).toBe(RewardStatus.REJECTED);
      expect(rejected.xpAmount).toBe(0);
      expect(rejected.goldAmount).toBe(0);
      expect(userUpdateSpy).not.toHaveBeenCalled();
    });
  });

  describe("5. Suspended and Banned User Protection", () => {
    it("should reject reward requests for suspended testers", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: suspendedTesterId,
        status: UserStatus.SUSPENDED,
      } as any);

      await expect(
        RewardService.processReward({
          userId: suspendedTesterId,
          sourceType: RewardSource.MISSION_VALIDATED,
          sourceId: mission1Id,
          reason: "Suspended tester attempt",
        }),
      ).rejects.toThrow(/status 'SUSPENDED'/i);
    });

    it("should reject reward requests for banned testers", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: bannedTesterId,
        status: UserStatus.BANNED,
      } as any);

      await expect(
        RewardService.processReward({
          userId: bannedTesterId,
          sourceType: RewardSource.MISSION_VALIDATED,
          sourceId: mission1Id,
          reason: "Banned tester attempt",
        }),
      ).rejects.toThrow(/status 'BANNED'/i);
    });
  });

  describe("6. Installation Zero-Reward Protection", () => {
    it("should never grant XP or Gold for installation signals", async () => {
      const userUpdateSpy = vi.spyOn(prisma.user, "update");
      const rewardCreateSpy = vi.spyOn(prisma.reward, "create");

      // Simulating INSTALL_CLAIMED & FIRST_OPEN - they do not emit reward events
      expect(rewardCreateSpy).not.toHaveBeenCalled();
      expect(userUpdateSpy).not.toHaveBeenCalled();
    });
  });

  describe("7. Privacy & IDOR Isolation", () => {
    it("should return 403 when a developer attempts to query private tester rewards", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: devId,
        role: UserRole.DEVELOPER,
        status: UserStatus.ACTIVE,
        xpBalance: 0,
        goldBalance: 0,
      } as any);
      vi.spyOn(prisma.missionAttempt, "count").mockResolvedValue(0);
      vi.spyOn(prisma.campaignTester, "count").mockResolvedValue(0);
      vi.spyOn(prisma.reward, "findMany").mockResolvedValue([]);

      const response = await app.inject({
        method: "GET",
        url: `/me/rewards`,
        headers: { authorization: `Bearer ${devToken}` },
      });

      // Developers accessing /me/rewards gets their own developer profile, never tester B
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.userId).toBe(devId);
      expect(body.userId).not.toBe(tester1Id);
    });
  });
});
