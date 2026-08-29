import crypto from "node:crypto";
import { prisma } from "../../core/database/prisma.js";
import { isValidAndroidPackageName } from "./validators.js";
import { verifyAppOwnership } from "../../core/middlewares/rbac-guard.js";
import { AuditService } from "../../core/services/audit-service.js";
import { BadRequestError, ConflictError } from "../../core/errors/app-error.js";
import {
  AppStatus,
  AuditAction,
  SdkIntegrationStatus,
  UserRole,
} from "@calltest/shared-types";
import { CreateAppRequest, UpdateAppRequest } from "./schemas.js";
import { eventBus } from "../../core/events/domain-event-bus.js";

export class AppService {
  /**
   * Creates a new Android application for a developer.
   * Enforces Android package name formatting and uniqueness per active developer apps.
   */
  public static async createApp(
    developerId: string,
    data: CreateAppRequest,
    context?: { ipAddress?: string; userAgent?: string },
  ) {
    const trimmedPackageName = data.packageName.trim();

    if (!isValidAndroidPackageName(trimmedPackageName)) {
      throw new BadRequestError(
        "Invalid Android package name format. Must be at least two dot-separated segments (e.g. com.example.app)",
      );
    }

    // Check if this developer already has an active (non-archived) app with this package name
    const existingActiveApp = await prisma.app.findFirst({
      where: {
        developerId,
        packageName: trimmedPackageName,
        status: {
          not: AppStatus.ARCHIVED,
        },
      },
    });

    if (existingActiveApp) {
      throw new ConflictError(
        `You already have an active application with package name '${trimmedPackageName}'`,
      );
    }

    const apiKey = `apk_${crypto.randomBytes(24).toString("hex")}`;

    let sdkStatus = data.sdkIntegrationStatus ?? SdkIntegrationStatus.NOT_CONFIGURED;
    let hasSdk = data.hasCallTestSdk ?? false;

    if (data.sdkIntegrationStatus === SdkIntegrationStatus.SDK_ENABLED) {
      hasSdk = true;
    } else if (data.hasCallTestSdk === true) {
      sdkStatus = SdkIntegrationStatus.SDK_ENABLED;
      hasSdk = true;
    }

    const app = await prisma.app.create({
      data: {
        developerId,
        name: data.name.trim(),
        packageName: trimmedPackageName,
        description: data.description?.trim(),
        playStoreUrl: data.playStoreUrl?.trim(),
        googleGroupUrl: data.googleGroupUrl?.trim(),
        hasCallTestSdk: hasSdk,
        sdkIntegrationStatus: sdkStatus,
        apiKey,
        status: AppStatus.DRAFT,
      },
    });

    await AuditService.log({
      userId: developerId,
      action: AuditAction.APP_CREATED,
      entityName: "App",
      entityId: app.id,
      changes: {
        name: app.name,
        packageName: app.packageName,
        hasCallTestSdk: app.hasCallTestSdk,
        sdkIntegrationStatus: app.sdkIntegrationStatus,
      },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    return app;
  }

  /**
   * Lists apps owned by the developer (or all non-archived apps for admin).
   */
  public static async listApps(userId: string, userRole: UserRole) {
    if (userRole === UserRole.ADMIN) {
      return prisma.app.findMany({
        where: {
          status: {
            not: AppStatus.ARCHIVED,
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }

    return prisma.app.findMany({
      where: {
        developerId: userId,
        status: {
          not: AppStatus.ARCHIVED,
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Retrieves an app by ID with IDOR protection.
   */
  public static async getAppById(appId: string, userId: string, userRole: UserRole) {
    return verifyAppOwnership(appId, userId, userRole);
  }

  /**
   * Updates an app's metadata or status.
   */
  public static async updateApp(
    appId: string,
    userId: string,
    userRole: UserRole,
    data: UpdateAppRequest,
    context?: { ipAddress?: string; userAgent?: string },
  ) {
    const existingApp = await verifyAppOwnership(appId, userId, userRole);

    let updatedPackageName = existingApp.packageName;
    if (data.packageName && data.packageName.trim() !== existingApp.packageName) {
      const trimmed = data.packageName.trim();
      if (!isValidAndroidPackageName(trimmed)) {
        throw new BadRequestError("Invalid Android package name format");
      }

      const duplicate = await prisma.app.findFirst({
        where: {
          developerId: existingApp.developerId,
          packageName: trimmed,
          id: { not: appId },
          status: { not: AppStatus.ARCHIVED },
        },
      });

      if (duplicate) {
        throw new ConflictError(
          `You already have an active application with package name '${trimmed}'`,
        );
      }

      updatedPackageName = trimmed;
    }

    let updatedSdkStatus = data.sdkIntegrationStatus;
    let updatedHasSdk = data.hasCallTestSdk;

    if (data.sdkIntegrationStatus === SdkIntegrationStatus.SDK_ENABLED) {
      updatedHasSdk = true;
    } else if (data.sdkIntegrationStatus === SdkIntegrationStatus.NO_SDK) {
      updatedHasSdk = false;
    }

    const previousStatus = existingApp.sdkIntegrationStatus;

    const updatedApp = await prisma.app.update({
      where: { id: appId },
      data: {
        name: data.name ? data.name.trim() : undefined,
        packageName: updatedPackageName,
        description: data.description !== undefined ? data.description?.trim() : undefined,
        playStoreUrl: data.playStoreUrl !== undefined ? data.playStoreUrl?.trim() : undefined,
        googleGroupUrl: data.googleGroupUrl !== undefined ? data.googleGroupUrl?.trim() : undefined,
        hasCallTestSdk: updatedHasSdk !== undefined ? updatedHasSdk : undefined,
        sdkIntegrationStatus: updatedSdkStatus !== undefined ? updatedSdkStatus : undefined,
        status: data.status !== undefined ? data.status : undefined,
      },
    });

    if (updatedSdkStatus && updatedSdkStatus !== previousStatus) {
      await AuditService.log({
        userId,
        action: AuditAction.APP_SDK_STATUS_CHANGED,
        entityName: "App",
        entityId: appId,
        changes: {
          previousStatus,
          newStatus: updatedSdkStatus,
        },
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      });

      await eventBus.publish({
        id: `evt_app_sdk_${appId}_${Date.now()}`,
        type: "app.sdk_status_changed",
        occurredAt: new Date(),
        payload: {
          appId,
          developerId: existingApp.developerId,
          previousStatus,
          newStatus: updatedSdkStatus,
        },
      });
    } else {
      await AuditService.log({
        userId,
        action: AuditAction.APP_UPDATED,
        entityName: "App",
        entityId: appId,
        changes: data as Record<string, unknown>,
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      });
    }

    return updatedApp;
  }

  /**
   * Dedicated method for setting SDK integration choice during registration/dashboard.
   */
  public static async updateSdkStatus(
    appId: string,
    userId: string,
    userRole: UserRole,
    status: SdkIntegrationStatus,
    context?: { ipAddress?: string; userAgent?: string },
  ) {
    const existingApp = await verifyAppOwnership(appId, userId, userRole);
    const previousStatus = existingApp.sdkIntegrationStatus;
    const hasSdk = status === SdkIntegrationStatus.SDK_ENABLED;

    const updatedApp = await prisma.app.update({
      where: { id: appId },
      data: {
        sdkIntegrationStatus: status,
        hasCallTestSdk: hasSdk,
      },
    });

    await AuditService.log({
      userId,
      action: AuditAction.APP_SDK_STATUS_CHANGED,
      entityName: "App",
      entityId: appId,
      changes: {
        previousStatus,
        newStatus: status,
      },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    await eventBus.publish({
      id: `evt_app_sdk_${appId}_${Date.now()}`,
      type: "app.sdk_status_changed",
      occurredAt: new Date(),
      payload: {
        appId,
        developerId: existingApp.developerId,
        previousStatus,
        newStatus: status,
      },
    });

    return updatedApp;
  }

  /**
   * Soft deletes / archives an application without destroying historical campaigns or data.
   */
  public static async deleteApp(
    appId: string,
    userId: string,
    userRole: UserRole,
    context?: { ipAddress?: string; userAgent?: string },
  ) {
    await verifyAppOwnership(appId, userId, userRole);

    const archivedApp = await prisma.app.update({
      where: { id: appId },
      data: {
        status: AppStatus.ARCHIVED,
      },
    });

    await AuditService.log({
      userId,
      action: AuditAction.APP_ARCHIVED,
      entityName: "App",
      entityId: appId,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    return {
      success: true,
      message: "Application archived successfully",
      app: archivedApp,
    };
  }
}
