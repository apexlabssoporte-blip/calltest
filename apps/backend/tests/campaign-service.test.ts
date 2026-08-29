import { describe, it, expect, vi, beforeEach } from "vitest";
import { CampaignService } from "../src/modules/campaigns/service.js";
import { prisma } from "../src/core/database/prisma.js";
import { CampaignStatus, UserRole } from "@calltest/shared-types";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "../src/core/errors/app-error.js";

describe("CampaignService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("createCampaign", () => {
    it("should create campaign with configured defaults (12 target, 15 max, 14 days)", async () => {
      vi.spyOn(prisma.app, "findUnique").mockResolvedValue({
        id: "app-1",
        developerId: "dev-1",
      } as any);

      const mockCampaign = {
        id: "campaign-1",
        appId: "app-1",
        name: "Sprint 1 Closed Beta",
        targetTesters: 12,
        maxTesters: 15,
        durationDays: 14,
        status: CampaignStatus.DRAFT,
      };

      vi.spyOn(prisma.campaign, "create").mockResolvedValue(mockCampaign as any);
      vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

      const campaign = await CampaignService.createCampaign(
        "app-1",
        "dev-1",
        UserRole.DEVELOPER,
        {
          name: "Sprint 1 Closed Beta",
        },
      );

      expect(campaign.targetTesters).toBe(12);
      expect(campaign.maxTesters).toBe(15);
      expect(campaign.durationDays).toBe(14);
      expect(campaign.status).toBe(CampaignStatus.DRAFT);
    });

    it("should reject campaign if maxTesters < targetTesters", async () => {
      vi.spyOn(prisma.app, "findUnique").mockResolvedValue({
        id: "app-1",
        developerId: "dev-1",
      } as any);

      await expect(
        CampaignService.createCampaign("app-1", "dev-1", UserRole.DEVELOPER, {
          name: "Invalid Campaign",
          targetTesters: 15,
          maxTesters: 10,
        }),
      ).rejects.toThrow(BadRequestError);
    });

    it("should prevent Developer A from creating a campaign on Developer B's app", async () => {
      vi.spyOn(prisma.app, "findUnique").mockResolvedValue({
        id: "app-b",
        developerId: "dev-b",
      } as any);

      await expect(
        CampaignService.createCampaign("app-b", "dev-a", UserRole.DEVELOPER, {
          name: "Intruder Campaign",
        }),
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe("Campaign Ownership & IDOR Protection", () => {
    it("should prevent Developer A from viewing or modifying Developer B's campaign", async () => {
      vi.spyOn(prisma.campaign, "findUnique").mockResolvedValue({
        id: "campaign-b",
        appId: "app-b",
        app: {
          id: "app-b",
          developerId: "dev-b",
        },
      } as any);

      await expect(
        CampaignService.getCampaignById("campaign-b", "dev-a", UserRole.DEVELOPER),
      ).rejects.toThrow(ForbiddenError);
    });

    it("should throw NotFoundError if campaign does not exist", async () => {
      vi.spyOn(prisma.campaign, "findUnique").mockResolvedValue(null);

      await expect(
        CampaignService.getCampaignById("nonexistent", "dev-1", UserRole.DEVELOPER),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("transitionCampaign", () => {
    it("should transition state from DRAFT to READY and set status", async () => {
      const mockCampaign = {
        id: "campaign-1",
        status: CampaignStatus.DRAFT,
        durationDays: 14,
        app: { developerId: "dev-1" },
      };

      vi.spyOn(prisma.campaign, "findUnique").mockResolvedValue(mockCampaign as any);
      vi.spyOn(prisma.campaign, "update").mockResolvedValue({
        ...mockCampaign,
        status: CampaignStatus.READY,
      } as any);
      vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

      const transitioned = await CampaignService.transitionCampaign(
        "campaign-1",
        "dev-1",
        UserRole.DEVELOPER,
        CampaignStatus.READY,
      );

      expect(transitioned.status).toBe(CampaignStatus.READY);
    });

    it("should set startsAt and endsAt when transitioning to ACTIVE", async () => {
      const mockCampaign = {
        id: "campaign-1",
        status: CampaignStatus.READY,
        durationDays: 14,
        startsAt: null,
        endsAt: null,
        app: { developerId: "dev-1" },
      };

      vi.spyOn(prisma.campaign, "findUnique").mockResolvedValue(mockCampaign as any);
      const updateSpy = vi.spyOn(prisma.campaign, "update").mockResolvedValue({
        ...mockCampaign,
        status: CampaignStatus.ACTIVE,
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 14 * 86400000),
      } as any);
      vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

      await CampaignService.transitionCampaign(
        "campaign-1",
        "dev-1",
        UserRole.DEVELOPER,
        CampaignStatus.ACTIVE,
      );

      expect(updateSpy).toHaveBeenCalledWith({
        where: { id: "campaign-1" },
        data: expect.objectContaining({
          status: CampaignStatus.ACTIVE,
          startsAt: expect.any(Date),
          endsAt: expect.any(Date),
        }),
      });
    });
  });
});
