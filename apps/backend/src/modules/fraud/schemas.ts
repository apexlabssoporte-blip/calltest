import { Type, Static } from "@sinclair/typebox";
import { FraudEventType, FraudSeverity, ReputationStatus } from "@calltest/shared-types";

export const UserFraudParamsSchema = Type.Object({
  userId: Type.String({ format: "uuid" }),
});

export type UserFraudParams = Static<typeof UserFraudParamsSchema>;

export const FraudEventItemSchema = Type.Object({
  id: Type.String({ format: "uuid" }),
  type: Type.Enum(FraudEventType),
  severity: Type.Enum(FraudSeverity),
  scoreImpact: Type.Integer(),
  reason: Type.String(),
  sourceId: Type.Optional(Type.String()),
  createdAt: Type.String(),
});

export const UserFraudReportResponseSchema = Type.Object({
  userId: Type.String({ format: "uuid" }),
  fraudScore: Type.Integer(),
  unresolvedEventsCount: Type.Integer(),
  criticalEventsCount: Type.Integer(),
  highestSeverity: Type.Union([Type.Enum(FraudSeverity), Type.Null()]),
  recommendedStatus: Type.Enum(ReputationStatus),
  events: Type.Array(FraudEventItemSchema),
});

export type UserFraudReportResponse = Static<typeof UserFraudReportResponseSchema>;
