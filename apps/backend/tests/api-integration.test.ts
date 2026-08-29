import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/core/database/prisma.js";
import { PasswordHasher } from "../src/core/security/password-hasher.js";
import { UserRole, UserStatus, AppStatus, CampaignStatus } from "@calltest/shared-types";

describe("API End-to-End Integration", () => {
  const app = buildApp();

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Auth Routes", () => {
    it("POST /auth/register should create user and return 201 with tokens", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue(null);
      vi.spyOn(prisma.user, "create").mockResolvedValue({
        id: "a0000000-0000-0000-0000-000000000001",
        email: "dev@calltest.com",
        displayName: "Developer One",
        role: UserRole.DEVELOPER,
        status: UserStatus.ACTIVE,
        trustScore: 100,
        rank: "NEW",
        xpBalance: 0,
        goldBalance: 0,
        createdAt: new Date(),
        lastLoginAt: null,
      } as any);
      vi.spyOn(prisma.refreshToken, "create").mockResolvedValue({ id: "rt-1" } as any);
      vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

      const response = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: {
          email: "dev@calltest.com",
          password: "SecurePassword123!",
          displayName: "Developer One",
          role: UserRole.DEVELOPER,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.accessToken).toBeDefined();
      expect(body.refreshToken).toBeDefined();
      expect(body.user.email).toBe("dev@calltest.com");
      expect(body.user.role).toBe(UserRole.DEVELOPER);
    }, 15000);

    it("POST /auth/login should authenticate and return 200 with tokens", async () => {
      const password = "SecurePassword123!";
      const passwordHash = await PasswordHasher.hash(password);

      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: "a0000000-0000-0000-0000-000000000001",
        email: "dev@calltest.com",
        passwordHash,
        displayName: "Developer One",
        role: UserRole.DEVELOPER,
        status: UserStatus.ACTIVE,
        trustScore: 100,
        rank: "NEW",
        xpBalance: 0,
        goldBalance: 0,
        createdAt: new Date(),
        lastLoginAt: null,
      } as any);
      vi.spyOn(prisma.user, "update").mockResolvedValue({} as any);
      vi.spyOn(prisma.refreshToken, "create").mockResolvedValue({ id: "rt-1" } as any);
      vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

      const response = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: {
          email: "dev@calltest.com",
          password,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.accessToken).toBeDefined();
      expect(body.refreshToken).toBeDefined();
    });

    it("POST /auth/login should return 401 on incorrect credentials", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue(null);

      const response = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: {
          email: "unknown@calltest.com",
          password: "WrongPassword!",
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("Protected Apps Endpoints & RBAC", () => {
    it("POST /apps should require authentication", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/apps",
        payload: {
          name: "Test App",
          packageName: "com.test.app",
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it("POST /apps should succeed with valid DEVELOPER token", async () => {
      const devUserId = "a0000000-0000-0000-0000-000000000001";
      const token = app.jwt.sign({ sub: devUserId, email: "dev@calltest.com", role: UserRole.DEVELOPER });

      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: devUserId,
        email: "dev@calltest.com",
        role: UserRole.DEVELOPER,
        status: UserStatus.ACTIVE,
        displayName: "Dev One",
      } as any);

      vi.spyOn(prisma.app, "findFirst").mockResolvedValue(null);
      vi.spyOn(prisma.app, "create").mockResolvedValue({
        id: "b0000000-0000-0000-0000-000000000001",
        developerId: devUserId,
        name: "Test App",
        packageName: "com.test.app",
        platform: "ANDROID",
        status: AppStatus.DRAFT,
        description: null,
        playStoreUrl: null,
        googleGroupUrl: null,
        apiKey: "apk_12345",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

      const response = await app.inject({
        method: "POST",
        url: "/apps",
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          name: "Test App",
          packageName: "com.test.app",
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.packageName).toBe("com.test.app");
    });

    it("POST /apps should reject pure TESTER user with 403 Forbidden", async () => {
      const testerUserId = "a0000000-0000-0000-0000-000000000002";
      const token = app.jwt.sign({ sub: testerUserId, email: "tester@calltest.com", role: UserRole.TESTER });

      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: testerUserId,
        email: "tester@calltest.com",
        role: UserRole.TESTER,
        status: UserStatus.ACTIVE,
        displayName: "Tester User",
      } as any);

      const response = await app.inject({
        method: "POST",
        url: "/apps",
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          name: "Test App",
          packageName: "com.test.app",
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe("Protected Campaign Endpoints", () => {
    it("POST /campaigns/:id/transition should transition state", async () => {
      const devUserId = "a0000000-0000-0000-0000-000000000001";
      const token = app.jwt.sign({ sub: devUserId, email: "dev@calltest.com", role: UserRole.DEVELOPER });

      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: devUserId,
        email: "dev@calltest.com",
        role: UserRole.DEVELOPER,
        status: UserStatus.ACTIVE,
        displayName: "Dev One",
      } as any);

      const campaignId = "c0000000-0000-0000-0000-000000000001";
      vi.spyOn(prisma.campaign, "findUnique").mockResolvedValue({
        id: campaignId,
        appId: "b0000000-0000-0000-0000-000000000001",
        name: "Alpha Test",
        status: CampaignStatus.DRAFT,
        targetTesters: 12,
        maxTesters: 15,
        durationDays: 14,
        startsAt: null,
        endsAt: null,
        app: {
          developerId: devUserId,
        },
      } as any);

      vi.spyOn(prisma.campaign, "update").mockResolvedValue({
        id: campaignId,
        appId: "b0000000-0000-0000-0000-000000000001",
        name: "Alpha Test",
        status: CampaignStatus.READY,
        targetTesters: 12,
        maxTesters: 15,
        durationDays: 14,
        startsAt: null,
        endsAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

      const response = await app.inject({
        method: "POST",
        url: `/campaigns/${campaignId}/transition`,
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          targetStatus: CampaignStatus.READY,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe(CampaignStatus.READY);
    });
  });
});
