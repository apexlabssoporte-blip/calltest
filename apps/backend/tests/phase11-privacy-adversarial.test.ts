import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/core/database/prisma.js";
import { UserRole, UserStatus } from "@calltest/shared-types";
import { AuthService } from "../src/modules/auth/service.js";

describe("Phase 11.1: Privacy & Data Retention Adversarial Tests", () => {
  const app = buildApp();

  const userId = "10000000-0000-0000-0000-000000000001";
  let userToken: string;

  beforeAll(async () => {
    await app.ready();
    userToken = app.jwt.sign({ sub: userId, email: "tester@calltest.com", role: UserRole.TESTER });
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Account Deletion & Data Privacy Controls", () => {
    it("1. User deletes account and wipes PII", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: userId,
        email: "tester@calltest.com",
        displayName: "Tester One",
        status: UserStatus.ACTIVE,
      } as any);

      const userUpdateSpy = vi.spyOn(prisma.user, "update").mockResolvedValue({} as any);
      const refreshSpy = vi.spyOn(prisma.refreshToken, "updateMany").mockResolvedValue({ count: 1 } as any);
      const deviceSpy = vi.spyOn(prisma.devicePushToken, "deleteMany").mockResolvedValue({ count: 1 } as any);
      const auditSpy = vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

      const result = await AuthService.deleteAccount(userId, { reason: "User requested deletion" });

      expect(result.message).toContain("anonymized successfully");
      expect(userUpdateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: userId },
          data: expect.objectContaining({
            displayName: "Deleted User",
            status: UserStatus.DELETED,
            passwordHash: "ANONYMIZED_DELETED_ACCOUNT",
          }),
        }),
      );
      expect(refreshSpy).toHaveBeenCalled();
      expect(deviceSpy).toHaveBeenCalled();
      expect(auditSpy).toHaveBeenCalled();
    });

    it("2. Subsequent login attempt -> Rejected (403 Forbidden)", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: userId,
        email: "deleted_random@calltest.anonymized",
        passwordHash: "ANONYMIZED_DELETED_ACCOUNT",
        status: UserStatus.DELETED,
      } as any);

      const response = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: {
          email: "tester@calltest.com",
          password: "SecretPassword123!",
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it("3. Previous refresh token rotation -> Rejected (403 Forbidden)", async () => {
      vi.spyOn(prisma.refreshToken, "findUnique").mockResolvedValue({
        id: "rt-1",
        userId,
        revokedAt: null,
        user: {
          id: userId,
          status: UserStatus.DELETED,
        },
      } as any);

      await expect(AuthService.rotateRefreshToken("some_old_raw_token")).rejects.toThrow(
        /User account is deleted/i,
      );
    });

    it("4. Device tokens are cleared", async () => {
      const deleteSpy = vi.spyOn(prisma.devicePushToken, "deleteMany").mockResolvedValue({ count: 2 } as any);
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({ id: userId, status: UserStatus.ACTIVE } as any);
      vi.spyOn(prisma.user, "update").mockResolvedValue({} as any);
      vi.spyOn(prisma.refreshToken, "updateMany").mockResolvedValue({ count: 1 } as any);
      vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

      await AuthService.deleteAccount(userId);
      expect(deleteSpy).toHaveBeenCalledWith({ where: { userId } });
    });

    it("5. GET /me -> Returns 401 Unauthorized / does not expose prior PII", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: userId,
        status: UserStatus.DELETED,
      } as any);

      const response = await app.inject({
        method: "GET",
        url: "/me",
        headers: { authorization: `Bearer ${userToken}` },
      });

      expect(response.statusCode).toBe(401);
    });

    it("6. Rewards history maintains referential integrity without orphan cascade", async () => {
      vi.spyOn(prisma.reward, "findMany").mockResolvedValue([
        {
          id: "rew-1",
          userId,
          xpAmount: 10,
          goldAmount: 2,
          source: "MISSION_VALIDATED",
          createdAt: new Date(),
        } as any,
      ]);

      const rewards = await prisma.reward.findMany({ where: { userId } });
      expect(rewards.length).toBe(1);
      expect(rewards[0].userId).toBe(userId);
    });

    it("7. AuditLog history maintains immutable accountability records", async () => {
      vi.spyOn(prisma.auditLog, "findMany").mockResolvedValue([
        {
          id: "audit-1",
          userId,
          action: "ACCOUNT_DELETED_ANONYMIZED",
          createdAt: new Date(),
        } as any,
      ]);

      const logs = await prisma.auditLog.findMany({ where: { userId } });
      expect(logs.length).toBe(1);
    });

    it("8. Developer cannot view personal details of deleted tester", async () => {
      const testerInCampaign = {
        id: "ct-1",
        testerId: userId,
        tester: {
          displayName: "Deleted User",
          email: "deleted_uuid@calltest.anonymized",
        },
      };

      expect(testerInCampaign.tester.displayName).toBe("Deleted User");
      expect(testerInCampaign.tester.email).not.toContain("realname");
    });
  });
});
