import { prisma } from "../../core/database/prisma.js";
import {
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
  NotificationType,
} from "@calltest/shared-types";
import { NotFoundError } from "../../core/errors/app-error.js";

export class NotificationRepository {
  /**
   * Idempotently creates a notification record inside database transaction.
   */
  public static async createNotification(params: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    data?: Record<string, unknown>;
    priority: NotificationPriority;
    channel: NotificationChannel;
    deduplicationKey: string;
  }) {
    const {
      userId,
      type,
      title,
      body,
      data,
      priority,
      channel,
      deduplicationKey,
    } = params;

    // Check existing deduplicationKey
    const existing = await prisma.notification.findUnique({
      where: { deduplicationKey },
    });

    if (existing) {
      return existing;
    }

    return prisma.$transaction(async (tx) => {
      return tx.notification.create({
        data: {
          userId,
          type,
          title,
          body,
          data: data ? JSON.parse(JSON.stringify(data)) : undefined,
          priority,
          channel,
          status: NotificationStatus.SENT,
          sentAt: new Date(),
          deduplicationKey,
        },
      });
    });
  }

  /**
   * Fetches paginated in-app notifications with bounded limit (limit <= 100).
   */
  public static async getUserNotifications(
    userId: string,
    options: { page?: number; limit?: number; unreadOnly?: boolean } = {},
  ) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (options.unreadOnly) {
      where.readAt = null;
    }

    const [total, notifications] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    return {
      notifications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Returns count of unread notifications for a user.
   */
  public static async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: {
        userId,
        readAt: null,
      },
    });
  }

  /**
   * Marks a single notification as read with strict IDOR verification.
   */
  public static async markAsRead(id: string, userId: string) {
    const notification = await prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundError("Notification not found");
    }

    if (notification.readAt) {
      return notification;
    }

    return prisma.notification.update({
      where: { id },
      data: {
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
    });
  }

  /**
   * Marks all unread notifications as read for the authenticated user.
   */
  public static async markAllAsRead(userId: string) {
    const now = new Date();
    const result = await prisma.notification.updateMany({
      where: {
        userId,
        readAt: null,
      },
      data: {
        status: NotificationStatus.READ,
        readAt: now,
      },
    });

    return {
      count: result.count,
      markedAt: now,
    };
  }

  /**
   * Gets or initializes user notification preferences.
   */
  public static async getPreferences(userId: string) {
    return prisma.notificationPreference.upsert({
      where: { userId },
      create: {
        userId,
        campaignNotifications: true,
        missionNotifications: true,
        trustNotifications: true,
        systemNotifications: true,
        pushNotifications: true,
      },
      update: {},
    });
  }

  /**
   * Updates user notification preferences.
   */
  public static async updatePreferences(
    userId: string,
    prefs: {
      campaignNotifications?: boolean;
      missionNotifications?: boolean;
      trustNotifications?: boolean;
      systemNotifications?: boolean;
      pushNotifications?: boolean;
    },
  ) {
    return prisma.notificationPreference.upsert({
      where: { userId },
      create: {
        userId,
        ...prefs,
      },
      update: {
        ...prefs,
      },
    });
  }

  /**
   * Registers a client device push token associated to authenticated user.
   */
  public static async registerDeviceToken(
    userId: string,
    token: string,
    platform = "android",
  ) {
    return prisma.devicePushToken.upsert({
      where: { token },
      create: {
        userId,
        token,
        platform,
        isActive: true,
        lastUsedAt: new Date(),
      },
      update: {
        userId, // Update owner in case of re-login
        isActive: true,
        lastUsedAt: new Date(),
      },
    });
  }

  /**
   * Revokes a device token upon logout.
   */
  public static async revokeDeviceToken(userId: string, token: string) {
    return prisma.devicePushToken.updateMany({
      where: { userId, token },
      data: { isActive: false },
    });
  }
}
