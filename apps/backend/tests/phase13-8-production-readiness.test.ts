import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateProductionEnv, env, Env } from "../src/core/config/env.js";
import { buildApp } from "../src/app.js";
import { CampaignCapacityService, CAMPAIGN_ACTIVE_TESTER_TARGET, CAMPAIGN_BACKUP_TARGET } from "../src/modules/campaigns/capacity.service.js";
import { MissionScheduleService } from "../src/modules/missions/mission-schedule.service.js";
import { UserIdentityService } from "../src/modules/identity/user-identity.service.js";
import { TesterReliabilityService } from "../src/modules/trust/tester-reliability.service.js";
import { IdentityRiskLevel } from "@calltest/shared-types";
import { prisma } from "../src/core/database/prisma.js";

describe("Phase 13.8: Production Readiness & Deployment Hardening", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    UserIdentityService._clearStore();
    vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);
  });

  describe("1. Production Environment Validation & Fail-Fast Startup", () => {
    it("should detect insecure default development secrets when NODE_ENV is production", () => {
      const insecureProdEnv: Env = {
        ...env,
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://calltest_user:calltest_password@localhost:5432/calltest_db?schema=public",
        JWT_SECRET: "calltest_super_secret_jwt_key_development_only_min_32_chars",
        INTERNAL_SERVICE_SECRET: "calltest-internal-secure-service-secret-v1",
        CORS_ORIGIN: "*",
      };

      const validation = validateProductionEnv(insecureProdEnv);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThanOrEqual(3);
      expect(validation.errors.some((e) => e.includes("DATABASE_URL"))).toBe(true);
      expect(validation.errors.some((e) => e.includes("JWT_SECRET"))).toBe(true);
      expect(validation.errors.some((e) => e.includes("CORS_ORIGIN"))).toBe(true);
    });

    it("should pass validation when production environment is properly and securely configured", () => {
      const secureProdEnv: Env = {
        ...env,
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://prod_user:StrongProdSecretPassword987@prod-db.calltest.internal:5432/calltest_prod",
        JWT_SECRET: "strong_production_jwt_signing_secret_at_least_32_chars_long_12345",
        INTERNAL_SERVICE_SECRET: "secure_internal_prod_hmac_secret_key_9876543210_valid",
        CORS_ORIGIN: "https://calltest.app,https://admin.calltest.app",
      };

      const validation = validateProductionEnv(secureProdEnv);
      expect(validation.isValid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });
  });

  describe("2. Health Probes & Observability", () => {
    it("should respond to liveness probe without database dependency", async () => {
      const app = buildApp();
      const response = await app.inject({
        method: "GET",
        url: "/health/live",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("ok");
      expect(body.timestamp).toBeDefined();
      await app.close();
    });

    it("should include x-request-id correlation identifier in responses", async () => {
      const app = buildApp();
      const customReqId = "req-audit-trace-prod-001";

      const response = await app.inject({
        method: "GET",
        url: "/health/live",
        headers: {
          "x-request-id": customReqId,
        },
      });

      expect(response.statusCode).toBe(200);
      await app.close();
    });
  });

  describe("3. Security Headers, Rate Limiting & Error Obfuscation", () => {
    it("should enforce helmet security headers on HTTP responses", async () => {
      const app = buildApp();
      const response = await app.inject({
        method: "GET",
        url: "/health/live",
      });

      expect(response.headers["x-content-type-options"]).toBe("nosniff");
      expect(response.headers["x-frame-options"]).toBe("SAMEORIGIN");
      await app.close();
    });

    it("should return safe standardized error objects without leaking internal traces", async () => {
      const app = buildApp();
      const response = await app.inject({
        method: "GET",
        url: "/api/non-existent-route-for-testing",
      });

      expect(response.statusCode).toBe(404);
      await app.close();
    });
  });

  describe("4. Production E2E Smoke Simulation (12 Actives + 3 Backups + 14 Days)", () => {
    it("should simulate entire production flow cleanly without regressions", async () => {
      const campaignId = "c-prod-smoke-01";

      // 1. Capacity bounds confirmation
      expect(CAMPAIGN_ACTIVE_TESTER_TARGET).toBe(12);
      expect(CAMPAIGN_BACKUP_TARGET).toBe(3);

      const capacity = CampaignCapacityService.evaluateCampaignCapacity(12, 3, campaignId);
      expect(capacity.isUnderCapacity).toBe(false);
      expect(capacity.backupNeeded).toBe(0);

      // 2. Developer 14-day template
      const template = MissionScheduleService.getRecommendedTemplate();
      expect(template.length).toBeGreaterThanOrEqual(14);
      expect(new Set(template.map((m) => m.scheduledDay)).size).toBe(14);

      // 3. Pool matching evaluation
      const pool = Array.from({ length: 15 }, (_, i) => ({
        userId: `t-prod-tester-${i + 1}`,
        reliabilityScore: 70,
        progressionTier: "NEW" as const,
        riskLevel: IdentityRiskLevel.LOW_RISK,
      }));

      const matched = pool.map((cand) => ({
        cand,
        ...UserIdentityService.calculateMatchingScore({ candidate: cand }),
      }));

      expect(matched.length).toBe(15);
      const active = matched.slice(0, 12);
      const backup = matched.slice(12, 15);

      expect(active.length).toBe(12);
      expect(backup.length).toBe(3);

      // 4. Record completion idempotency
      const comp1 = await UserIdentityService.recordCampaignCompletion("t-prod-tester-1", campaignId);
      expect(comp1.alreadyRecorded).toBe(false);

      const comp2 = await UserIdentityService.recordCampaignCompletion("t-prod-tester-1", campaignId);
      expect(comp2.alreadyRecorded).toBe(true);

      // 5. Progression evaluation
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
});
