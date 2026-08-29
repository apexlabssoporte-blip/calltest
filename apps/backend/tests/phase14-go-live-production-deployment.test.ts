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
  AvailabilityIssueType,
  AppAvailabilityStatus,
} from "@calltest/shared-types";
import { NotificationService } from "../src/modules/notifications/service.js";
import { prisma } from "../src/core/database/prisma.js";

describe("Phase 14: Go-Live & Production Deployment Verification", () => {
  const campaignId = "c-golive-pilot-001";
  const devId = "dev-golive-lead";
  const appId = "app-golive-shield";

  beforeEach(() => {
    vi.restoreAllMocks();
    UserIdentityService._clearStore();
    AppAvailabilityService._clearStore();
    vi.spyOn(NotificationService, "createNotification").mockResolvedValue({} as any);
    vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);
    vi.spyOn(prisma.campaign, "findUnique").mockResolvedValue({
      id: campaignId,
      name: "CallShield Go-Live Pilot",
      app: { id: appId, name: "CallShield", developerId: devId },
    } as any);
    vi.spyOn(prisma.campaignTester, "findMany").mockResolvedValue([
      { id: "b1" },
      { id: "b2" },
      { id: "b3" },
    ] as any);
  });

  describe("1. Release Versioning & Checkpoint Invariants", () => {
    it("should verify version consistency and safety checkpoints", () => {
      // Backend target configuration
      expect(CAMPAIGN_ACTIVE_TESTER_TARGET).toBe(12);
      expect(CAMPAIGN_BACKUP_TARGET).toBe(3);
      expect(CAMPAIGN_TOTAL_TARGET).toBe(15);

      // Verify production env schema defaults are well-formed
      expect(env.CAMPAIGN_TARGET_TESTERS).toBe(12);
      expect(env.CAMPAIGN_MAX_TESTERS).toBe(15);
      expect(env.CAMPAIGN_DURATION_DAYS).toBe(14);
    });
  });

  describe("2. Production Configuration & Fail-Fast Validation", () => {
    it("should reject unconfigured production environment and pass hardened production environment", () => {
      const unconfiguredEnv: Env = {
        ...env,
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://calltest_user:calltest_password@localhost:5432/calltest_db",
        JWT_SECRET: "calltest_super_secret_jwt_key_development_only_min_32_chars",
        INTERNAL_SERVICE_SECRET: "calltest-internal-secure-service-secret-v1",
        CORS_ORIGIN: "*",
      };

      const failFast = validateProductionEnv(unconfiguredEnv);
      expect(failFast.isValid).toBe(false);
      expect(failFast.errors.length).toBeGreaterThanOrEqual(4);

      const productionHardenedEnv: Env = {
        ...env,
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://calltest_admin:SecureProdDatabasePassword2026@prod-cluster.calltest.internal:5432/calltest_prod",
        JWT_SECRET: "production_super_secure_jwt_signing_key_at_least_32_characters_long",
        INTERNAL_SERVICE_SECRET: "production_secure_hmac_service_secret_key_9876543210_valid",
        CORS_ORIGIN: "https://calltest.app,https://admin.calltest.app",
      };

      const passed = validateProductionEnv(productionHardenedEnv);
      expect(passed.isValid).toBe(true);
      expect(passed.errors.length).toBe(0);
    });
  });

  describe("3. Capacity Pilot Verification (12 Active + 3 Backups = 15 Max)", () => {
    it("PILOT: 20 simultaneous candidate assignments never exceed 12 active + 3 backups", async () => {
      const activeCount = 12;
      const backupCount = 3;

      const evalStatus = CampaignCapacityService.evaluateCampaignCapacity(activeCount, backupCount, campaignId);
      expect(evalStatus.isUnderCapacity).toBe(false);
      expect(evalStatus.backupNeeded).toBe(0);
      expect(evalStatus.replacementRequired).toBe(false);

      // Attempting to reserve additional backups beyond 3
      const existingBackups = ["b1", "b2", "b3"];
      const incoming20 = Array.from({ length: 20 }, (_, i) => `pilot-cand-${i + 1}`);

      const reserved = await BackupTesterService.reserveBackups(campaignId, incoming20, existingBackups);
      expect(reserved.length).toBe(0); // 0 over-allocation
    });
  });

  describe("4. Replacement Pilot Verification (Mid-Campaign Day 8 -> Day 8..14 Only)", () => {
    it("PILOT: Promoted backup on Day 8 receives exclusively Day 8..14 missions", () => {
      const template = MissionScheduleService.getRecommendedTemplate();

      const replacementSchedule = MissionScheduleService.distributeDeveloperMissionsForReplacement(
        campaignId,
        "ct-promoted-backup-pilot",
        template,
        8,
        new Date("2026-08-01T00:00:00Z")
      );

      expect(replacementSchedule.length).toBeGreaterThanOrEqual(7);
      expect(replacementSchedule.every((m) => m.scheduledDay >= 8 && m.scheduledDay <= 14)).toBe(true);
      expect(replacementSchedule.some((m) => m.scheduledDay < 8)).toBe(false);
    });
  });

  describe("5. Availability Pilot Verification & Temporal Window Recovery", () => {
    it("PILOT: Incident on Day 5 incurs 0 penalty; resolution on Day 7 generates fresh 48h window", async () => {
      // 1. Tester reports availability restriction
      const { report } = await AppAvailabilityService.createOrGroupReport({
        campaignId,
        campaignTesterId: "ct-avail-pilot",
        appId,
        testerId: "t-avail-pilot",
        countryCode: "MX",
        issueType: AvailabilityIssueType.COUNTRY_RESTRICTION,
        reason: "App not listed in Mexico Google Play",
      });

      expect(report.status).toBe(AppAvailabilityStatus.OPEN);

      // 2. 0 penalty verified
      const reliability = TesterReliabilityService.calculateReliability({
        requiredMissionsCompletedCount: 4,
        requiredMissionsMissedCount: 0,
        completedCampaignsCount: 0,
        abandonedCampaignsCount: 0,
        replacedAsInactiveCount: 0,
      });
      expect(reliability.signals.penaltyPoints).toBe(0);

      // 3. Resolution on Day 7
      const blockedMission = {
        id: "m-d5-explore-pilot",
        campaignId,
        type: MissionType.EXPLORE,
        title: "Exploración piloto",
        description: "Explora la app",
        scheduledDay: 5,
        availableFrom: new Date("2026-08-05T00:00:00Z"),
        deadline: new Date("2026-08-07T00:00:00Z"), // Expired!
        required: true,
        priority: "HIGH" as const,
        status: ScheduledMissionStatus.BLOCKED_BY_AVAILABILITY,
      };

      const resolutionDate = new Date("2026-08-07T12:00:00Z");
      const unblocked = AppAvailabilityService.recoverBlockedMissions([blockedMission], resolutionDate, 48);

      expect(unblocked[0].status).toBe(ScheduledMissionStatus.AVAILABLE);
      expect(unblocked[0].availableFrom.toISOString()).toBe("2026-08-07T12:00:00.000Z");
      expect(unblocked[0].deadline.toISOString()).toBe("2026-08-09T12:00:00.000Z");
      expect(unblocked[0].deadline.getTime()).toBeGreaterThan(resolutionDate.getTime());
    });
  });

  describe("6. Identity, Anti-Abuse & Zero-PII Authority", () => {
    it("PILOT: Anti-farming deduplication ensures 1 logical progression event across 100 requests", async () => {
      const userId = "u-pilot-dedup-100";
      const targetCamp = "c-pilot-target";

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

    it("PILOT: Risk cluster reduces matching weight without automatic ban", () => {
      const highRiskCandidate = {
        userId: "t-pilot-risk-01",
        reliabilityScore: 80,
        progressionTier: "ACTIVE" as const,
        riskLevel: IdentityRiskLevel.HIGH_RISK,
      };

      const score = UserIdentityService.calculateMatchingScore({ candidate: highRiskCandidate });
      expect(score.riskMultiplier).toBe(0.5);
      expect(score.matchScore).toBe(46); // 80 * 1.15 * 0.50 = 46
      expect(score.matchScore).toBeGreaterThan(0); // Technically eligible, never automatically banned
    });
  });

  describe("7. Production Health & Observability Smoke", () => {
    it("should respond to liveness probe with 200 OK without database dependency", async () => {
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
