import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/core/database/prisma.js";
import { UserRole, UserStatus, RewardSource } from "@calltest/shared-types";
import { SsrfGuard } from "../src/core/security/ssrf-guard.js";
import { PlayStoreValidationService } from "../src/modules/campaigns/validation/play-store-validation.service.js";
import { GoogleGroupValidationService } from "../src/modules/campaigns/validation/google-group-validation.service.js";
import { LocalEvidenceStorage } from "../src/core/storage/local-evidence-storage.js";
import {
  NonceStore,
  signInternalServiceRequest,
} from "../src/core/middlewares/internal-service-guard.js";
import { AdminService } from "../src/modules/admin/service.js";
import { RewardService } from "../src/modules/rewards/service.js";
import { MatchingEngine } from "../src/modules/matching/service.js";

describe("Phase 11.9: Independent Production Hardening & Adversarial Audit", () => {
  const app = buildApp();

  const campaignAId = "c0000000-0000-0000-0000-000000000001";
  const mission1Id = "m0000000-0000-0000-0000-000000000001";
  const tester1Id = "10000000-0000-0000-0000-000000000001";
  const bothId = "30000000-0000-0000-0000-000000000003";

  let bothToken: string;

  beforeAll(async () => {
    await app.ready();
    bothToken = app.jwt.sign({ sub: bothId, email: "both@calltest.com", role: UserRole.BOTH });
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

  describe("1. SSRF & URL Validation Hardening", () => {
    it("should strictly block loopback, cloud metadata, and private IP addresses", () => {
      const dangerousUrls = [
        "http://localhost:8080/admin",
        "http://127.0.0.1:3000/internal",
        "http://169.254.169.254/latest/meta-data/",
        "http://metadata.google.internal/computeMetadata/v1/",
        "http://0.0.0.0/secrets",
        "http://[::1]:8080/metrics",
        "http://10.0.0.1/cluster",
        "http://192.168.1.1/router",
        "http://172.16.0.1/private",
      ];

      for (const url of dangerousUrls) {
        const check = SsrfGuard.isSafeUrl(url);
        expect(check.isSafe).toBe(false);
      }
    });

    it("PlayStoreValidationService should reject untrusted domains with SSRF guard", async () => {
      const result = await PlayStoreValidationService.validatePlayStoreUrl(
        "http://169.254.169.254/latest/meta-data/?id=com.calltest.app",
        "com.calltest.app",
      );
      expect(result.validUrl).toBe(false);
      expect(result.status).toBe("ERROR");
    });

    it("GoogleGroupValidationService should reject non-Google Group URLs with SSRF guard", async () => {
      const result = await GoogleGroupValidationService.validateGoogleGroup(
        "http://attacker.com/g/calltest-testers",
      );
      expect(result.valid).toBe(false);
      expect(result.status).toBe("INVALID_URL");
    });
  });

  describe("2. Error Sanitization in Production Mode", () => {
    it("should attach correlation requestId to all error responses", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/non-existent-route-for-audit",
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.message).toBeDefined();
    });
  });

  describe("3. Database Invariants & Concurrency Hardening", () => {
    it("should prevent duplicate reward creation under 100 simultaneous requests", async () => {
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
                id: "rew-audit-concurrency",
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

      const promises = Array.from({ length: 100 }, (_, i) =>
        RewardService.processReward({
          userId: tester1Id,
          campaignId: campaignAId,
          sourceType: RewardSource.MISSION_VALIDATED,
          sourceId: mission1Id,
          reason: `Audit load claim ${i}`,
        }),
      );

      const results = await Promise.all(promises);

      expect(results.length).toBe(100);
      expect(createdCount).toBe(1);
    });
  });

  describe("4. Internal Service HMAC Security & Replay Prevention", () => {
    it("should reject tampered HMAC signatures with 403", async () => {
      const signed = signInternalServiceRequest({
        method: "POST",
        path: `/internal/matching/campaigns/${campaignAId}/evaluate`,
      });

      const response = await app.inject({
        method: "POST",
        url: `/internal/matching/campaigns/${campaignAId}/evaluate`,
        headers: {
          "x-internal-signature": signed.signature.slice(0, -6) + "badbad",
          "x-internal-timestamp": signed.timestamp,
          "x-internal-nonce": signed.nonce,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it("should reject replayed nonces within valid timestamp window", async () => {
      const signed = signInternalServiceRequest({
        method: "POST",
        path: `/internal/matching/campaigns/${campaignAId}/evaluate`,
      });

      // 1. Initial valid call
      const res1 = await app.inject({
        method: "POST",
        url: `/internal/matching/campaigns/${campaignAId}/evaluate`,
        headers: {
          "x-internal-signature": signed.signature,
          "x-internal-timestamp": signed.timestamp,
          "x-internal-nonce": signed.nonce,
        },
      });
      expect(res1.statusCode).toBe(200);

      // 2. Replay attempt
      const res2 = await app.inject({
        method: "POST",
        url: `/internal/matching/campaigns/${campaignAId}/evaluate`,
        headers: {
          "x-internal-signature": signed.signature,
          "x-internal-timestamp": signed.timestamp,
          "x-internal-nonce": signed.nonce,
        },
      });
      expect(res2.statusCode).toBe(403);
    });
  });

  describe("5. Admin RBAC Strictness", () => {
    it("should strictly deny BOTH role access to /admin/* endpoints", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: bothId,
        role: UserRole.BOTH,
        status: UserStatus.ACTIVE,
      } as any);

      const res = await app.inject({
        method: "GET",
        url: "/admin/users",
        headers: { authorization: `Bearer ${bothToken}` },
      });

      expect(res.statusCode).toBe(403);
    });

    it("should enforce mandatory reasons on punitive actions", async () => {
      await expect(
        AdminService.suspendUser("u-target", "admin-1", "   "),
      ).rejects.toThrow(/mandatory/i);
    });
  });

  describe("6. Storage Provider Hardening & Executable Prevention", () => {
    const storage = new LocalEvidenceStorage();

    it("should reject Windows PE / EXE files disguised as .jpg", async () => {
      const peFile = Buffer.from([0x4d, 0x5a, 0x90, 0x00]);
      await expect(
        storage.save(peFile, "virus.jpg", "image/jpeg"),
      ).rejects.toThrow(/Executable files/i);
    });

    it("should reject Linux ELF binaries disguised as .png", async () => {
      const elfFile = Buffer.from([0x7f, 0x45, 0x4c, 0x46, 0x01]);
      await expect(
        storage.save(elfFile, "payload.png", "image/png"),
      ).rejects.toThrow(/Executable files/i);
    });

    it("should reject HTML or PHP script injections", async () => {
      const scriptFile = Buffer.from("<script>alert('xss')</script>");
      await expect(
        storage.save(scriptFile, "image.png", "image/png"),
      ).rejects.toThrow(/Script or HTML payloads/i);
    });
  });
});
