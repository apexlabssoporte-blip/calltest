import { describe, it, expect, vi, beforeEach } from "vitest";
import { AppService } from "../src/modules/apps/service.js";
import { prisma } from "../src/core/database/prisma.js";
import { AppStatus, UserRole } from "@calltest/shared-types";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../src/core/errors/app-error.js";

describe("AppService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("createApp", () => {
    it("should create an app with valid package name and DRAFT status", async () => {
      vi.spyOn(prisma.app, "findFirst").mockResolvedValue(null);
      const mockApp = {
        id: "app-uuid-1",
        developerId: "dev-uuid-1",
        name: "My Awesome App",
        packageName: "com.awesome.app",
        status: AppStatus.DRAFT,
        apiKey: "apk_12345",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.spyOn(prisma.app, "create").mockResolvedValue(mockApp as any);
      vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

      const app = await AppService.createApp("dev-uuid-1", {
        name: "My Awesome App",
        packageName: "com.awesome.app",
      });

      expect(app.id).toBe("app-uuid-1");
      expect(app.status).toBe(AppStatus.DRAFT);
      expect(app.packageName).toBe("com.awesome.app");
    });

    it("should reject invalid Android package name format", async () => {
      await expect(
        AppService.createApp("dev-uuid-1", {
          name: "Invalid App",
          packageName: "not-a-valid-package-name",
        }),
      ).rejects.toThrow(BadRequestError);
    });

    it("should reject duplicate active package name for the same developer", async () => {
      vi.spyOn(prisma.app, "findFirst").mockResolvedValue({
        id: "app-existing",
        developerId: "dev-uuid-1",
        packageName: "com.duplicate.app",
        status: AppStatus.ACTIVE,
      } as any);

      await expect(
        AppService.createApp("dev-uuid-1", {
          name: "Duplicate App",
          packageName: "com.duplicate.app",
        }),
      ).rejects.toThrow(ConflictError);
    });
  });

  describe("Ownership & IDOR Protection", () => {
    it("should allow developer to access their own app", async () => {
      vi.spyOn(prisma.app, "findUnique").mockResolvedValue({
        id: "app-1",
        developerId: "dev-1",
        name: "Dev 1 App",
      } as any);

      const app = await AppService.getAppById("app-1", "dev-1", UserRole.DEVELOPER);
      expect(app.id).toBe("app-1");
    });

    it("should prevent Developer A from accessing Developer B's app (IDOR prevention)", async () => {
      vi.spyOn(prisma.app, "findUnique").mockResolvedValue({
        id: "app-b",
        developerId: "dev-b",
        name: "Dev B App",
      } as any);

      await expect(
        AppService.getAppById("app-b", "dev-a", UserRole.DEVELOPER),
      ).rejects.toThrow(ForbiddenError);
    });

    it("should allow ADMIN to access any developer's app", async () => {
      vi.spyOn(prisma.app, "findUnique").mockResolvedValue({
        id: "app-b",
        developerId: "dev-b",
        name: "Dev B App",
      } as any);

      const app = await AppService.getAppById("app-b", "admin-1", UserRole.ADMIN);
      expect(app.id).toBe("app-b");
    });

    it("should throw NotFoundError if app does not exist", async () => {
      vi.spyOn(prisma.app, "findUnique").mockResolvedValue(null);

      await expect(
        AppService.getAppById("app-nonexistent", "dev-1", UserRole.DEVELOPER),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("deleteApp (Soft Delete / Archive)", () => {
    it("should soft delete app by setting status to ARCHIVED without deleting rows", async () => {
      vi.spyOn(prisma.app, "findUnique").mockResolvedValue({
        id: "app-1",
        developerId: "dev-1",
        status: AppStatus.ACTIVE,
      } as any);

      const updateSpy = vi.spyOn(prisma.app, "update").mockResolvedValue({
        id: "app-1",
        developerId: "dev-1",
        status: AppStatus.ARCHIVED,
      } as any);

      vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

      const result = await AppService.deleteApp("app-1", "dev-1", UserRole.DEVELOPER);

      expect(result.success).toBe(true);
      expect(updateSpy).toHaveBeenCalledWith({
        where: { id: "app-1" },
        data: { status: AppStatus.ARCHIVED },
      });
    });
  });
});
