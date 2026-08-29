import { prisma } from "../../core/database/prisma.js";
import { ActivityEventType } from "@calltest/shared-types";

export class SessionTrackingService {
  /**
   * Updates or creates session records from activity event telemetry.
   */
  public static async processSessionEvent(
    sessionId: string,
    testerId: string,
    campaignTesterId: string | undefined,
    eventType: ActivityEventType,
    timestamp: Date,
    source?: string,
  ) {
    const isStart =
      eventType === ActivityEventType.SESSION_STARTED ||
      eventType === ActivityEventType.APP_OPENED;

    const isEnd =
      eventType === ActivityEventType.SESSION_ENDED ||
      eventType === ActivityEventType.APP_CLOSED;

    const existingSession = await prisma.sessionRecord.findUnique({
      where: { sessionId },
    });

    if (isStart) {
      if (!existingSession) {
        await prisma.sessionRecord.create({
          data: {
            sessionId,
            testerId,
            campaignTesterId: campaignTesterId ?? undefined,
            startedAt: timestamp,
            source: source ?? "ANDROID_SDK",
          },
        });
      }
    } else if (isEnd) {
      if (existingSession) {
        const durationSeconds = Math.max(
          0,
          Math.floor((timestamp.getTime() - existingSession.startedAt.getTime()) / 1000),
        );

        // Detect impossible durations (> 24 hours in a single session)
        const isAnomalous = durationSeconds > 86400;

        await prisma.sessionRecord.update({
          where: { sessionId },
          data: {
            endedAt: timestamp,
            durationSeconds,
            isAnomalous,
          },
        });
      } else {
        // End received without start - record with estimated start
        await prisma.sessionRecord.create({
          data: {
            sessionId,
            testerId,
            campaignTesterId: campaignTesterId ?? undefined,
            startedAt: timestamp,
            endedAt: timestamp,
            durationSeconds: 0,
            source: source ?? "ANDROID_SDK",
            isAnomalous: false,
          },
        });
      }
    }
  }
}
