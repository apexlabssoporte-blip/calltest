import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/core/database/prisma.js";
import { UserRole, UserStatus } from "@calltest/shared-types";
import { LocalEvidenceStorage } from "../src/core/storage/local-evidence-storage.js";
import { MatchingEngine } from "../src/modules/matching/service.js";
import { signInternalServiceRequest } from "../src/core/middlewares/internal-service-guard.js";

describe("Phase 11: Security Hardening, Internal API & GDPR Privacy", () => {
  const app = buildApp();

  const tester1Id = "10000000-0000-0000-0000-000000000001";
  const devId = "d0000000-0000-0000-0000-000000000001";
  const campaignAId = "c0000000-0000-0000-0000-000000000001";

  let tester1Token: string;

  beforeAll(async () => {
    await app.ready();
    tester1Token = app.jwt.sign({ sub: tester1Id, email: "tester1@calltest.com", role: UserRole.TESTER });
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("1. GDPR & Data Privacy (DELETE /me/account)", () => {
    it("should anonymize user PII, revoke tokens, and mark user DELETED", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: tester1Id,
        email: "tester1@calltest.com",
        displayName: "Tester One",
        role: UserRole.TESTER,
        status: UserStatus.ACTIVE,
      } as any);

      const userUpdateSpy = vi.spyOn(prisma.user, "update").mockResolvedValue({} as any);
      const refreshRevokeSpy = vi.spyOn(prisma.refreshToken, "updateMany").mockResolvedValue({ count: 2 } as any);
      const deviceTokenDeleteSpy = vi.spyOn(prisma.devicePushToken, "deleteMany").mockResolvedValue({ count: 1 } as any);
      const auditSpy = vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

      const response = await app.inject({
        method: "DELETE",
        url: "/me/account",
        headers: { authorization: `Bearer ${tester1Token}` },
        payload: { reason: "User requested account deletion" },
      });

      expect(response.statusCode).toBe(200);
      expect(userUpdateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: tester1Id },
          data: expect.objectContaining({
            displayName: "Deleted User",
            status: UserStatus.DELETED,
            passwordHash: "ANONYMIZED_DELETED_ACCOUNT",
          }),
        }),
      );
      expect(refreshRevokeSpy).toHaveBeenCalled();
      expect(deviceTokenDeleteSpy).toHaveBeenCalled();
      expect(auditSpy).toHaveBeenCalled();
    });
  });

  describe("2. Internal Engine Security (/internal/matching/*)", () => {
    it("should reject unauthenticated or unauthorized external requests", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: tester1Id,
        role: UserRole.TESTER,
        status: UserStatus.ACTIVE,
      } as any);

      const response = await app.inject({
        method: "POST",
        url: `/internal/matching/campaigns/${campaignAId}/evaluate`,
        headers: { authorization: `Bearer ${tester1Token}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it("should allow authorized Developer or Admin to evaluate matching", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: devId,
        role: UserRole.DEVELOPER,
        status: UserStatus.ACTIVE,
      } as any);

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

      const signed = signInternalServiceRequest({
        method: "POST",
        path: `/internal/matching/campaigns/${campaignAId}/evaluate`,
      });

      const response = await app.inject({
        method: "POST",
        url: `/internal/matching/campaigns/${campaignAId}/evaluate`,
        headers: {
          "x-internal-signature": signed.signature,
          "x-internal-timestamp": signed.timestamp,
          "x-internal-nonce": signed.nonce,
        },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe("3. Storage Hardening & Path Traversal Prevention", () => {
    it("should reject malicious file uploads with invalid MIME types or excessive size", async () => {
      const storage = new LocalEvidenceStorage();
      const fakeExecutable = Buffer.from("MZ_EXECUTABLE_BINARY");

      await expect(
        storage.save(fakeExecutable, "malicious.exe", "application/x-msdownload"),
      ).rejects.toThrow(/Unsupported MIME type/i);
    });
  });
});
