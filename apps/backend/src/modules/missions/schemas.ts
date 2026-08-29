import { Type, Static } from "@sinclair/typebox";
import {
  MissionDifficulty,
  MissionStatus,
  ValidationMethod,
  AttemptStatus,
  MissionQualityRating,
} from "@calltest/shared-types";

export const CreateMissionRequestSchema = Type.Object({
  title: Type.String({ minLength: 5, maxLength: 150 }),
  description: Type.Optional(Type.String({ maxLength: 2000 })),
  objective: Type.String({ minLength: 10, maxLength: 1000 }),
  steps: Type.Array(Type.String({ minLength: 3, maxLength: 500 }), { minItems: 1, maxItems: 15 }),
  difficulty: Type.Optional(Type.Enum(MissionDifficulty)),
  estimatedMinutes: Type.Optional(Type.Integer({ minimum: 1, maximum: 60 })),
  validationMethod: Type.Optional(Type.Enum(ValidationMethod)),
  requiresEvidence: Type.Optional(Type.Boolean()),
  evidenceInstructions: Type.Optional(Type.String({ maxLength: 1000 })),
});

export type CreateMissionRequest = Static<typeof CreateMissionRequestSchema>;

export const UpdateMissionRequestSchema = Type.Object({
  title: Type.Optional(Type.String({ minLength: 5, maxLength: 150 })),
  description: Type.Optional(Type.String({ maxLength: 2000 })),
  objective: Type.Optional(Type.String({ minLength: 10, maxLength: 1000 })),
  steps: Type.Optional(
    Type.Array(Type.String({ minLength: 3, maxLength: 500 }), { minItems: 1, maxItems: 15 }),
  ),
  difficulty: Type.Optional(Type.Enum(MissionDifficulty)),
  estimatedMinutes: Type.Optional(Type.Integer({ minimum: 1, maximum: 60 })),
  validationMethod: Type.Optional(Type.Enum(ValidationMethod)),
  requiresEvidence: Type.Optional(Type.Boolean()),
  evidenceInstructions: Type.Optional(Type.String({ maxLength: 1000 })),
  status: Type.Optional(Type.Enum(MissionStatus)),
});

export type UpdateMissionRequest = Static<typeof UpdateMissionRequestSchema>;

export const ApproveMissionRequestSchema = Type.Object({
  reason: Type.Optional(Type.String({ maxLength: 500 })),
});

export type ApproveMissionRequest = Static<typeof ApproveMissionRequestSchema>;

export const RejectMissionRequestSchema = Type.Object({
  reason: Type.String({ minLength: 3, maxLength: 500 }),
});

export type RejectMissionRequest = Static<typeof RejectMissionRequestSchema>;

export const GenerateMissionsRequestSchema = Type.Object({
  appDescription: Type.String({ minLength: 10, maxLength: 3000 }),
  appFeatures: Type.Optional(Type.Array(Type.String())),
  appCategory: Type.Optional(Type.String()),
  targetFunctionality: Type.Optional(Type.String()),
});

export type GenerateMissionsRequest = Static<typeof GenerateMissionsRequestSchema>;

export const MissionParamsSchema = Type.Object({
  id: Type.String({ format: "uuid" }),
});

export type MissionParams = Static<typeof MissionParamsSchema>;

export const CampaignMissionsParamsSchema = Type.Object({
  campaignId: Type.String({ format: "uuid" }),
});

export type CampaignMissionsParams = Static<typeof CampaignMissionsParamsSchema>;

export const MissionResponseSchema = Type.Object({
  id: Type.String({ format: "uuid" }),
  campaignId: Type.String({ format: "uuid" }),
  title: Type.String(),
  description: Type.Union([Type.String(), Type.Null()]),
  objective: Type.String(),
  steps: Type.Array(Type.String()),
  difficulty: Type.Enum(MissionDifficulty),
  estimatedMinutes: Type.Integer(),
  validationMethod: Type.Enum(ValidationMethod),
  requiresEvidence: Type.Optional(Type.Boolean()),
  evidenceInstructions: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  status: Type.Enum(MissionStatus),
  createdAt: Type.String(),
  updatedAt: Type.String(),
});

export type MissionResponse = Static<typeof MissionResponseSchema>;

export const MissionListResponseSchema = Type.Array(MissionResponseSchema);

// --- Attempt Schemas ---

export const StartAttemptParamsSchema = Type.Object({
  missionId: Type.String({ format: "uuid" }),
});

export type StartAttemptParams = Static<typeof StartAttemptParamsSchema>;

export const AttemptParamsSchema = Type.Object({
  id: Type.String({ format: "uuid" }),
});

export type AttemptParams = Static<typeof AttemptParamsSchema>;

export const SubmitAttemptRequestSchema = Type.Object({
  proofData: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
});

export type SubmitAttemptRequest = Static<typeof SubmitAttemptRequestSchema>;

export const MissionAttemptResponseSchema = Type.Object({
  id: Type.String({ format: "uuid" }),
  missionId: Type.String({ format: "uuid" }),
  campaignTesterId: Type.String({ format: "uuid" }),
  testerId: Type.String({ format: "uuid" }),
  status: Type.Enum(AttemptStatus),
  attemptCount: Type.Integer(),
  validationStatus: Type.Union([Type.String(), Type.Null()]),
  startedAt: Type.String(),
  completedAt: Type.Union([Type.String(), Type.Null()]),
  createdAt: Type.String(),
  updatedAt: Type.String(),
});

export type MissionAttemptResponse = Static<typeof MissionAttemptResponseSchema>;

export const MissionAttemptListResponseSchema = Type.Array(MissionAttemptResponseSchema);

// --- Feedback Schemas ---

export const DifficultyFeedbackRequestSchema = Type.Object({
  rating: Type.Enum(MissionDifficulty),
});

export type DifficultyFeedbackRequest = Static<typeof DifficultyFeedbackRequestSchema>;

export const QualityFeedbackRequestSchema = Type.Object({
  feedback: Type.Enum(MissionQualityRating),
  comment: Type.Optional(Type.String({ maxLength: 1000 })),
});

export type QualityFeedbackRequest = Static<typeof QualityFeedbackRequestSchema>;

export const TesterMissionsParamsSchema = Type.Object({
  testerId: Type.String({ format: "uuid" }),
});

export type TesterMissionsParams = Static<typeof TesterMissionsParamsSchema>;
