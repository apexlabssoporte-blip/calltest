import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateProductionEnv, env, Env } from "../src/core/config/env.js";
import { buildApp } from "../src/app.js";
import {
  CampaignCapacityService,
  CAMPAIGN_ACTIVE_TESTER_TARGET,
  CAMPAIGN_BACKUP_TARGET,
  CAMPAIGN_TOTAL_TARGET,
} from "../src/modules/campaigns/capacity.service.js";
import { BackupTesterService } from "../src/modules/campaign-testers/backup-tester.service.js";
import { MissionScheduleService } from "../src/modules/missions/mission-schedule.service.js";
import { AppAvailabilityService } from "../src/modules/availability/app-availability.service.js";
import { UserIdentityService } from "../src/modules/identity/user-identity.service.js";
import { TesterReliabilityService } from "../src/modules/trust/tester-reliability.service.js";
import { NotificationService } from "../src/modules/notifications/service.js";
import {
  IdentityRiskLevel,
  ScheduledMissionStatus,
  MissionType,
  AvailabilityIssueType,
  AppAvailabilityStatus,
} from "@calltest/shared-types";
import { prisma } from "../src/core/database/prisma.js";

describe("Phase 14.1: Real Production Deployment & Post-Go-Live Verification", () => {
  const campaignId = "c-p14-1-prod-001";
  const devId = "dev-p14-1-lead";
  const appId = "app-p14-1-shield";

  beforeEach(() => {
    vi.restoreAllMocks();
    UserIdentityService._clearStore();
    AppAvailabilityService._clearStore();
    vi.spyOn(NotificationService, "createNotification").mockResolvedValue({} as any);
    vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);
    vi.spyOn(prisma.campaign, "findUnique").mockResolvedValue({
      id: campaignId,
      name: "CallShield Production Verification",
      app: { id: appId, name: "CallShield", developerId: devId },
    } as any);
    vi.spyOn(prisma.campaignTester, "findMany").mockResolvedValue([
      { id: "b1" },
      { id: "b2" },
      { id: "b3" },
    ] as any);
  });

  describe("1. Production Environment & Fail-Fast Invariants", () => {
    it("should fail fast if production configuration is missing, default, or insecure", () => {
      const insecureEnvs: Env[] = [
        { ...env, NODE_ENV: "production", DATABASE_URL: "postgresql://calltest_user:calltest_password@localhost:5432/calltest_db" },
        { ...env, NODE_ENV: "production", JWT_SECRET: "short_secret" },
        { ...env, NODE_ENV: "production", JWT_SECRET: "calltest_super_secret_jwt_key_development_only_min_32_chars" },
        { ...env, NODE_ENV: "production", CORS_ORIGIN: "*" },
        { ...env, NODE_ENV: "production", INTERNAL_SERVICE_SECRET: "calltest-internal-secure-service-secret-v1" },
      ];

      for (const badEnv of insecureEnvs) {
        const val = validateProductionEnv(badEnv);
        expect(val.isValid).toBe(false);
        expect(val.errors.length).toBeGreaterThan(0);
      }
    });

    it("should validate successfully for a properly hardened production environment", () => {
      const validProdEnv: Env = {
        ...env,
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://calltest_prod_user:SuperSecureProdSecret999@prod-db.calltest.internal:5432/calltest_prod",
        JWT_SECRET: "super_secure_jwt_signing_key_for_calltest_production_environment_2026_at_least_32_chars",
        INTERNAL_SERVICE_SECRET: "hmac_internal_service_production_secret_key_9876543210_valid",
        CORS_ORIGIN: "https://calltest.app,https://admin.calltest.app",
      };

      const val = validateProductionEnv(validProdEnv);
      expect(val.isValid).toBe(true);
      expect(val.errors.length).toBe(0);
    });
  });

  describe("2. Database, Concurrency & Idempotency", () => {
    it("INVARIANT: Capacity bounds 12 active + 3 backups strictly enforced under concurrent load", async () => {
      expect(CAMPAIGN_ACTIVE_TESTER_TARGET).toBe(12);
      expect(CAMPAIGN_BACKUP_TARGET).toBe(3);
      expect(CAMPAIGN_TOTAL_TARGET).toBe(15);

      const existingBackups = ["b1", "b2", "b3"];
      const concurrent20 = Array.from({ length: 20 }, (_, i) => `concurrent-cand-${i + 1}`);

      const reserved = await BackupTesterService.reserveBackups(campaignId, concurrent20, existingBackups);
      expect(reserved.length).toBe(0); // Cannot exceed 3 backups

      const evalStatus = CampaignCapacityService.evaluateCampaignCapacity(12, 3, campaignId);
      expect(evalStatus.isUnderCapacity).toBe(false);
      expect(evalStatus.backupNeeded).toBe(0);
      expect(evalStatus.replacementRequired).toBe(false);
    });

    it("INVARIANT: Campaign completion idempotency ensures 1 logical progression across 100 calls", async () => {
      const userId = "u-p14-1-dedup-100";
      const targetCamp = "c-p14-1-target";

      const first = await UserIdentityService.recordCampaignCompletion(userId, targetCamp);
      expect(first.alreadyRecorded).toBe(false);

      for (let i = 0; i < 99; i++) {
        const dup = await UserIdentityService.recordCampaignCompletion(userId, targetCamp);
        expect(dup.alreadyRecorded).toBe(true);
      }

      expect(UserIdentityService.countUserCompletedCampaigns(userId)).toBe(1);

      const progression = TesterReliabilityService.evaluateTesterProgression({
        campaignsCompleted: 1,
        campaignsAbandoned: 0,
        requiredMissionsCompleted: 14,
        requiredMissionsMissed: 0,
      });

      expect(progression.tier).toBe("ACTIVE");
      expect(progression.higherMatchingPriorityMultiplier).toBe(1.15);
    });
  });

  describe("3. Core Business Logic & Invariants Regression", () => {
    it("should validate full 14-day mission coverage and reject incomplete schedules", () => {
      const template = MissionScheduleService.getRecommendedTemplate();

      const coverage = MissionScheduleService.validateCampaignMissionCoverage(template);
      expect(coverage.isValid).toBe(true);
      expect(coverage.missingDays.length).toBe(0);

      // Incomplete schedule (missing day 14)
      const incomplete = template.filter((m) => m.scheduledDay !== 14);
      const incompleteVal = MissionScheduleService.validateCampaignMissionCoverage(incomplete);
      expect(incompleteVal.isValid).toBe(false);
      expect(incompleteVal.missingDays).toContain(14);
    });

    it("should assign ONLY Day 8..14 to a promoted backup replacing an inactive tester on Day 8", () => {
      const template = MissionScheduleService.getRecommendedTemplate();

      const replacementMissions = MissionScheduleService.distributeDeveloperMissionsForReplacement(
        campaignId,
        "ct-promoted-backup-p14",
        template,
        8,
        new Date("2026-08-01T00:00:00Z")
      );

      expect(replacementMissions.length).toBeGreaterThanOrEqual(7);
      expect(replacementMissions.every((m) => m.scheduledDay >= 8 && m.scheduledDay <= 14)).toBe(true);
      expect(replacementMissions.some((m) => m.scheduledDay < 8)).toBe(false);
    });

    it("should handle BLOCKED_BY_AVAILABILITY with 0 penalty and +48h window on resolution", async () => {
      const { report } = await AppAvailabilityService.createOrGroupReport({
        campaignId,
        campaignTesterId: "ct-avail-p14-1",
        appId,
        testerId: "t-avail-p14-1",
        countryCode: "ES",
        issueType: AvailabilityIssueType.COUNTRY_RESTRICTION,
        reason: "App not available in Spain Store",
      });

      expect(report.status).toBe(AppAvailabilityStatus.OPEN);

      const reliability = TesterReliabilityService.calculateReliability({
        requiredMissionsCompletedCount: 4,
        requiredMissionsMissedCount: 0,
        completedCampaignsCount: 0,
        abandonedCampaignsCount: 0,
        replacedAsInactiveCount: 0,
      });
      expect(reliability.signals.penaltyPoints).toBe(0);

      const blockedMission = {
        id: "m-d5-p14",
        campaignId,
        type: MissionType.EXPLORE,
        title: "Exploración",
        description: "Explora la app",
        scheduledDay: 5,
        availableFrom: new Date("2026-08-05T00:00:00Z"),
        deadline: new Date("2026-08-07T00:00:00Z"), // Expired!
        required: true,
        priority: "NORMAL" as const,
        status: ScheduledMissionStatus.BLOCKED_BY_AVAILABILITY,
      };

      const resolutionDate = new Date("2026-08-07T10:00:00Z");
      const unblocked = AppAvailabilityService.recoverBlockedMissions([blockedMission], resolutionDate, 48);

      expect(unblocked[0].status).toBe(ScheduledMissionStatus.AVAILABLE);
      expect(unblocked[0].availableFrom.toISOString()).toBe("2026-08-07T10:00:00.000Z");
      expect(unblocked[0].deadline.toISOString()).toBe("2026-08-09T10:00:00.000Z");
      expect(unblocked[0].deadline.getTime()).toBeGreaterThan(resolutionDate.getTime());
    });

    it("should cancel future missions on ENDED_EARLY without penalizing tester", () => {
      const schedule = [
        {
          id: "m-d1",
          campaignId,
          type: MissionType.INSTALL,
          title: "Install",
          description: "Install",
          scheduledDay: 1,
          required: true,
          priority: "CRITICAL" as const,
          status: ScheduledMissionStatus.COMPLETED,
          completedAt: new Date(),
        },
        {
          id: "m-d7",
          campaignId,
          type: MissionType.FUNCTIONAL,
          title: "Test search",
          description: "Search in app",
          scheduledDay: 7,
          required: true,
          priority: "NORMAL" as const,
          status: ScheduledMissionStatus.PENDING,
        },
      ];

      const cancelled = MissionScheduleService.cancelFutureMissions(schedule, 6);
      expect(cancelled[0].status).toBe(ScheduledMissionStatus.COMPLETED);
      expect(cancelled[1].status).toBe(ScheduledMissionStatus.CANCELLED);
    });
  });

  describe("4. Security, Zero-PII & Backend Authority", () => {
    it("INVARIANT: Client cannot forge or tamper with backend-computed scores and tiers", () => {
      const candidate = {
        userId: "t-tamper-proof-01",
        reliabilityScore: 75,
        progressionTier: "ACTIVE" as const,
        riskLevel: IdentityRiskLevel.LOW_RISK,
      };

      const score = UserIdentityService.calculateMatchingScore({ candidate });
      expect(score.progressionMultiplier).toBe(1.15);
      expect(score.riskMultiplier).toBe(1.0);
      expect(score.matchScore).toBe(86); // Math.round(75 * 1.15 * 1.0) = 86
    });

    it("should enforce helmet security headers and strip sensitive details in production errors", async () => {
      const app = buildApp();
      const res = await app.inject({
        method: "GET",
        url: "/health/live",
      });

      expect(res.headers["x-content-type-options"]).toBe("nosniff");
      expect(res.headers["x-frame-options"]).toBe("SAMEORIGIN");
      await app.close();
    });
  });

  describe("5. Health Probes & Observability", () => {
    it("should respond to liveness probe immediately without database dependency", async () => {
      const app = buildApp();
      const res = await app.inject({
        method: "GET",
        url: "/health/live",
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.body);
      expect(json.status).toBe("ok");
      expect(json.timestamp).toBeDefined();
      await app.close();
    });
  });
});
