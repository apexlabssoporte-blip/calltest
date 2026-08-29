import { prisma } from "../../core/database/prisma.js";
import { env } from "../../core/config/env.js";
import { SessionTrackingService } from "./session-service.js";
import { IngestActivityEvent } from "./schemas.js";

export class ActivityEventService {
  /**
   * Ingests a single activity event sent by SDK.
   * Performs timestamp validation (future drift check) and deduplication via unique idempotencyKey.
   */
  public static async ingestEvent(
    testerId: string,
    data: IngestActivityEvent,
  ) {
    // 1. Idempotency check: Return existing event if already processed
    const existing = await prisma.activityEvent.findUnique({
      where: { idempotencyKey: data.eventId },
    });

    if (existing) {
      return {
        event: existing,
        isDuplicate: true,
      };
    }

    const clientTimestamp = new Date(data.clientTimestamp);
    const serverTimestamp = new Date();

    // 2. Timestamp anomaly detection (reject or flag future timestamps beyond tolerance)
    const isFutureTimestamp =
      clientTimestamp.getTime() > serverTimestamp.getTime() + env.CLOCK_SKEW_TOLERANCE_MS;

    const isValid = !isFutureTimestamp && !isNaN(clientTimestamp.getTime());

    const createdEvent = await prisma.activityEvent.create({
      data: {
        appId: data.appId,
        testerId,
        campaignTesterId: data.campaignTesterId ?? undefined,
        sessionId: data.sessionId,
        eventType: data.eventType,
        eventPayload: data.eventPayload as any,
        deviceInfo: data.deviceInfo as any,
        clientTimestamp,
        serverTimestamp,
        isValid,
        idempotencyKey: data.eventId,
      },
    });

    // 3. Track session lifecycle
    await SessionTrackingService.processSessionEvent(
      data.sessionId,
      testerId,
      data.campaignTesterId,
      data.eventType,
      clientTimestamp,
    );

    return {
      event: createdEvent,
      isDuplicate: false,
      isAnomalousTimestamp: isFutureTimestamp,
    };
  }

  /**
   * Batch ingest helper for multiple telemetry events.
   */
  public static async ingestBatch(
    testerId: string,
    events: IngestActivityEvent[],
  ) {
    const results = [];
    for (const evt of events) {
      const res = await this.ingestEvent(testerId, evt);
      results.push(res);
    }
    return results;
  }
}
