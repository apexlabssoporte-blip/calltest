import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/core/database/prisma.js";
import {
  UserRole,
  UserStatus,
  NotificationStatus,
  NotificationPriority,
  NotificationChannel,
  NotificationType,
} from "@calltest/shared-types";
import { NotificationRepository } from "../src/modules/notifications/repository.js";

describe("Phase 6 Notification API End-to-End Integration", () => {
  const app = buildApp();
  let userToken: string;
  let otherUserToken: string;

  const userId = "a0000000-0000-0000-0000-000000000001";
  const otherUserId = "a0000000-0000-0000-0000-000000000002";

  beforeAll(async () => {
    await app.ready();
    userToken = app.jwt.sign({ sub: userId, email: "user@calltest.com", role: UserRole.TESTER });
    otherUserToken = app.jwt.sign({ sub: otherUserId, email: "other@calltest.com", role: UserRole.TESTER });
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("In-App Notification Endpoints", () => {
    it("GET /notifications: should return paginated notifications with bounded limit", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: userId,
        role: UserRole.TESTER,
        status: UserStatus.ACTIVE,
      } as any);

      vi.spyOn(NotificationRepository, "getUserNotifications").mockResolvedValue({
        notifications: [
          {
            id: "n-1",
            userId,
            type: NotificationType.TESTER_CAMPAIGN_AVAILABLE,
            title: "Nueva campaña",
            body: "Campaña disponible",
            data: null,
            status: NotificationStatus.SENT,
            priority: NotificationPriority.NORMAL,
            channel: NotificationChannel.IN_APP,
            readAt: null,
            createdAt: new Date(),
          },
        ] as any,
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      const response = await app.inject({
        method: "GET",
        url: "/notifications?page=1&limit=20",
        headers: { authorization: `Bearer ${userToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.notifications.length).toBe(1);
      expect(body.total).toBe(1);
      expect(body.notifications[0].title).toBe("Nueva campaña");
    });

    it("GET /notifications/unread-count: should return unread count", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: userId,
        role: UserRole.TESTER,
        status: UserStatus.ACTIVE,
      } as any);

      vi.spyOn(NotificationRepository, "getUnreadCount").mockResolvedValue(4);

      const response = await app.inject({
        method: "GET",
        url: "/notifications/unread-count",
        headers: { authorization: `Bearer ${userToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.unreadCount).toBe(4);
    });

    it("POST /notifications/:id/read: should mark single notification as read", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: userId,
        role: UserRole.TESTER,
        status: UserStatus.ACTIVE,
      } as any);

      vi.spyOn(NotificationRepository, "markAsRead").mockResolvedValue({
        id: "n-1",
        status: NotificationStatus.READ,
        readAt: new Date("2026-08-22T06:00:00Z"),
      } as any);

      const response = await app.inject({
        method: "POST",
        url: "/notifications/b0000000-0000-0000-0000-000000000001/read",
        headers: { authorization: `Bearer ${userToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe(NotificationStatus.READ);
    });

    it("IDOR GUARD: User A cannot mark notification belonging to User B as read", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: otherUserId,
        role: UserRole.TESTER,
        status: UserStatus.ACTIVE,
      } as any);

      // Notification belongs to User A, but User B is requesting
      vi.spyOn(prisma.notification, "findFirst").mockResolvedValue(null);

      const response = await app.inject({
        method: "POST",
        url: "/notifications/b0000000-0000-0000-0000-000000000001/read",
        headers: { authorization: `Bearer ${otherUserToken}` },
      });

      expect(response.statusCode).toBe(404);
    });

    it("POST /notifications/read-all: should mark all unread as read", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: userId,
        role: UserRole.TESTER,
        status: UserStatus.ACTIVE,
      } as any);

      vi.spyOn(NotificationRepository, "markAllAsRead").mockResolvedValue({
        count: 5,
        markedAt: new Date(),
      });

      const response = await app.inject({
        method: "POST",
        url: "/notifications/read-all",
        headers: { authorization: `Bearer ${userToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.count).toBe(5);
    });
  });

  describe("Preferences & Device Push Token", () => {
    it("GET & PATCH /notifications/preferences: should retrieve and update user preferences", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: userId,
        role: UserRole.TESTER,
        status: UserStatus.ACTIVE,
      } as any);

      vi.spyOn(NotificationRepository, "getPreferences").mockResolvedValue({
        userId,
        campaignNotifications: true,
        missionNotifications: true,
        trustNotifications: true,
        systemNotifications: true,
        pushNotifications: true,
      } as any);

      const getRes = await app.inject({
        method: "GET",
        url: "/notifications/preferences",
        headers: { authorization: `Bearer ${userToken}` },
      });

      expect(getRes.statusCode).toBe(200);
      expect(JSON.parse(getRes.body).campaignNotifications).toBe(true);

      vi.spyOn(NotificationRepository, "updatePreferences").mockResolvedValue({
        userId,
        campaignNotifications: false,
        missionNotifications: true,
        trustNotifications: true,
        systemNotifications: true,
        pushNotifications: false,
      } as any);

      const patchRes = await app.inject({
        method: "PATCH",
        url: "/notifications/preferences",
        headers: { authorization: `Bearer ${userToken}` },
        payload: {
          campaignNotifications: false,
          pushNotifications: false,
        },
      });

      expect(patchRes.statusCode).toBe(200);
      const patchBody = JSON.parse(patchRes.body);
      expect(patchBody.campaignNotifications).toBe(false);
      expect(patchBody.pushNotifications).toBe(false);
    });

    it("POST /notifications/device-token: should register device token securely", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: userId,
        role: UserRole.TESTER,
        status: UserStatus.ACTIVE,
      } as any);

      vi.spyOn(NotificationRepository, "registerDeviceToken").mockResolvedValue({} as any);

      const response = await app.inject({
        method: "POST",
        url: "/notifications/device-token",
        headers: { authorization: `Bearer ${userToken}` },
        payload: {
          token: "fcm_token_sample_1234567890",
          platform: "android",
        },
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body).success).toBe(true);
    });
  });
});
