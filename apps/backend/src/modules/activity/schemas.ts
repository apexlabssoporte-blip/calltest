import { Type, Static } from "@sinclair/typebox";
import { ActivityEventType, ActivityState } from "@calltest/shared-types";

export const IngestActivityEventSchema = Type.Object({
  eventId: Type.String({ minLength: 8, maxLength: 64 }),
  appId: Type.String({ format: "uuid" }),
  campaignTesterId: Type.Optional(Type.String({ format: "uuid" })),
  sessionId: Type.String({ minLength: 4, maxLength: 64 }),
  eventType: Type.Enum(ActivityEventType),
  eventPayload: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
  deviceInfo: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
  clientTimestamp: Type.String({ format: "date-time" }),
});

export type IngestActivityEvent = Static<typeof IngestActivityEventSchema>;

export const IngestActivityEventsBatchSchema = Type.Object({
  events: Type.Array(IngestActivityEventSchema, { minItems: 1, maxItems: 100 }),
});

export type IngestActivityEventsBatch = Static<typeof IngestActivityEventsBatchSchema>;

export const ActivityScoreResponseSchema = Type.Object({
  testerId: Type.String({ format: "uuid" }),
  campaignTesterId: Type.String({ format: "uuid" }),
  activityScore: Type.Number(),
  activityState: Type.Enum(ActivityState),
  signals: Type.Object({
    sessionCount: Type.Integer(),
    totalDurationMinutes: Type.Number(),
    completedMissions: Type.Integer(),
    feedbackCount: Type.Integer(),
    bugReportCount: Type.Integer(),
    activeDays: Type.Integer(),
    daysEnrolled: Type.Integer(),
    isReplacement: Type.Boolean(),
  }),
});

export type ActivityScoreResponse = Static<typeof ActivityScoreResponseSchema>;

export const TesterOverviewQuerySchema = Type.Object({
  campaignId: Type.String({ format: "uuid" }),
  testerId: Type.String({ format: "uuid" }),
});

export type TesterOverviewQuery = Static<typeof TesterOverviewQuerySchema>;

export const DeveloperTesterOverviewResponseSchema = Type.Object({
  testerId: Type.String({ format: "uuid" }),
  displayName: Type.String(),
  email: Type.String(),
  joinedAt: Type.String(),
  expectedEndAt: Type.Union([Type.String(), Type.Null()]),
  isReplacement: Type.Boolean(),
  daysParticipating: Type.Integer(),
  completedMissionsCount: Type.Integer(),
  activityScore: Type.Number(),
  activityState: Type.Enum(ActivityState),
});

export type DeveloperTesterOverviewResponse = Static<typeof DeveloperTesterOverviewResponseSchema>;
