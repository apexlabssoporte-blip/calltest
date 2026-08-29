export interface PushNotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface PushNotificationProvider {
  sendPush(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ): Promise<PushNotificationResult>;
}
