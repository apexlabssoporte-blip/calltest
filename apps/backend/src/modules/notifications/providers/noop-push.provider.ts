import {
  PushNotificationProvider,
  PushNotificationResult,
} from "./push-provider.interface.js";

export class NoopPushProvider implements PushNotificationProvider {
  public async sendPush(
    _userId: string,
    _title: string,
    _body: string,
    _data?: Record<string, unknown>,
  ): Promise<PushNotificationResult> {
    // In development/test mode, log the simulated delivery without external network calls
    const messageId = `noop_msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    return {
      success: true,
      messageId,
    };
  }
}
