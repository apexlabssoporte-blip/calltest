import { describe, it, expect, vi, beforeEach } from "vitest";
import { NotificationService } from "../src/modules/notifications/service.js";
import { NotificationPolicyService } from "../src/modules/notifications/policies/notification-policy.service.js";
import { prisma } from "../src/core/database/prisma.js";
import {
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
  NotificationType,
} from "@calltest/shared-types";
import { NoopPushProvider } from "../src/modules/notifications/providers/noop-push.provider.js";

describe("NotificationService, Policies & Idempotency", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const userId = "u0000000-0000-0000-0000-000000000001";

  it("should create notification with rendered template and deterministic deduplication key", async () => {
    vi.spyOn(prisma.notificationPreference, "findUnique").mockResolvedValue({
      userId,
      campaignNotifications: true,
      missionNotifications: true,
      trustNotifications: true,
      systemNotifications: true,
      pushNotifications: false,
    } as any);

    vi.spyOn(prisma.notification, "findUnique").mockResolvedValue(null);
    vi.spyOn(prisma, "$transaction").mockImplementation(async (callback: any) => {
      return callback({
        notification: {
          create: vi.fn().mockResolvedValue({
            id: "notif-1",
            userId,
            type: NotificationType.TESTER_CAMPAIGN_AVAILABLE,
            title: "Nueva campaña disponible",
            body: "Tienes una nueva campaña de prueba disponible: Test App.",
            status: NotificationStatus.SENT,
            priority: NotificationPriority.NORMAL,
            channel: NotificationChannel.IN_APP,
            deduplicationKey: `TESTER_CAMPAIGN_AVAILABLE_${userId}_evt-1`,
            createdAt: new Date(),
          }),
        },
      });
    });

    const notif = await NotificationService.dispatch({
      userId,
      type: NotificationType.TESTER_CAMPAIGN_AVAILABLE,
      params: { appName: "Test App" },
      sourceEventId: "evt-1",
    });

    expect(notif).toBeDefined();
    expect(notif?.title).toBe("Nueva campaña disponible");
    expect(notif?.body).toContain("Test App");
    expect(notif?.priority).toBe(NotificationPriority.NORMAL);
  });

  it("IDEMPOTENCY: should return existing notification without duplicate creation when deduplicationKey matches", async () => {
    const existingNotif = {
      id: "notif-existing",
      userId,
      type: NotificationType.CAMPAIGN_TARGET_REACHED,
      title: "¡Objetivo alcanzado!",
      body: "Tienes 12 testers activos para tu aplicación Test App.",
      status: NotificationStatus.SENT,
      priority: NotificationPriority.NORMAL,
      channel: NotificationChannel.IN_APP,
      deduplicationKey: `CAMPAIGN_TARGET_REACHED_camp-1_12_active`,
      createdAt: new Date(),
    };

    vi.spyOn(prisma.notificationPreference, "findUnique").mockResolvedValue({
      userId,
      campaignNotifications: true,
      missionNotifications: true,
      trustNotifications: true,
      systemNotifications: true,
      pushNotifications: false,
    } as any);

    vi.spyOn(prisma.notification, "findUnique").mockResolvedValue(existingNotif as any);

    const result = await NotificationService.dispatch({
      userId,
      type: NotificationType.CAMPAIGN_TARGET_REACHED,
      params: { campaignId: "camp-1", appName: "Test App" },
    });

    expect(result?.id).toBe("notif-existing");
  });

  it("PREFERENCES: should suppress notification if user has disabled the category", async () => {
    vi.spyOn(prisma.notificationPreference, "findUnique").mockResolvedValue({
      userId,
      campaignNotifications: false, // Disabled by user
      missionNotifications: true,
      trustNotifications: true,
      systemNotifications: true,
      pushNotifications: true,
    } as any);

    const result = await NotificationService.dispatch({
      userId,
      type: NotificationType.NEW_TESTER_ASSIGNED,
      params: { campaignName: "Beta Campaign" },
    });

    expect(result).toBeNull();
  });

  it("PRIORITY MAPPING: should map critical health events to CRITICAL and warnings to HIGH", async () => {
    const defaultPrefs = {
      userId,
      campaignNotifications: true,
      missionNotifications: true,
      trustNotifications: true,
      systemNotifications: true,
      pushNotifications: true,
    };
    vi.spyOn(prisma.notificationPreference, "findUnique").mockResolvedValue(defaultPrefs as any);

    const criticalPolicy = await NotificationPolicyService.evaluatePolicy({
      userId,
      type: NotificationType.CAMPAIGN_HEALTH_CRITICAL,
    });
    expect(criticalPolicy.priority).toBe(NotificationPriority.CRITICAL);

    const warningPolicy = await NotificationPolicyService.evaluatePolicy({
      userId,
      type: NotificationType.CAMPAIGN_HEALTH_WARNING,
    });
    expect(warningPolicy.priority).toBe(NotificationPriority.HIGH);

    const reminderPolicy = await NotificationPolicyService.evaluatePolicy({
      userId,
      type: NotificationType.MISSION_REMINDER,
    });
    expect(reminderPolicy.priority).toBe(NotificationPriority.LOW);
  });

  it("PUSH PROVIDER: should invoke push provider when push channel is enabled", async () => {
    vi.spyOn(prisma.notificationPreference, "findUnique").mockResolvedValue({
      userId,
      campaignNotifications: true,
      missionNotifications: true,
      trustNotifications: true,
      systemNotifications: true,
      pushNotifications: true, // Push enabled
    } as any);

    vi.spyOn(prisma.notification, "findUnique").mockResolvedValue(null);
    vi.spyOn(prisma, "$transaction").mockImplementation(async (cb: any) =>
      cb({
        notification: {
          create: vi.fn().mockResolvedValue({
            id: "notif-push-1",
            userId,
            type: NotificationType.TRUST_UPDATED,
            title: "Nivel de confianza actualizado",
            body: "Tu rango de confianza ha sido actualizado a RELIABLE.",
            status: NotificationStatus.SENT,
            priority: NotificationPriority.NORMAL,
            channel: NotificationChannel.PUSH,
            createdAt: new Date(),
          }),
        },
      }),
    );

    const pushSpy = vi.spyOn(NoopPushProvider.prototype, "sendPush");

    await NotificationService.dispatch({
      userId,
      type: NotificationType.TRUST_UPDATED,
      params: { trustRank: "RELIABLE" },
    });

    expect(pushSpy).toHaveBeenCalledWith(
      userId,
      "Nivel de confianza actualizado",
      "Tu rango de confianza ha sido actualizado a RELIABLE.",
      {},
    );
  });
});
