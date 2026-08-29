import { NotificationDispatchPayload } from "./domain/notification-event.js";
import { NotificationPolicyService } from "./policies/notification-policy.service.js";
import { NotificationTemplateEngine } from "./templates/notification-template.js";
import { NotificationRepository } from "./repository.js";
import { PushNotificationProvider } from "./providers/push-provider.interface.js";
import { NoopPushProvider } from "./providers/noop-push.provider.js";

export class NotificationService {
  private static pushProvider: PushNotificationProvider = new NoopPushProvider();

  public static setPushProvider(provider: PushNotificationProvider) {
    this.pushProvider = provider;
  }

  /**
   * Dispatches a notification through policies, template rendering, database persistence, and push delivery.
   */
  public static async dispatch(payload: NotificationDispatchPayload) {
    const { userId, type, params = {}, data = {}, sourceEventId } = payload;

    // 1. Evaluate Policy (Preferences, priority, channels, deduplication key)
    const policy = await NotificationPolicyService.evaluatePolicy({
      userId,
      type,
      sourceEventId,
      contextParams: params,
    });

    if (!policy.shouldSend) {
      return null;
    }

    // 2. Render Template
    const { title, body } = NotificationTemplateEngine.render(type, params);

    // 3. Persist Notification (Idempotent via deduplicationKey)
    const notification = await NotificationRepository.createNotification({
      userId,
      type,
      title,
      body,
      data,
      priority: payload.forcedPriority || policy.priority,
      channel: payload.forcedChannel || policy.channel,
      deduplicationKey: policy.deduplicationKey,
    });

    // 4. Push Notification Delivery
    if (policy.channel === "PUSH") {
      await this.pushProvider.sendPush(userId, title, body, data);
    }

    return notification;
  }

  /**
   * Direct creation of notifications for operational and lifecycle events.
   */
  public static async createNotification(payload: {
    userId: string;
    type: any;
    title: string;
    body: string;
    data?: Record<string, any>;
  }) {
    return NotificationRepository.createNotification({
      userId: payload.userId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      data: payload.data || {},
      priority: "NORMAL" as any,
      channel: "IN_APP" as any,
      deduplicationKey: `${payload.userId}:${payload.type}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
    });
  }
}
