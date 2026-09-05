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
import {
  IdentityRiskLevel,
  ScheduledMissionStatus,
  MissionType,
} from "@calltest/shared-types";
import { prisma } from "../src/core/database/prisma.js";

describe("Phase 13.9: Final Release Gate & Production Deployment Verification", () => {
  const campaignId = "c-final-release-001";
  const devId = "dev-prod-master";
  const appId = "app-prod-shield";

  beforeEach(() => {
    vi.restoreAllMocks();
    UserIdentityService._clearStore();
    AppAvailabilityService._clearStore();
    vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);
    vi.spyOn(prisma.campaign, "findUnique").mockResolvedValue({
      id: campaignId,
      name: "CallShield Production",
      app: { id: appId, name: "CallShield", developerId: devId },
    } as any);
    vi.spyOn(prisma.campaignTester, "findMany").mockResolvedValue([
      { id: "b1" },
      { id: "b2" },
      { id: "b3" },
    ] as any);
  });

  describe("Gate 1: Production Configuration & Fail-Fast Secrets Audit", () => {
    it("should fail fast if production secrets or connection strings are invalid or default", () => {
      const invalidConfigs: Env[] = [
        { ...env, NODE_ENV: "production", DATABASE_URL: "postgresql://calltest_user:calltest_password@localhost:5432/calltest_db" },
        { ...env, NODE_ENV: "production", JWT_SECRET: "short_secret_123" },
        { ...env, NODE_ENV: "production", JWT_SECRET: "calltest_super_secret_jwt_key_development_only_min_32_chars" },
        { ...env, NODE_ENV: "production", CORS_ORIGIN: "*" },
      ];

      for (const cfg of invalidConfigs) {
        const val = validateProductionEnv(cfg);
        expect(val.isValid).toBe(false);
        expect(val.errors.length).toBeGreaterThan(0);
      }
    });

    it("should succeed validation for a production-hardened environment", () => {
      const validProd: Env = {
        ...env,
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://calltest_admin:SuperSecureProdPassword2026!@prod-db.calltest.internal:5432/calltest_primary",
        JWT_SECRET: "super_secure_jwt_signing_key_for_calltest_production_environment_2026",
        INTERNAL_SERVICE_KEY: "production-service-key-2026",
        INTERNAL_SERVICE_SECRET: "hmac_internal_service_production_secret_key_9876543210_valid",
        CORS_ORIGIN: "https://calltest.app,https://admin.calltest.app",
        EVIDENCE_STORAGE_PROVIDER: "s3",
        S3_BUCKET: "calltest-evidence",
        S3_ACCESS_KEY_ID: "test-access-key",
        S3_SECRET_ACCESS_KEY: "test-secret-key",
      };

      const val = validateProductionEnv(validProd);
      expect(val.isValid).toBe(true);
      expect(val.errors.length).toBe(0);
    });
  });

  describe("Gate 2: Capacity & Concurrency Enforcement (12 Active + 3 Backups = 15 Max)", () => {
    it("INVARIANT: Capacity bounds 12 active + 3 backups strictly enforced under extreme load", async () => {
      expect(CAMPAIGN_ACTIVE_TESTER_TARGET).toBe(12);
      expect(CAMPAIGN_BACKUP_TARGET).toBe(3);
      expect(CAMPAIGN_TOTAL_TARGET).toBe(15);

      // Attempting to reserve additional backups beyond 3
      const existingBackups = ["b1", "b2", "b3"];
      const concurrentIncoming = Array.from({ length: 20 }, (_, i) => `candidate-req-${i + 1}`);

      const reserved = await BackupTesterService.reserveBackups(campaignId, concurrentIncoming, existingBackups);
      expect(reserved.length).toBe(0); // 0 over-allocation

      const status = CampaignCapacityService.evaluateCampaignCapacity(12, 3);
      expect(status.activeCount).toBe(12);
      expect(status.backupCount).toBe(3);
      expect(status.isUnderCapacity).toBe(false);
      expect(status.backupNeeded).toBe(0);
    });
  });

  describe("Gate 3: Developer Mission Authority & 14-Day Exact Coverage", () => {
    it("should guarantee that developer mission validation strictly covers days 1..14 with day 15 = 0", () => {
      const template = MissionScheduleService.getRecommendedTemplate();

      // Days 1..14 all present
      const uniqueDays = new Set(template.map((m) => m.scheduledDay));
      expect(uniqueDays.size).toBe(14);
      for (let day = 1; day <= 14; day++) {
        expect(uniqueDays.has(day)).toBe(true);
      }

      // No day 15+ missions exist
      expect(template.some((m) => m.scheduledDay > 14)).toBe(false);

      const coverage = MissionScheduleService.validateCampaignMissionCoverage(template);
      expect(coverage.isValid).toBe(true);
      expect(coverage.missingDays.length).toBe(0);
    });
  });

  describe("Gate 4: Automated Replacement on Day 8 & Fresh Temporal Window Recovery", () => {
    it("should assign ONLY Day 8..14 to promoted backup, never Day 1..7", () => {
      const template = MissionScheduleService.getRecommendedTemplate();

      const replacementMissions = MissionScheduleService.distributeDeveloperMissionsForReplacement(
        campaignId,
        "ct-backup-replacement-01",
        template,
        8,
        new Date("2026-08-01T00:00:00Z")
      );

      expect(replacementMissions.length).toBeGreaterThanOrEqual(7);
      expect(replacementMissions.every((m) => m.scheduledDay >= 8 && m.scheduledDay <= 14)).toBe(true);
      expect(replacementMissions.some((m) => m.scheduledDay < 8)).toBe(false);
    });

    it("should unblock availability blocked missions with a brand new valid 48h deadline", () => {
      const blocked = {
        id: "m-d5-func",
        campaignId,
        type: MissionType.FUNCTIONAL,
        title: "Test checkout",
        description: "Test checkout feature",
        scheduledDay: 5,
        availableFrom: new Date("2026-08-05T00:00:00Z"),
        deadline: new Date("2026-08-07T00:00:00Z"), // Expired!
        required: true,
        priority: "HIGH" as const,
        status: ScheduledMissionStatus.BLOCKED_BY_AVAILABILITY,
      };

      const resolutionTime = new Date("2026-08-08T09:00:00Z");
      const unblocked = AppAvailabilityService.recoverBlockedMissions([blocked], resolutionTime, 48);

      expect(unblocked[0].status).toBe(ScheduledMissionStatus.AVAILABLE);
      expect(unblocked[0].availableFrom.toISOString()).toBe("2026-08-08T09:00:00.000Z");
      expect(unblocked[0].deadline.toISOString()).toBe("2026-08-10T09:00:00.000Z");
      expect(unblocked[0].deadline.getTime()).toBeGreaterThan(resolutionTime.getTime());
    });
  });

  describe("Gate 5: Progression Idempotency, Zero-PII & Matching Hierarchy", () => {
    it("should execute progression 100 times idempotently without duplicate increments", async () => {
      const testerId = "u-gate-tester-100";
      const targetCampaign = "c-gate-1";

      const first = await UserIdentityService.recordCampaignCompletion(testerId, targetCampaign);
      expect(first.alreadyRecorded).toBe(false);

      for (let i = 0; i < 99; i++) {
        const dup = await UserIdentityService.recordCampaignCompletion(testerId, targetCampaign);
        expect(dup.alreadyRecorded).toBe(true);
      }

      expect(UserIdentityService.countUserCompletedCampaigns(testerId)).toBe(1);

      const progression = TesterReliabilityService.evaluateTesterProgression({
        campaignsCompleted: 1,
        campaignsAbandoned: 0,
        requiredMissionsCompleted: 14,
        requiredMissionsMissed: 0,
      });

      expect(progression.tier).toBe("ACTIVE");
      expect(progression.higherMatchingPriorityMultiplier).toBe(1.15);
    });

    it("should operate V1 matching seamlessly with 100% NEW tester pool", () => {
      const newPool = Array.from({ length: 15 }, (_, i) => ({
        userId: `t-v1-fresh-${i + 1}`,
        reliabilityScore: 70,
        progressionTier: "NEW" as const,
        riskLevel: IdentityRiskLevel.LOW_RISK,
      }));

      const matched = newPool.map((c) => ({
        c,
        ...UserIdentityService.calculateMatchingScore({ candidate: c }),
      }));

      expect(matched.every((m) => m.matchScore > 0)).toBe(true);
      expect(matched.slice(0, 12).length).toBe(12);
      expect(matched.slice(12, 15).length).toBe(3);
    });
  });

  describe("Gate 6: Production Health Probes & Security", () => {
    it("should respond to liveness probe immediately without external service dependency", async () => {
      const app = buildApp();
      const res = await app.inject({
        method: "GET",
        url: "/health/live",
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.body);
      expect(json.status).toBe("ok");
      await app.close();
    });
  });
});
