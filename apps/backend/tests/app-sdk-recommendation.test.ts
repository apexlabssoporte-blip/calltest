import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/core/database/prisma.js";
import {
  AuditAction,
  SdkIntegrationStatus,
  UserRole,
  UserStatus,
} from "@calltest/shared-types";
import { eventBus } from "../src/core/events/domain-event-bus.js";
import { AppService } from "../src/modules/apps/service.js";

describe("Phase 8.1: SDK Recommendation & Integration Choice", () => {
  const app = buildApp();
  let devToken: string;
  let otherDevToken: string;
  let testerToken: string;

  const devId = "d0000000-0000-0000-0000-000000000001";
  const otherDevId = "d0000000-0000-0000-0000-000000000002";
  const testerId = "t0000000-0000-0000-0000-000000000001";
  const appId = "a0000000-0000-0000-0000-000000000001";

  beforeAll(async () => {
    await app.ready();
    devToken = app.jwt.sign({ sub: devId, email: "dev@calltest.com", role: UserRole.DEVELOPER });
    otherDevToken = app.jwt.sign({ sub: otherDevId, email: "otherdev@calltest.com", role: UserRole.DEVELOPER });
    testerToken = app.jwt.sign({ sub: testerId, email: "tester@calltest.com", role: UserRole.TESTER });
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Backend Service Layer", () => {
    it("should create an app with SDK_ENABLED and set hasCallTestSdk to true", async () => {
      vi.spyOn(prisma.app, "findFirst").mockResolvedValue(null);
      vi.spyOn(prisma.app, "create").mockResolvedValue({
        id: appId,
        developerId: devId,
        name: "SDK Test App",
        packageName: "com.sdk.app",
        hasCallTestSdk: true,
        sdkIntegrationStatus: SdkIntegrationStatus.SDK_ENABLED,
        status: "DRAFT",
        apiKey: "apk_123",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

      const result = await AppService.createApp(devId, {
        name: "SDK Test App",
        packageName: "com.sdk.app",
        sdkIntegrationStatus: SdkIntegrationStatus.SDK_ENABLED,
      });

      expect(result.sdkIntegrationStatus).toBe(SdkIntegrationStatus.SDK_ENABLED);
      expect(result.hasCallTestSdk).toBe(true);
    });

    it("should create an app with NO_SDK and set hasCallTestSdk to false", async () => {
      vi.spyOn(prisma.app, "findFirst").mockResolvedValue(null);
      vi.spyOn(prisma.app, "create").mockResolvedValue({
        id: appId,
        developerId: devId,
        name: "No SDK App",
        packageName: "com.nosdk.app",
        hasCallTestSdk: false,
        sdkIntegrationStatus: SdkIntegrationStatus.NO_SDK,
        status: "DRAFT",
        apiKey: "apk_123",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

      const result = await AppService.createApp(devId, {
        name: "No SDK App",
        packageName: "com.nosdk.app",
        sdkIntegrationStatus: SdkIntegrationStatus.NO_SDK,
      });

      expect(result.sdkIntegrationStatus).toBe(SdkIntegrationStatus.NO_SDK);
      expect(result.hasCallTestSdk).toBe(false);
    });

    it("should update SDK status and emit APP_SDK_STATUS_CHANGED audit log and domain event", async () => {
      vi.spyOn(prisma.app, "findUnique").mockResolvedValue({
        id: appId,
        developerId: devId,
        sdkIntegrationStatus: SdkIntegrationStatus.NO_SDK,
      } as any);

      vi.spyOn(prisma.app, "update").mockResolvedValue({
        id: appId,
        developerId: devId,
        name: "Switching App",
        packageName: "com.switch.app",
        hasCallTestSdk: true,
        sdkIntegrationStatus: SdkIntegrationStatus.SDK_ENABLED,
        status: "DRAFT",
        apiKey: "apk_123",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const auditSpy = vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);
      const publishSpy = vi.spyOn(eventBus, "publish");

      const result = await AppService.updateSdkStatus(
        appId,
        devId,
        UserRole.DEVELOPER,
        SdkIntegrationStatus.SDK_ENABLED,
      );

      expect(result.sdkIntegrationStatus).toBe(SdkIntegrationStatus.SDK_ENABLED);
      expect(result.hasCallTestSdk).toBe(true);

      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: AuditAction.APP_SDK_STATUS_CHANGED,
            changes: {
              previousStatus: SdkIntegrationStatus.NO_SDK,
              newStatus: SdkIntegrationStatus.SDK_ENABLED,
            },
          }),
        }),
      );

      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "app.sdk_status_changed",
          payload: expect.objectContaining({
            appId,
            previousStatus: SdkIntegrationStatus.NO_SDK,
            newStatus: SdkIntegrationStatus.SDK_ENABLED,
          }),
        }),
      );
    });
  });

  describe("API Endpoints & RBAC / IDOR Protection", () => {
    it("PATCH /apps/:id/sdk-status: Owner developer can change SDK status", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: devId,
        role: UserRole.DEVELOPER,
        status: UserStatus.ACTIVE,
      } as any);

      vi.spyOn(AppService, "updateSdkStatus").mockResolvedValue({
        id: appId,
        developerId: devId,
        name: "App 1",
        packageName: "com.app.one",
        platform: "ANDROID",
        status: "DRAFT",
        hasCallTestSdk: true,
        sdkIntegrationStatus: SdkIntegrationStatus.SDK_ENABLED,
        description: null,
        playStoreUrl: null,
        googleGroupUrl: null,
        apiKey: "apk_123",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const response = await app.inject({
        method: "PATCH",
        url: `/apps/${appId}/sdk-status`,
        headers: { authorization: `Bearer ${devToken}` },
        payload: {
          sdkIntegrationStatus: SdkIntegrationStatus.SDK_ENABLED,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.sdkIntegrationStatus).toBe("SDK_ENABLED");
      expect(body.hasCallTestSdk).toBe(true);
    });

    it("RBAC GUARD: Tester cannot modify app SDK status (403 Forbidden)", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: testerId,
        role: UserRole.TESTER,
        status: UserStatus.ACTIVE,
      } as any);

      const response = await app.inject({
        method: "PATCH",
        url: `/apps/${appId}/sdk-status`,
        headers: { authorization: `Bearer ${testerToken}` },
        payload: {
          sdkIntegrationStatus: SdkIntegrationStatus.SDK_ENABLED,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it("IDOR GUARD: Non-owner developer rejected when modifying app SDK status", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: otherDevId,
        role: UserRole.DEVELOPER,
        status: UserStatus.ACTIVE,
      } as any);

      vi.spyOn(AppService, "updateSdkStatus").mockRejectedValue(
        new Error("You do not have access to this application"),
      );

      const response = await app.inject({
        method: "PATCH",
        url: `/apps/${appId}/sdk-status`,
        headers: { authorization: `Bearer ${otherDevToken}` },
        payload: {
          sdkIntegrationStatus: SdkIntegrationStatus.SDK_ENABLED,
        },
      });

      expect(response.statusCode).toBe(500);
    });
  });
});
