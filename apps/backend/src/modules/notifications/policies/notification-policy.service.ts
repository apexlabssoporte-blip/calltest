import { prisma } from "../../../core/database/prisma.js";
import {
  NotificationChannel,
  NotificationPriority,
  NotificationType,
} from "@calltest/shared-types";
import { NotificationPolicyResult } from "../domain/notification-event.js";

export class NotificationPolicyService {
  /**
   * Evaluates user preferences, priority, channels, and deduplication rules for a notification type.
   */
  public static async evaluatePolicy(params: {
    userId: string;
    type: NotificationType;
    sourceEventId?: string;
    contextParams?: Record<string, unknown>;
  }): Promise<NotificationPolicyResult> {
    const { userId, type, sourceEventId, contextParams } = params;

    // 1. Fetch or initialize user preferences
    let preference = await prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!preference) {
      preference = await prisma.notificationPreference.create({
        data: {
          userId,
          campaignNotifications: true,
          missionNotifications: true,
          trustNotifications: true,
          systemNotifications: true,
          pushNotifications: true,
        },
      });
    }

    // 2. Check Category Permissions
    let shouldSend = true;

    switch (type) {
      case NotificationType.TESTER_CAMPAIGN_AVAILABLE:
      case NotificationType.CAMPAIGN_REMINDER:
      case NotificationType.CAMPAIGN_COMPLETED:
      case NotificationType.CAMPAIGN_PARTICIPATION_THANK_YOU:
      case NotificationType.NEW_TESTER_ASSIGNED:
      case NotificationType.CAMPAIGN_TARGET_REACHED:
      case NotificationType.TESTER_LOW_ACTIVITY:
      case NotificationType.TESTER_ABANDONED:
      case NotificationType.TESTER_REPLACEMENT_ASSIGNED:
      case NotificationType.CAMPAIGN_HEALTH_WARNING:
      case NotificationType.CAMPAIGN_HEALTH_CRITICAL:
        shouldSend = preference.campaignNotifications;
        break;

      case NotificationType.TESTER_MISSION_AVAILABLE:
      case NotificationType.MISSION_COMPLETED:
      case NotificationType.MISSION_REMINDER:
        shouldSend = preference.missionNotifications;
        break;

      case NotificationType.TRUST_UPDATED:
      case NotificationType.REPUTATION_UPDATED:
        shouldSend = preference.trustNotifications;
        break;

      case NotificationType.SYSTEM:
      default:
        shouldSend = preference.systemNotifications;
        break;
    }

    // 3. Priority Mapping
    let priority: NotificationPriority = NotificationPriority.NORMAL;

    switch (type) {
      case NotificationType.CAMPAIGN_HEALTH_CRITICAL:
        priority = NotificationPriority.CRITICAL;
        break;

      case NotificationType.CAMPAIGN_HEALTH_WARNING:
      case NotificationType.TESTER_ABANDONED:
        priority = NotificationPriority.HIGH;
        break;

      case NotificationType.MISSION_REMINDER:
      case NotificationType.CAMPAIGN_REMINDER:
      case NotificationType.CAMPAIGN_PARTICIPATION_THANK_YOU:
        priority = NotificationPriority.LOW;
        break;

      default:
        priority = NotificationPriority.NORMAL;
        break;
    }

    // 4. Channel Selection
    const channel: NotificationChannel = preference.pushNotifications
      ? NotificationChannel.PUSH
      : NotificationChannel.IN_APP;

    // 5. Deterministic Deduplication Key
    let deduplicationKey: string;
    if (type === NotificationType.CAMPAIGN_TARGET_REACHED) {
      const campaignId = (contextParams?.campaignId as string) || "campaign";
      deduplicationKey = `${type}_${campaignId}_12_active`;
    } else if (sourceEventId) {
      deduplicationKey = `${type}_${userId}_${sourceEventId}`;
    } else {
      const dayStamp = new Date().toISOString().substring(0, 10);
      deduplicationKey = `${type}_${userId}_${dayStamp}`;
    }

    return {
      shouldSend,
      channel,
      priority,
      deduplicationKey,
    };
  }
}
