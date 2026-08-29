import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/core/database/prisma.js";
import { UserRole, UserStatus } from "@calltest/shared-types";
import { AdminService } from "../src/modules/admin/service.js";

describe("Phase 11.1: Admin Security & RBAC Strictness Audit", () => {
  const app = buildApp();

  const testerId = "10000000-0000-0000-0000-000000000001";
  const devId = "20000000-0000-0000-0000-000000000002";
  const bothId = "30000000-0000-0000-0000-000000000003";
  const adminId = "40000000-0000-0000-0000-000000000004";
  const targetUserId = "50000000-0000-0000-0000-000000000005";

  let testerToken: string;
  let devToken: string;
  let bothToken: string;
  let adminToken: string;

  beforeAll(async () => {
    await app.ready();
    testerToken = app.jwt.sign({ sub: testerId, email: "tester@calltest.com", role: UserRole.TESTER });
    devToken = app.jwt.sign({ sub: devId, email: "dev@calltest.com", role: UserRole.DEVELOPER });
    bothToken = app.jwt.sign({ sub: bothId, email: "both@calltest.com", role: UserRole.BOTH });
    adminToken = app.jwt.sign({ sub: adminId, email: "admin@calltest.com", role: UserRole.ADMIN });
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("1. Strict RBAC Enforcement on /admin/*", () => {
    it("TESTER -> 403 Forbidden", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({ id: testerId, role: UserRole.TESTER, status: UserStatus.ACTIVE } as any);
      const res = await app.inject({
        method: "GET",
        url: "/admin/users",
        headers: { authorization: `Bearer ${testerToken}` },
      });
      expect(res.statusCode).toBe(403);
    });

    it("DEVELOPER -> 403 Forbidden", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({ id: devId, role: UserRole.DEVELOPER, status: UserStatus.ACTIVE } as any);
      const res = await app.inject({
        method: "GET",
        url: "/admin/users",
        headers: { authorization: `Bearer ${devToken}` },
      });
      expect(res.statusCode).toBe(403);
    });

    it("BOTH -> 403 Forbidden (verifying BOTH != ADMIN)", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({ id: bothId, role: UserRole.BOTH, status: UserStatus.ACTIVE } as any);
      const res = await app.inject({
        method: "GET",
        url: "/admin/users",
        headers: { authorization: `Bearer ${bothToken}` },
      });
      expect(res.statusCode).toBe(403);
    });

    it("ADMIN -> 200 OK", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({ id: adminId, role: UserRole.ADMIN, status: UserStatus.ACTIVE } as any);
      vi.spyOn(prisma.user, "count").mockResolvedValue(0);
      vi.spyOn(prisma.user, "findMany").mockResolvedValue([]);

      const res = await app.inject({
        method: "GET",
        url: "/admin/users",
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(res.statusCode).toBe(200);
    });
  });

  describe("2. Mandatory Reasons for Punitive Actions", () => {
    it("should reject suspension without reason", async () => {
      await expect(
        AdminService.suspendUser(targetUserId, adminId, ""),
      ).rejects.toThrow(/mandatory/i);
    });

    it("should reject ban without reason", async () => {
      await expect(
        AdminService.banUser(targetUserId, adminId, "  "),
      ).rejects.toThrow(/mandatory/i);
    });
  });
});
