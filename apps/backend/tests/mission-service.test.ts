import { describe, it, expect, vi, beforeEach } from "vitest";
import { MissionService } from "../src/modules/missions/service.js";
import { prisma } from "../src/core/database/prisma.js";
import {
  MissionDifficulty,
  MissionStatus,
  UserRole,
  ValidationMethod,
} from "@calltest/shared-types";
import { BadRequestError, ForbiddenError } from "../src/core/errors/app-error.js";

describe("MissionService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const baseCampaign = {
    id: "campaign-1",
    appId: "app-1",
    app: {
      id: "app-1",
      developerId: "dev-1",
    },
  };

  describe("createMission", () => {
    it("should create a valid mission in DRAFT status", async () => {
      vi.spyOn(prisma.campaign, "findUnique").mockResolvedValue(baseCampaign as any);
      vi.spyOn(prisma.mission, "create").mockResolvedValue({
        id: "mission-1",
        campaignId: "campaign-1",
        title: "Explorar catálogo",
        objective: "Navegar por las categorías del catálogo y seleccionar un producto.",
        steps: ["Abrir catálogo", "Ver categoría", "Seleccionar producto"],
        difficulty: MissionDifficulty.EASY,
        estimatedMinutes: 5,
        validationMethod: ValidationMethod.SDK_EVENT,
        status: MissionStatus.DRAFT,
      } as any);
      vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

      const mission = await MissionService.createMission(
        "campaign-1",
        "dev-1",
        UserRole.DEVELOPER,
        {
          title: "Explorar catálogo",
          objective: "Navegar por las categorías del catálogo y seleccionar un producto.",
          steps: ["Abrir catálogo", "Ver categoría", "Seleccionar producto"],
          difficulty: MissionDifficulty.EASY,
          estimatedMinutes: 5,
        },
      );

      expect(mission.id).toBe("mission-1");
      expect(mission.status).toBe(MissionStatus.DRAFT);
    });

    it("should reject creation if mission quality assessment fails", async () => {
      vi.spyOn(prisma.campaign, "findUnique").mockResolvedValue(baseCampaign as any);

      await expect(
        MissionService.createMission(
          "campaign-1",
          "dev-1",
          UserRole.DEVELOPER,
          {
            title: "Bad",
            objective: "Too short",
            steps: [],
          },
        ),
      ).rejects.toThrow(BadRequestError);
    });

    it("should prevent Developer A from creating missions in Developer B's campaign (IDOR)", async () => {
      vi.spyOn(prisma.campaign, "findUnique").mockResolvedValue({
        id: "campaign-b",
        app: { developerId: "dev-b" },
      } as any);

      await expect(
        MissionService.createMission(
          "campaign-b",
          "dev-a",
          UserRole.DEVELOPER,
          {
            title: "Intruder Mission",
            objective: "Intruding into another developer campaign.",
            steps: ["Step 1", "Step 2"],
          },
        ),
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe("generateMissions", () => {
    it("should generate drafts starting in PENDING_REVIEW status", async () => {
      vi.spyOn(prisma.campaign, "findUnique").mockResolvedValue(baseCampaign as any);
      vi.spyOn(prisma.mission, "create").mockImplementation(async (args: any) => {
        return {
          id: `gen-${Math.random()}`,
          ...args.data,
        };
      });
      vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

      const generated = await MissionService.generateMissions(
        "campaign-1",
        "dev-1",
        UserRole.DEVELOPER,
        {
          appDescription: "Aplicación de compras móviles con carrito y pagos seguros.",
          appFeatures: ["Catálogo", "Checkout", "Notificaciones"],
        },
      );

      expect(generated.length).toBeGreaterThan(0);
      for (const m of generated) {
        expect(m.status).toBe(MissionStatus.PENDING_REVIEW);
      }
    });
  });

  describe("approveMission and rejectMission", () => {
    it("should approve mission to ACTIVE status", async () => {
      vi.spyOn(prisma.mission, "findUnique").mockResolvedValue({
        id: "mission-1",
        campaignId: "campaign-1",
        status: MissionStatus.PENDING_REVIEW,
      } as any);
      vi.spyOn(prisma.campaign, "findUnique").mockResolvedValue(baseCampaign as any);
      vi.spyOn(prisma.mission, "update").mockResolvedValue({
        id: "mission-1",
        status: MissionStatus.ACTIVE,
      } as any);
      vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

      const approved = await MissionService.approveMission(
        "mission-1",
        "dev-1",
        UserRole.DEVELOPER,
        "Reviewed and valid",
      );

      expect(approved.status).toBe(MissionStatus.ACTIVE);
    });

    it("should reject mission to REJECTED status", async () => {
      vi.spyOn(prisma.mission, "findUnique").mockResolvedValue({
        id: "mission-1",
        campaignId: "campaign-1",
        status: MissionStatus.PENDING_REVIEW,
      } as any);
      vi.spyOn(prisma.campaign, "findUnique").mockResolvedValue(baseCampaign as any);
      vi.spyOn(prisma.mission, "update").mockResolvedValue({
        id: "mission-1",
        status: MissionStatus.REJECTED,
      } as any);
      vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

      const rejected = await MissionService.rejectMission(
        "mission-1",
        "dev-1",
        UserRole.DEVELOPER,
        "Steps are unclear",
      );

      expect(rejected.status).toBe(MissionStatus.REJECTED);
    });
  });
});
