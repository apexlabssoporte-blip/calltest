import { NotificationChannel, NotificationPriority, NotificationType } from "@calltest/shared-types";

export interface NotificationDispatchPayload {
  userId: string;
  type: NotificationType;
  params?: Record<string, unknown>;
  data?: Record<string, unknown>;
  sourceEventId?: string;
  forcedPriority?: NotificationPriority;
  forcedChannel?: NotificationChannel;
}

export interface NotificationPolicyResult {
  shouldSend: boolean;
  channel: NotificationChannel;
  priority: NotificationPriority;
  deduplicationKey: string;
}
