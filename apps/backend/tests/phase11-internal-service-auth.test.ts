import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/core/database/prisma.js";
import {
  NonceStore,
  signInternalServiceRequest,
} from "../src/core/middlewares/internal-service-guard.js";
import { env } from "../src/core/config/env.js";
import { UserRole } from "@calltest/shared-types";
import { MatchingEngine } from "../src/modules/matching/service.js";

describe("Phase 11.1: Internal Service Authentication & Replay Protection", () => {
  const app = buildApp();

  const campaignAId = "c0000000-0000-0000-0000-000000000001";
  const internalRoute = `/internal/matching/campaigns/${campaignAId}/evaluate`;

  let testerToken: string;
  let devToken: string;
  let adminToken: string;

  beforeAll(async () => {
    await app.ready();
    testerToken = app.jwt.sign({ sub: "u-tester", email: "tester@calltest.com", role: UserRole.TESTER });
    devToken = app.jwt.sign({ sub: "u-dev", email: "dev@calltest.com", role: UserRole.DEVELOPER });
    adminToken = app.jwt.sign({ sub: "u-admin", email: "admin@calltest.com", role: UserRole.ADMIN });
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    NonceStore.reset();

    vi.spyOn(MatchingEngine, "evaluateAndAssignReplacements").mockResolvedValue({
      campaignId: campaignAId,
      assignedCount: 0,
      health: {
        campaignId: campaignAId,
        targetActiveTesters: 12,
        maxActiveTesters: 15,
        activeTesters: 12,
        lowActivityTesters: 0,
        abandonedTesters: 0,
        completedTesters: 0,
        totalEnrolledTesters: 12,
        missionCompletionRate: 1.0,
        activityRate: 100.0,
        replacementNeed: 0,
        availableCapacity: 3,
        campaignRisk: "HEALTHY" as any,
      },
      assignedTesters: [],
    });
  });

  describe("1. Valid HMAC Signature", () => {
    it("1. Valid signature -> PASS (200)", async () => {
      const signed = signInternalServiceRequest({
        method: "POST",
        path: internalRoute,
      });

      const response = await app.inject({
        method: "POST",
        url: internalRoute,
        headers: {
          "x-internal-signature": signed.signature,
          "x-internal-timestamp": signed.timestamp,
          "x-internal-nonce": signed.nonce,
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it("12. Valid service call -> authorized", async () => {
      const signed = signInternalServiceRequest({
        method: "POST",
        path: internalRoute,
        secret: env.INTERNAL_SERVICE_SECRET,
      });

      const response = await app.inject({
        method: "POST",
        url: internalRoute,
        headers: {
          "x-internal-signature": signed.signature,
          "x-internal-timestamp": signed.timestamp,
          "x-internal-nonce": signed.nonce,
        },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe("2. Adversarial Signature & Tampering Tests", () => {
    it("2. Tampered signature -> 403 Forbidden", async () => {
      const signed = signInternalServiceRequest({
        method: "POST",
        path: internalRoute,
      });

      const tamperedSignature = signed.signature.slice(0, -4) + "0000";

      const response = await app.inject({
        method: "POST",
        url: internalRoute,
        headers: {
          "x-internal-signature": tamperedSignature,
          "x-internal-timestamp": signed.timestamp,
          "x-internal-nonce": signed.nonce,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it("3. Expired timestamp (> 300s in past) -> 403 Forbidden", async () => {
      const expiredTime = Date.now() - 350 * 1000;
      const signed = signInternalServiceRequest({
        method: "POST",
        path: internalRoute,
        timestamp: expiredTime,
      });

      const response = await app.inject({
        method: "POST",
        url: internalRoute,
        headers: {
          "x-internal-signature": signed.signature,
          "x-internal-timestamp": signed.timestamp,
          "x-internal-nonce": signed.nonce,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it("4. Future timestamp outside window (> 300s in future) -> 403 Forbidden", async () => {
      const futureTime = Date.now() + 350 * 1000;
      const signed = signInternalServiceRequest({
        method: "POST",
        path: internalRoute,
        timestamp: futureTime,
      });

      const response = await app.inject({
        method: "POST",
        url: internalRoute,
        headers: {
          "x-internal-signature": signed.signature,
          "x-internal-timestamp": signed.timestamp,
          "x-internal-nonce": signed.nonce,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it("5. Nonce reused -> 403 Forbidden (Replay attack prevention)", async () => {
      const signed = signInternalServiceRequest({
        method: "POST",
        path: internalRoute,
      });

      // First request succeeds
      const res1 = await app.inject({
        method: "POST",
        url: internalRoute,
        headers: {
          "x-internal-signature": signed.signature,
          "x-internal-timestamp": signed.timestamp,
          "x-internal-nonce": signed.nonce,
        },
      });
      expect(res1.statusCode).toBe(200);

      // Replay attempt with exact same nonce -> must be rejected
      const res2 = await app.inject({
        method: "POST",
        url: internalRoute,
        headers: {
          "x-internal-signature": signed.signature,
          "x-internal-timestamp": signed.timestamp,
          "x-internal-nonce": signed.nonce,
        },
      });
      expect(res2.statusCode).toBe(403);
    });

    it("6. Body modified after signing -> 403 Forbidden", async () => {
      const originalBody = { action: "evaluate" };
      const signed = signInternalServiceRequest({
        method: "POST",
        path: internalRoute,
        body: originalBody,
      });

      const tamperedBody = { action: "force_evaluate_all" };

      const response = await app.inject({
        method: "POST",
        url: internalRoute,
        headers: {
          "x-internal-signature": signed.signature,
          "x-internal-timestamp": signed.timestamp,
          "x-internal-nonce": signed.nonce,
        },
        payload: tamperedBody,
      });

      expect(response.statusCode).toBe(403);
    });

    it("7. Path modified -> 403 Forbidden", async () => {
      const signed = signInternalServiceRequest({
        method: "POST",
        path: "/internal/matching/campaigns/c0000000-0000-0000-0000-000000000002/evaluate",
      });

      const response = await app.inject({
        method: "POST",
        url: internalRoute,
        headers: {
          "x-internal-signature": signed.signature,
          "x-internal-timestamp": signed.timestamp,
          "x-internal-nonce": signed.nonce,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it("8. HTTP method modified -> 403 Forbidden", async () => {
      const signed = signInternalServiceRequest({
        method: "GET",
        path: internalRoute,
      });

      const response = await app.inject({
        method: "POST",
        url: internalRoute,
        headers: {
          "x-internal-signature": signed.signature,
          "x-internal-timestamp": signed.timestamp,
          "x-internal-nonce": signed.nonce,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it("9. Normal Tester attempting to access without service signature -> rejected (403)", async () => {
      const response = await app.inject({
        method: "POST",
        url: internalRoute,
        headers: { authorization: `Bearer ${testerToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it("10. Developer attempting to access without service signature -> rejected (403)", async () => {
      const response = await app.inject({
        method: "POST",
        url: internalRoute,
        headers: { authorization: `Bearer ${devToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it("11. Admin attempting to access without service signature -> rejected (403)", async () => {
      const response = await app.inject({
        method: "POST",
        url: internalRoute,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it("13. Valid signature reused across different nonce -> rejected if signature mismatches", async () => {
      const signed = signInternalServiceRequest({
        method: "POST",
        path: internalRoute,
      });

      const response = await app.inject({
        method: "POST",
        url: internalRoute,
        headers: {
          "x-internal-signature": signed.signature,
          "x-internal-timestamp": signed.timestamp,
          "x-internal-nonce": "different-nonce-12345",
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it("14. Audit log records rejected attempt on failure", async () => {
      const auditSpy = vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

      await app.inject({
        method: "POST",
        url: internalRoute,
        headers: {
          "x-internal-signature": "invalid",
          "x-internal-timestamp": String(Date.now()),
          "x-internal-nonce": "nonce-fail-1",
        },
      });

      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: "unauthorized-internal-caller",
            entityName: "InternalService",
          }),
        }),
      );
    });
  });
});
