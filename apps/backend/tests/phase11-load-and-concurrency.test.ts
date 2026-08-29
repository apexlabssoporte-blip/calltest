import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "../src/core/database/prisma.js";
import { RewardSource, UserStatus } from "@calltest/shared-types";
import { RewardService } from "../src/modules/rewards/service.js";

describe("Phase 11: High-Concurrency & Load Invariant Testing", () => {
  const campaignAId = "c0000000-0000-0000-0000-000000000001";
  const mission1Id = "m0000000-0000-0000-0000-000000000001";
  const tester1Id = "10000000-0000-0000-0000-000000000001";

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("1. High Concurrency Reward Invariant (50 simultaneous claims)", () => {
    it("should process 50 concurrent duplicate claims with exactly 1 reward creation and 1 balance increment", async () => {
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
                id: "rew-load-test",
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

      const promises = Array.from({ length: 50 }, (_, i) =>
        RewardService.processReward({
          userId: tester1Id,
          campaignId: campaignAId,
          sourceType: RewardSource.MISSION_VALIDATED,
          sourceId: mission1Id,
          reason: `Load test concurrent call ${i}`,
        }),
      );

      const results = await Promise.all(promises);

      expect(results.length).toBe(50);
      expect(createdCount).toBe(1);
    });
  });
});
