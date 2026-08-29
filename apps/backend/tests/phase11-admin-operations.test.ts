import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/core/database/prisma.js";
import {
  EvidenceStatus,
  UserRole,
  UserStatus,
} from "@calltest/shared-types";
import { AdminService } from "../src/modules/admin/service.js";

describe("Phase 11: Admin Operations & Oversight", () => {
  const app = buildApp();

  const adminId = "a0000000-0000-0000-0000-000000000001";
  const tester1Id = "10000000-0000-0000-0000-000000000001";
  const devId = "d0000000-0000-0000-0000-000000000001";
  const evidence1Id = "e0000000-0000-0000-0000-000000000001";

  let adminToken: string;
  let devToken: string;

  beforeAll(async () => {
    await app.ready();
    adminToken = app.jwt.sign({ sub: adminId, email: "admin@calltest.com", role: UserRole.ADMIN });
    devToken = app.jwt.sign({ sub: devId, email: "dev@calltest.com", role: UserRole.DEVELOPER });
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("1. User Administration & Listing", () => {
    it("should allow ADMIN to search and list users with pagination", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: adminId,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      } as any);

      vi.spyOn(prisma.user, "count").mockResolvedValue(1);
      vi.spyOn(prisma.user, "findMany").mockResolvedValue([
        {
          id: tester1Id,
          email: "tester1@calltest.com",
          displayName: "Tester One",
          role: UserRole.TESTER,
          status: UserStatus.ACTIVE,
          xpBalance: 50,
          goldBalance: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any,
      ]);

      const response = await app.inject({
        method: "GET",
        url: "/admin/users?page=1&limit=10&role=TESTER",
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.total).toBe(1);
      expect(body.items.length).toBe(1);
      expect(body.items[0].email).toBe("tester1@calltest.com");
    });

    it("should block non-ADMIN users from accessing /admin/users with 403", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: devId,
        role: UserRole.DEVELOPER,
        status: UserStatus.ACTIVE,
      } as any);

      const response = await app.inject({
        method: "GET",
        url: "/admin/users",
        headers: { authorization: `Bearer ${devToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it("should retrieve sanitized comprehensive user details for admin", async () => {
      vi.spyOn(prisma.user, "findUnique").mockImplementation(async ({ where }: any) => {
        if (where.id === adminId) {
          return { id: adminId, role: UserRole.ADMIN, status: UserStatus.ACTIVE } as any;
        }
        return {
          id: tester1Id,
          email: "tester1@calltest.com",
          displayName: "Tester One",
          role: UserRole.TESTER,
          status: UserStatus.ACTIVE,
          trustScore: 85,
          rank: "RELIABLE",
          xpBalance: 120,
          goldBalance: 24,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any;
      });

      vi.spyOn(prisma.campaignTester, "count").mockResolvedValue(2);
      vi.spyOn(prisma.auditLog, "findMany").mockResolvedValue([]);

      const response = await app.inject({
        method: "GET",
        url: `/admin/users/${tester1Id}`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.id).toBe(tester1Id);
      expect(body.trustScore).toBe(85);
      expect(body.activeCampaignsCount).toBe(2);
    });
  });

  describe("2. Palliative & Punitive User Actions (Suspend / Ban)", () => {
    it("should suspend user idempotently and log audit event", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: tester1Id,
        status: UserStatus.ACTIVE,
      } as any);

      const userUpdateSpy = vi.spyOn(prisma.user, "update").mockResolvedValue({
        id: tester1Id,
        status: UserStatus.SUSPENDED,
      } as any);

      const auditSpy = vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

      const result = await AdminService.suspendUser(tester1Id, adminId, "Suspicious farming detected");
      expect(result.status).toBe(UserStatus.SUSPENDED);
      expect(userUpdateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: tester1Id },
          data: { status: UserStatus.SUSPENDED },
        }),
      );
      expect(auditSpy).toHaveBeenCalled();
    });

    it("should unsuspend user and restore to ACTIVE", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: tester1Id,
        status: UserStatus.SUSPENDED,
      } as any);

      const userUpdateSpy = vi.spyOn(prisma.user, "update").mockResolvedValue({
        id: tester1Id,
        status: UserStatus.ACTIVE,
      } as any);

      vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

      const result = await AdminService.unsuspendUser(tester1Id, adminId, "False positive confirmed");
      expect(result.status).toBe(UserStatus.ACTIVE);
      expect(userUpdateSpy).toHaveBeenCalled();
    });
  });

  describe("3. Evidence Review Admin", () => {
    it("should list pending evidence submissions across campaigns", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: adminId,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      } as any);

      vi.spyOn(prisma.missionEvidence, "count").mockResolvedValue(1);
      vi.spyOn(prisma.missionEvidence, "findMany").mockResolvedValue([
        {
          id: evidence1Id,
          missionAttemptId: "att-1",
          testerId: tester1Id,
          campaignId: "c-1",
          status: EvidenceStatus.PENDING_REVIEW,
          fileReference: "uploads/evidence_1.png",
          sha256: "hash123",
          mimeType: "image/png",
          fileSize: 1024,
          rejectionReason: null,
          createdAt: new Date(),
          reviewedAt: null,
        } as any,
      ]);

      const response = await app.inject({
        method: "GET",
        url: "/admin/evidence/pending",
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.items.length).toBe(1);
      expect(body.items[0].sha256Hash).toBe("hash123");
    });
  });

  describe("4. Operational Reviews & Disputes", () => {
    it("should create and update an operational dispute ticket", async () => {
      const created = await AdminService.createReviewDispute(adminId, {
        entityType: "CAMPAIGN_ASSIGNMENT",
        entityId: "ct-100",
        reason: "Tester disputed premature removal",
      });

      expect(created.status).toBe("OPEN");
      expect(created.entityType).toBe("CAMPAIGN_ASSIGNMENT");

      const updated = await AdminService.updateReviewDispute(created.id, adminId, {
        status: "RESOLVED" as any,
        resolution: "Reinstated tester with compensation",
      });

      expect(updated.status).toBe("RESOLVED");
      expect(updated.resolution).toBe("Reinstated tester with compensation");
    });
  });
});
