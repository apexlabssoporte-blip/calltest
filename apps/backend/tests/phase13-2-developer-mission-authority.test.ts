import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  MissionScheduleService,
  DeveloperMissionInput,
} from "../src/modules/missions/mission-schedule.service.js";
import { MissionType, ScheduledMissionStatus } from "@calltest/shared-types";

describe("Phase 13.2: Developer Mission Authority & 14-Day Validation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("1. Developer Mission Validation Rules", () => {
    it("should accept valid developer missions for days 1 through 14", () => {
      const day1Mission: DeveloperMissionInput = {
        scheduledDay: 1,
        type: MissionType.INSTALL,
        title: "Instalar CallShield",
        description: "Descarga e instala la app desde Google Play.",
        required: true,
      };

      const day14Mission: DeveloperMissionInput = {
        scheduledDay: 14,
        type: MissionType.FINAL_FEEDBACK,
        title: "Feedback final",
        description: "Completa la encuesta final de 14 días.",
        required: true,
      };

      expect(MissionScheduleService.validateDeveloperMission(day1Mission).isValid).toBe(true);
      expect(MissionScheduleService.validateDeveloperMission(day14Mission).isValid).toBe(true);
    });

    it("should reject missions scheduled on Day 15 or later", () => {
      const day15Mission: DeveloperMissionInput = {
        scheduledDay: 15,
        type: MissionType.OPEN,
        title: "Día 15 Invalido",
        description: "Prueba posterior a campaña.",
      };

      const validation = MissionScheduleService.validateDeveloperMission(day15Mission);
      expect(validation.isValid).toBe(false);
      expect(validation.error).toBe("Mission scheduledDay must be between 1 and 14.");
    });

    it("should reject missions scheduled on Day 0 or negative days", () => {
      const day0Mission: DeveloperMissionInput = {
        scheduledDay: 0,
        type: MissionType.OPEN,
        title: "Día 0 Invalido",
        description: "Prueba previa.",
      };

      const validation = MissionScheduleService.validateDeveloperMission(day0Mission);
      expect(validation.isValid).toBe(false);
      expect(validation.error).toBe("Mission scheduledDay must be between 1 and 14.");
    });

    it("should reject missions with empty title or empty description", () => {
      const emptyTitle: DeveloperMissionInput = {
        scheduledDay: 1,
        type: MissionType.INSTALL,
        title: "   ",
        description: "Instrucciones válidas.",
      };

      const emptyDesc: DeveloperMissionInput = {
        scheduledDay: 1,
        type: MissionType.INSTALL,
        title: "Título Válido",
        description: "",
      };

      expect(MissionScheduleService.validateDeveloperMission(emptyTitle).isValid).toBe(false);
      expect(MissionScheduleService.validateDeveloperMission(emptyTitle).error).toBe("Mission title cannot be empty.");
      expect(MissionScheduleService.validateDeveloperMission(emptyDesc).isValid).toBe(false);
      expect(MissionScheduleService.validateDeveloperMission(emptyDesc).error).toBe("Mission description cannot be empty.");
    });
  });

  describe("2. Campaign 14-Day Coverage Validation", () => {
    it("should PASS validation when developer provides missions covering all 14 days", () => {
      const fullCoverage: DeveloperMissionInput[] = Array.from({ length: 14 }, (_, i) => ({
        scheduledDay: i + 1,
        type: i === 0 ? MissionType.INSTALL : i === 13 ? MissionType.FINAL_FEEDBACK : MissionType.OPEN,
        title: `Misión Día ${i + 1}`,
        description: `Instrucciones detalladas para el día ${i + 1}.`,
        required: i === 0 || i === 13,
      }));

      const result = MissionScheduleService.validateCampaignMissionCoverage(fullCoverage);
      expect(result.isValid).toBe(true);
      expect(result.missingDays.length).toBe(0);
      expect(result.errors.length).toBe(0);
    });

    it("should FAIL validation when developer is missing days (e.g. Day 4, 8, 11) and list exact missing days", () => {
      // 14 days minus days 4, 8, 11
      const missingDaysList = [4, 8, 11];
      const partialCoverage: DeveloperMissionInput[] = Array.from({ length: 14 }, (_, i) => i + 1)
        .filter((day) => !missingDaysList.includes(day))
        .map((day) => ({
          scheduledDay: day,
          type: MissionType.OPEN,
          title: `Misión Día ${day}`,
          description: `Instrucciones para día ${day}.`,
        }));

      const result = MissionScheduleService.validateCampaignMissionCoverage(partialCoverage);
      expect(result.isValid).toBe(false);
      expect(result.missingDays).toEqual([4, 8, 11]);
      expect(result.errors[0]).toContain("Faltan misiones: Día 4, Día 8, Día 11");
    });
  });

  describe("3. Developer Authority (Exact Title, Description, Type, and Evidence Reach Tester)", () => {
    it("should deliver developer-defined mission parameters to tester assignments without modification", () => {
      const campaignId = "c-dev-auth";
      const campaignTesterId = "ct-dev-auth";

      const devMissions: DeveloperMissionInput[] = [
        {
          id: "m-custom-callshield",
          scheduledDay: 3,
          type: MissionType.FUNCTIONAL,
          title: "Probar identificación de llamada CallShield",
          description: "Realiza una llamada de prueba entrante y verifica que se muestre el popup identificador.",
          required: true,
          priority: "HIGH",
          evidenceRequired: true,
        },
      ];

      const distributed = MissionScheduleService.distributeDeveloperMissions(
        campaignId,
        campaignTesterId,
        devMissions,
        new Date("2026-08-01T00:00:00Z")
      );

      expect(distributed.length).toBe(1);
      const mission = distributed[0];

      // Exact developer authority verified
      expect(mission.title).toBe("Probar identificación de llamada CallShield");
      expect(mission.description).toBe("Realiza una llamada de prueba entrante y verifica que se muestre el popup identificador.");
      expect(mission.type).toBe(MissionType.FUNCTIONAL);
      expect(mission.required).toBe(true);
      expect(mission.priority).toBe("HIGH");
      expect(mission.requiresEvidence).toBe(true);
      expect(mission.scheduledDay).toBe(3);
    });
  });

  describe("4. Recommended Template Editing Flow", () => {
    it("should provide 14-day template that developer can customize", () => {
      const template = MissionScheduleService.getRecommendedTemplate("c-tpl-test");
      expect(template.length).toBe(16); // 16 missions across 14 days

      // Developer customizes Day 3 mission
      const day3 = template.find((m) => m.scheduledDay === 3);
      expect(day3).toBeDefined();
      if (day3) {
        day3.title = "Mi prueba de checkout personalizada";
        day3.description = "Agrega un producto al carrito y procede hasta la pantalla de pago.";
      }

      const distributed = MissionScheduleService.distributeDeveloperMissions(
        "c-tpl-test",
        "ct-tpl-1",
        template,
        new Date()
      );

      const distributedDay3 = distributed.find((m) => m.scheduledDay === 3);
      expect(distributedDay3?.title).toBe("Mi prueba de checkout personalizada");
      expect(distributedDay3?.description).toBe("Agrega un producto al carrito y procede hasta la pantalla de pago.");
    });
  });

  describe("5. Replacement Tester Receives Developer Missions from Joined Day", () => {
    it("should assign developer missions from Day 8..14 to replacement tester joining on Day 8", () => {
      const campaignId = "c-rep-dev";
      const devMissions: DeveloperMissionInput[] = Array.from({ length: 14 }, (_, i) => ({
        id: `dev-m-${i + 1}`,
        scheduledDay: i + 1,
        type: i === 0 ? MissionType.INSTALL : i === 13 ? MissionType.FINAL_FEEDBACK : MissionType.OPEN,
        title: `Developer Custom Mission Day ${i + 1}`,
        description: `Custom instructions ${i + 1}`,
        required: true,
      }));

      const replacementMissions = MissionScheduleService.distributeDeveloperMissionsForReplacement(
        campaignId,
        "ct-replacement-b",
        devMissions,
        8,
        new Date("2026-08-01T00:00:00Z")
      );

      expect(replacementMissions.length).toBe(7); // Days 8, 9, 10, 11, 12, 13, 14
      expect(replacementMissions.every((m) => m.scheduledDay >= 8 && m.scheduledDay <= 14)).toBe(true);
      expect(replacementMissions.some((m) => m.scheduledDay < 8)).toBe(false);
      expect(replacementMissions[0].title).toBe("Developer Custom Mission Day 8");
    });
  });

  describe("6. Early Campaign Completion & Idempotency", () => {
    it("should cancel future developer missions on early completion and preserve completed", () => {
      const devMissions = MissionScheduleService.distributeDeveloperMissions(
        "c-early",
        "ct-early",
        MissionScheduleService.getRecommendedTemplate("c-early"),
        new Date()
      );

      // Tester completed Day 1 and Day 3
      const d1 = devMissions.find((m) => m.scheduledDay === 1);
      const d3 = devMissions.find((m) => m.scheduledDay === 3);
      if (d1) d1.status = ScheduledMissionStatus.COMPLETED;
      if (d3) d3.status = ScheduledMissionStatus.COMPLETED;

      // Campaign ends early on Day 6
      const updated = MissionScheduleService.cancelFutureMissions(devMissions, 6);

      const day1 = updated.find((m) => m.scheduledDay === 1);
      const day3 = updated.find((m) => m.scheduledDay === 3);
      const day7 = updated.find((m) => m.scheduledDay === 7);

      expect(day1?.status).toBe(ScheduledMissionStatus.COMPLETED);
      expect(day3?.status).toBe(ScheduledMissionStatus.COMPLETED);
      expect(day7?.status).toBe(ScheduledMissionStatus.CANCELLED);
    });

    it("should generate deterministic IDs to guarantee idempotent distribution on retry", () => {
      const template = MissionScheduleService.getRecommendedTemplate("c-idem");
      const dist1 = MissionScheduleService.distributeDeveloperMissions("c-idem", "ct-idem", template);
      const dist2 = MissionScheduleService.distributeDeveloperMissions("c-idem", "ct-idem", template);

      expect(dist1.map((m) => m.id)).toEqual(dist2.map((m) => m.id));
    });
  });

  describe("7. Daily Inbox with Multi-Developer Missions", () => {
    it("should aggregate distinct developer missions from multiple apps into daily inbox", () => {
      const userId = "u-tester-multi-dev";
      const now = new Date("2026-08-03T10:00:00Z");

      const devMissionsAppA: DeveloperMissionInput[] = [
        {
          scheduledDay: 3,
          type: MissionType.FUNCTIONAL,
          title: "App A: Probar Carrito",
          description: "Añadir item y verificar total.",
        },
      ];

      const devMissionsAppB: DeveloperMissionInput[] = [
        {
          scheduledDay: 3,
          type: MissionType.STABILITY,
          title: "App B: Test de Scroll y Audio",
          description: "Reproducir audio en background.",
        },
      ];

      const schedules = [
        {
          campaignId: "c-app-a",
          appName: "App A (Store)",
          campaignDay: 3,
          missions: MissionScheduleService.distributeDeveloperMissions("c-app-a", "ct-a", devMissionsAppA, now),
        },
        {
          campaignId: "c-app-b",
          appName: "App B (Music)",
          campaignDay: 3,
          missions: MissionScheduleService.distributeDeveloperMissions("c-app-b", "ct-b", devMissionsAppB, now),
        },
      ];

      const inbox = MissionScheduleService.aggregateDailyInbox(userId, schedules, now);

      expect(inbox.totalPendingToday).toBe(2);
      expect(inbox.tabs.pending.map((m) => m.title)).toContain("App A: Probar Carrito");
      expect(inbox.tabs.pending.map((m) => m.title)).toContain("App B: Test de Scroll y Audio");
    });
  });
});
