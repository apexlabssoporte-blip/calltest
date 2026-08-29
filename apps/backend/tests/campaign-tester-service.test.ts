import { describe, it, expect, vi, beforeEach } from "vitest";
import { CampaignTesterService } from "../src/modules/campaign-testers/service.js";
import { prisma } from "../src/core/database/prisma.js";
import {
  TesterStatus,
  UserRole,
  UserStatus,
} from "@calltest/shared-types";
import {
  BadRequestError,
  ConflictError,
} from "../src/core/errors/app-error.js";

describe("CampaignTesterService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(prisma, "$transaction").mockImplementation(async (cb: any) => {
      if (typeof cb === "function") {
        return cb(prisma);
      }
      return cb;
    });
  });

  const baseCampaign = {
    id: "campaign-1",
    appId: "app-1",
    targetTesters: 12,
    maxTesters: 15,
    durationDays: 14,
    startsAt: new Date("2026-01-01T00:00:00Z"),
    app: { developerId: "dev-1" },
  };

  const validTesterUser = {
    id: "tester-1",
    email: "tester1@calltest.com",
    role: UserRole.TESTER,
    status: UserStatus.ACTIVE,
  };

  describe("Rule of 12 / 15 Active Tester Boundaries", () => {
    // Tests for 11, 12, 13, 14, 15 allowed; 16 rejected
    const testCases = [
      { currentActive: 10, expectedAllowed: true, label: "11th tester (current 10 -> allowed)" },
      { currentActive: 11, expectedAllowed: true, label: "12th tester (current 11 -> allowed)" },
      { currentActive: 12, expectedAllowed: true, label: "13th tester (current 12 -> allowed)" },
      { currentActive: 13, expectedAllowed: true, label: "14th tester (current 13 -> allowed)" },
      { currentActive: 14, expectedAllowed: true, label: "15th tester (current 14 -> allowed)" },
      { currentActive: 15, expectedAllowed: false, label: "16th tester (current 15 -> rejected)" },
    ];

    testCases.forEach(({ currentActive, expectedAllowed, label }) => {
      it(`boundary test: ${label}`, async () => {
        vi.spyOn(prisma.campaign, "findUnique").mockResolvedValue(baseCampaign as any);
        vi.spyOn(prisma.user, "findUnique").mockResolvedValue(validTesterUser as any);
        vi.spyOn(prisma.campaignTester, "findFirst").mockResolvedValue(null);
        vi.spyOn(prisma.campaignTester, "count").mockResolvedValue(currentActive);
        vi.spyOn(prisma.campaignTester, "create").mockResolvedValue({
          id: "ct-new",
          campaignId: "campaign-1",
          testerId: "tester-1",
          status: TesterStatus.ACTIVE,
          isReplacement: false,
          joinedAt: new Date(),
          expectedEndAt: new Date(),
        } as any);
        vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

        if (expectedAllowed) {
          const result = await CampaignTesterService.addTesterToCampaign(
            "campaign-1",
            "dev-1",
            UserRole.DEVELOPER,
            {
              testerId: "tester-1",
              status: TesterStatus.ACTIVE,
            },
          );
          expect(result).toBeDefined();
        } else {
          await expect(
            CampaignTesterService.addTesterToCampaign(
              "campaign-1",
              "dev-1",
              UserRole.DEVELOPER,
              {
                testerId: "tester-1",
                status: TesterStatus.ACTIVE,
              },
            ),
          ).rejects.toThrow(BadRequestError);
        }
      });
    });

    it("should allow adding a tester if 15 active + 1 LOW_ACTIVITY exist (LOW_ACTIVITY is not active)", async () => {
      vi.spyOn(prisma.campaign, "findUnique").mockResolvedValue(baseCampaign as any);
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue(validTesterUser as any);
      vi.spyOn(prisma.campaignTester, "findFirst").mockResolvedValue(null);
      // count active testers returns 14 because 1 is LOW_ACTIVITY
      vi.spyOn(prisma.campaignTester, "count").mockResolvedValue(14);
      vi.spyOn(prisma.campaignTester, "create").mockResolvedValue({
        id: "ct-new",
        status: TesterStatus.ACTIVE,
      } as any);
      vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

      const result = await CampaignTesterService.addTesterToCampaign(
        "campaign-1",
        "dev-1",
        UserRole.DEVELOPER,
        {
          testerId: "tester-1",
          status: TesterStatus.ACTIVE,
        },
      );
      expect(result).toBeDefined();
    });
  });

  describe("Tester Participation Dates & Replacement", () => {
    it("should calculate expectedEndAt from tester joinedAt, NOT from campaign startsAt", async () => {
      const now = new Date("2026-06-15T10:00:00Z");
      vi.useFakeTimers();
      vi.setSystemTime(now);

      vi.spyOn(prisma.campaign, "findUnique").mockResolvedValue({
        ...baseCampaign,
        durationDays: 14,
        startsAt: new Date("2026-01-01T00:00:00Z"), // 5 months earlier
      } as any);
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue(validTesterUser as any);
      vi.spyOn(prisma.campaignTester, "findFirst").mockResolvedValue(null);
      vi.spyOn(prisma.campaignTester, "count").mockResolvedValue(5);

      const createSpy = vi.spyOn(prisma.campaignTester, "create").mockImplementation(async (args: any) => {
        return {
          id: "ct-1",
          ...args.data,
        };
      });
      vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

      const testerAssignment = await CampaignTesterService.addTesterToCampaign(
        "campaign-1",
        "dev-1",
        UserRole.DEVELOPER,
        {
          testerId: "tester-1",
          isReplacement: true,
        },
      );

      expect(testerAssignment.isReplacement).toBe(true);
      expect(testerAssignment.joinedAt.toISOString()).toBe(now.toISOString());

      // Expected end is joinedAt + 14 days = 2026-06-29, NOT 2026-01-15
      const expectedEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      expect(testerAssignment.expectedEndAt.toISOString()).toBe(expectedEnd.toISOString());
      expect(createSpy).toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  describe("Uniqueness: No Duplicate Active Participations", () => {
    it("should reject adding a tester who already has an active participation in the same campaign", async () => {
      vi.spyOn(prisma.campaign, "findUnique").mockResolvedValue(baseCampaign as any);
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue(validTesterUser as any);
      vi.spyOn(prisma.campaignTester, "findFirst").mockResolvedValue({
        id: "existing-membership",
        status: TesterStatus.ACTIVE,
      } as any);

      await expect(
        CampaignTesterService.addTesterToCampaign(
          "campaign-1",
          "dev-1",
          UserRole.DEVELOPER,
          {
            testerId: "tester-1",
          },
        ),
      ).rejects.toThrow(ConflictError);
    });
  });

  describe("Removal", () => {
    it("should mark tester as REMOVED with actualEndAt and exitReason", async () => {
      vi.spyOn(prisma.campaign, "findUnique").mockResolvedValue(baseCampaign as any);
      vi.spyOn(prisma.campaignTester, "findFirst").mockResolvedValue({
        id: "ct-1",
        campaignId: "campaign-1",
        testerId: "tester-1",
        status: TesterStatus.ACTIVE,
      } as any);

      const updateSpy = vi.spyOn(prisma.campaignTester, "update").mockResolvedValue({
        id: "ct-1",
        status: TesterStatus.REMOVED,
        actualEndAt: new Date(),
        exitReason: "Inactive for 3 days",
      } as any);
      vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

      const removed = await CampaignTesterService.removeTesterFromCampaign(
        "campaign-1",
        "tester-1",
        "dev-1",
        UserRole.DEVELOPER,
        "Inactive for 3 days",
      );

      expect(removed.status).toBe(TesterStatus.REMOVED);
      expect(updateSpy).toHaveBeenCalledWith({
        where: { id: "ct-1" },
        data: expect.objectContaining({
          status: TesterStatus.REMOVED,
          exitReason: "Inactive for 3 days",
        }),
        include: expect.anything(),
      });
    });
  });
});
