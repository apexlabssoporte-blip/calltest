import { Type, Static } from "@sinclair/typebox";
import { TesterExposureLevel } from "@calltest/shared-types";
import { CampaignHealthResponseSchema } from "../campaign-health/schemas.js";

export const EvaluateMatchingParamsSchema = Type.Object({
  campaignId: Type.String({ format: "uuid" }),
});

export type EvaluateMatchingParams = Static<typeof EvaluateMatchingParamsSchema>;

export const AssignedTesterSchema = Type.Object({
  testerId: Type.String({ format: "uuid" }),
  campaignTesterId: Type.String({ format: "uuid" }),
  score: Type.Number(),
  joinedAt: Type.String(),
  expectedEndAt: Type.String(),
  isReplacement: Type.Boolean(),
});

export const EvaluateMatchingResponseSchema = Type.Object({
  campaignId: Type.String({ format: "uuid" }),
  assignedCount: Type.Integer(),
  reason: Type.Optional(Type.String()),
  health: CampaignHealthResponseSchema,
  assignedTesters: Type.Array(AssignedTesterSchema),
});

export type EvaluateMatchingResponse = Static<typeof EvaluateMatchingResponseSchema>;

export const TesterExposureResponseSchema = Type.Object({
  userId: Type.String({ format: "uuid" }),
  level: Type.Enum(TesterExposureLevel),
  maxActiveCampaigns: Type.Integer(),
  currentActiveCampaigns: Type.Integer(),
  completedCampaignsCount: Type.Integer(),
  abandonedCampaignsCount: Type.Integer(),
  averageActivityScore: Type.Number(),
});

export type TesterExposureResponse = Static<typeof TesterExposureResponseSchema>;
