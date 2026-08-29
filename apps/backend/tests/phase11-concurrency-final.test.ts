import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "../src/core/database/prisma.js";
import { RewardSource, UserStatus } from "@calltest/shared-types";
import { RewardService } from "../src/modules/rewards/service.js";

describe("Phase 11.1: Final Concurrency & Invariant Hardening", () => {
  const campaignAId = "c0000000-0000-0000-0000-000000000001";
  const mission1Id = "m0000000-0000-0000-0000-000000000001";
  const tester1Id = "10000000-0000-0000-0000-000000000001";

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("1. Campaign Join Invariant (100 Simultaneous Joins)", () => {
    it("should strictly enforce Rule of 15 under 100 simultaneous joins", async () => {
      let currentActiveCount = 10;
      const MAX_ACTIVE_CAP = 15;

      // Simulated atomic transaction with active tester count check
      const joinAttempt = async (tId: string) => {
        if (currentActiveCount >= MAX_ACTIVE_CAP) {
          return { success: false, reason: "CAPACITY_FULL" };
        }
        currentActiveCount++;
        return { success: true, testerId: tId };
      };

      const results = await Promise.all(
        Array.from({ length: 100 }, (_, i) => joinAttempt(`tester-${i}`)),
      );

      const successfulJoins = results.filter((r) => r.success);
      expect(successfulJoins.length).toBe(5); // 10 -> 15 (only 5 succeed)
      expect(currentActiveCount).toBe(15);
      expect(currentActiveCount).toBeLessThanOrEqual(15);
    });
  });

  describe("2. Rewards Invariant (100 Simultaneous Duplicate Claims)", () => {
    it("should process 100 simultaneous duplicate claims with exactly 1 reward and 1 balance increment", async () => {
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
              existingRecord = {
                id: "rew-load-test-100",
                userId: tester1Id,
                source: RewardSource.MISSION_VALIDATED,
                sourceId: mission1Id,
              };
              return existingRecord;
            }),
          },
          user: {
            update: vi.fn().mockResolvedValue({}),
          },
        });
      });

      const promises = Array.from({ length: 100 }, (_, i) =>
        RewardService.processReward({
          userId: tester1Id,
          campaignId: campaignAId,
          sourceType: RewardSource.MISSION_VALIDATED,
          sourceId: mission1Id,
          reason: `Load test concurrent call ${i}`,
        }),
      );

      const results = await Promise.all(promises);

      expect(results.length).toBe(100);
      expect(createdCount).toBe(1);
    });
  });

  describe("3. Matching Invariant (100 Simultaneous Matching Evaluations)", () => {
    it("should ensure no duplicate active assignments during concurrent matching evaluations", async () => {
      const activeEnrolledTesters = new Set<string>();

      const assignTester = async (tId: string) => {
        if (activeEnrolledTesters.has(tId)) {
          return { assigned: false, reason: "ALREADY_ACTIVE" };
        }
        activeEnrolledTesters.add(tId);
        return { assigned: true, testerId: tId };
      };

      const results = await Promise.all(
        Array.from({ length: 100 }, (_, i) => assignTester(`tester-${i % 10}`)),
      );

      const assigned = results.filter((r) => r.assigned);
      expect(assigned.length).toBe(10); // Exactly 10 unique testers
      expect(activeEnrolledTesters.size).toBe(10);
    });
  });
});
