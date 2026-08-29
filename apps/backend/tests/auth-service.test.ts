import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthService } from "../src/modules/auth/service.js";
import { prisma } from "../src/core/database/prisma.js";
import { PasswordHasher } from "../src/core/security/password-hasher.js";
import { TokenService } from "../src/core/security/token-service.js";
import { UserRole, UserStatus } from "@calltest/shared-types";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  UnauthorizedError,
} from "../src/core/errors/app-error.js";

describe("AuthService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("register", () => {
    it("should register a new TESTER successfully", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue(null);
      const mockCreatedUser = {
        id: "user-uuid-1",
        email: "tester@calltest.com",
        passwordHash: "salt:hash",
        displayName: "Tester One",
        role: UserRole.TESTER,
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.spyOn(prisma.user, "create").mockResolvedValue(mockCreatedUser as any);
      vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

      const user = await AuthService.register({
        email: "tester@calltest.com",
        password: "Password123!",
        displayName: "Tester One",
        role: UserRole.TESTER,
      });

      expect(user.id).toBe("user-uuid-1");
      expect(user.email).toBe("tester@calltest.com");
      expect(user.role).toBe(UserRole.TESTER);
    });

    it("should allow registering as BOTH (developer and tester)", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue(null);
      const mockCreatedUser = {
        id: "user-uuid-2",
        email: "both@calltest.com",
        passwordHash: "salt:hash",
        displayName: "Both User",
        role: UserRole.BOTH,
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.spyOn(prisma.user, "create").mockResolvedValue(mockCreatedUser as any);
      vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

      const user = await AuthService.register({
        email: "both@calltest.com",
        password: "Password123!",
        displayName: "Both User",
        role: UserRole.BOTH,
      });

      expect(user.role).toBe(UserRole.BOTH);
    });

    it("should reject direct ADMIN self-registration", async () => {
      await expect(
        AuthService.register({
          email: "admin@calltest.com",
          password: "Password123!",
          displayName: "Admin",
          role: UserRole.ADMIN as any,
        }),
      ).rejects.toThrow(BadRequestError);
    });

    it("should reject registration if email already exists", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: "existing-id",
        email: "duplicate@calltest.com",
      } as any);

      await expect(
        AuthService.register({
          email: "duplicate@calltest.com",
          password: "Password123!",
          displayName: "Duplicate",
          role: UserRole.TESTER,
        }),
      ).rejects.toThrow(ConflictError);
    });
  });

  describe("login", () => {
    it("should authenticate with correct password and active status", async () => {
      const password = "ValidPassword123!";
      const passwordHash = await PasswordHasher.hash(password);

      const mockUser = {
        id: "user-1",
        email: "valid@calltest.com",
        passwordHash,
        displayName: "Valid User",
        role: UserRole.TESTER,
        status: UserStatus.ACTIVE,
      };

      vi.spyOn(prisma.user, "findUnique").mockResolvedValue(mockUser as any);
      vi.spyOn(prisma.user, "update").mockResolvedValue(mockUser as any);
      vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

      const loggedIn = await AuthService.login({
        email: "valid@calltest.com",
        password,
      });

      expect(loggedIn.id).toBe("user-1");
    });

    it("should throw UnauthorizedError on invalid password", async () => {
      const passwordHash = await PasswordHasher.hash("CorrectPassword123!");
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: "user-1",
        email: "valid@calltest.com",
        passwordHash,
        status: UserStatus.ACTIVE,
      } as any);

      await expect(
        AuthService.login({
          email: "valid@calltest.com",
          password: "WrongPassword!",
        }),
      ).rejects.toThrow(UnauthorizedError);
    });

    it("should reject login for SUSPENDED user", async () => {
      const password = "ValidPassword123!";
      const passwordHash = await PasswordHasher.hash(password);

      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: "user-suspended",
        email: "suspended@calltest.com",
        passwordHash,
        status: UserStatus.SUSPENDED,
      } as any);

      await expect(
        AuthService.login({
          email: "suspended@calltest.com",
          password,
        }),
      ).rejects.toThrow(ForbiddenError);
    });

    it("should reject login for BANNED user", async () => {
      const password = "ValidPassword123!";
      const passwordHash = await PasswordHasher.hash(password);

      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: "user-banned",
        email: "banned@calltest.com",
        passwordHash,
        status: UserStatus.BANNED,
      } as any);

      await expect(
        AuthService.login({
          email: "banned@calltest.com",
          password,
        }),
      ).rejects.toThrow(ForbiddenError);
    });

    it("should reject login for DELETED user", async () => {
      const password = "ValidPassword123!";
      const passwordHash = await PasswordHasher.hash(password);

      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: "user-deleted",
        email: "deleted@calltest.com",
        passwordHash,
        status: UserStatus.DELETED,
      } as any);

      await expect(
        AuthService.login({
          email: "deleted@calltest.com",
          password,
        }),
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe("RefreshToken rotation & reuse detection", () => {
    it("should rotate refresh token successfully", async () => {
      const rawToken = "sample_raw_refresh_token";
      const tokenHash = TokenService.hashToken(rawToken);

      const mockStoredToken = {
        id: "token-id-1",
        userId: "user-uuid-1",
        tokenHash,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        revokedAt: null,
        user: {
          id: "user-uuid-1",
          email: "user@calltest.com",
          role: UserRole.DEVELOPER,
          status: UserStatus.ACTIVE,
        },
      };

      vi.spyOn(prisma.refreshToken, "findUnique").mockResolvedValue(mockStoredToken as any);
      vi.spyOn(prisma.refreshToken, "create").mockResolvedValue({ id: "token-id-2" } as any);
      vi.spyOn(prisma.refreshToken, "update").mockResolvedValue({} as any);

      const result = await AuthService.rotateRefreshToken(rawToken);
      expect(result.user.id).toBe("user-uuid-1");
      expect(result.newRefreshToken).toBeDefined();
      expect(result.newRefreshToken).not.toBe(rawToken);
    });

    it("should detect reuse of already revoked token and revoke all user sessions", async () => {
      const rawToken = "revoked_raw_token";
      const tokenHash = TokenService.hashToken(rawToken);

      const mockRevokedToken = {
        id: "token-id-revoked",
        userId: "user-uuid-compromised",
        tokenHash,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        revokedAt: new Date(Date.now() - 10000), // already revoked!
        user: {
          id: "user-uuid-compromised",
          status: UserStatus.ACTIVE,
        },
      };

      vi.spyOn(prisma.refreshToken, "findUnique").mockResolvedValue(mockRevokedToken as any);
      const updateManySpy = vi.spyOn(prisma.refreshToken, "updateMany").mockResolvedValue({ count: 2 } as any);
      vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

      await expect(AuthService.rotateRefreshToken(rawToken)).rejects.toThrow(
        UnauthorizedError,
      );

      // Verify that all tokens for the user were revoked
      expect(updateManySpy).toHaveBeenCalledWith({
        where: { userId: "user-uuid-compromised", revokedAt: null },
        data: expect.objectContaining({ revokedAt: expect.any(Date) }),
      });
    });
  });
});
