import { Type, Static } from "@sinclair/typebox";
import {
  CampaignStatus,
  InstallationStatus,
  InstallationVerificationMethod,
  ParticipationStatus,
  SdkIntegrationStatus,
  TesterAssignmentType,
  TesterStatus,
  TrustRank,
} from "@calltest/shared-types";

export const CampaignTesterParamsSchema = Type.Object({
  campaignId: Type.String({ format: "uuid" }),
});

export type CampaignTesterParams = Static<typeof CampaignTesterParamsSchema>;

export const CampaignTesterDetailParamsSchema = Type.Object({
  campaignId: Type.String({ format: "uuid" }),
  testerId: Type.String({ format: "uuid" }),
});

export type CampaignTesterDetailParams = Static<typeof CampaignTesterDetailParamsSchema>;

export const AddTesterToCampaignSchema = Type.Object({
  testerId: Type.String({ format: "uuid" }),
  assignmentType: Type.Optional(Type.Enum(TesterAssignmentType)),
  status: Type.Optional(Type.Enum(TesterStatus)),
  isReplacement: Type.Optional(Type.Boolean()),
});

export type AddTesterToCampaignRequest = Static<typeof AddTesterToCampaignSchema>;

export const RemoveTesterFromCampaignSchema = Type.Object({
  exitReason: Type.Optional(Type.String({ maxLength: 500 })),
});

export type RemoveTesterFromCampaignRequest = Static<typeof RemoveTesterFromCampaignSchema>;

export const TesterUserPublicSchema = Type.Object({
  id: Type.String({ format: "uuid" }),
  email: Type.String({ format: "email" }),
  displayName: Type.String(),
  trustScore: Type.Number(),
  rank: Type.Enum(TrustRank),
});

export const CampaignTesterResponseSchema = Type.Object({
  id: Type.String({ format: "uuid" }),
  campaignId: Type.String({ format: "uuid" }),
  testerId: Type.String({ format: "uuid" }),
  assignmentType: Type.Enum(TesterAssignmentType),
  status: Type.Enum(TesterStatus),
  activityScore: Type.Number(),
  isReplacement: Type.Boolean(),
  exitReason: Type.Union([Type.String(), Type.Null()]),
  joinedAt: Type.String(),
  expectedEndAt: Type.Union([Type.String(), Type.Null()]),
  actualEndAt: Type.Union([Type.String(), Type.Null()]),
  createdAt: Type.String(),
  updatedAt: Type.String(),
  tester: Type.Optional(TesterUserPublicSchema),
});

export type CampaignTesterResponse = Static<typeof CampaignTesterResponseSchema>;

export const CampaignTesterListResponseSchema = Type.Array(CampaignTesterResponseSchema);

// --- Tester Experience / Home / Discovery Schemas ---

export const AvailableCampaignResponseSchema = Type.Object({
  id: Type.String({ format: "uuid" }),
  appId: Type.String({ format: "uuid" }),
  name: Type.String(),
  appName: Type.String(),
  packageName: Type.String(),
  appDescription: Type.Union([Type.String(), Type.Null()]),
  developerName: Type.String(),
  status: Type.Enum(CampaignStatus),
  durationDays: Type.Integer(),
  targetTesters: Type.Integer(),
  activeTestersCount: Type.Integer(),
  hasCallTestSdk: Type.Boolean(),
  sdkIntegrationStatus: Type.Enum(SdkIntegrationStatus),
  verificationMethodLabel: Type.String(),
  startsAt: Type.Union([Type.String(), Type.Null()]),
  endsAt: Type.Union([Type.String(), Type.Null()]),
});

export type AvailableCampaignResponse = Static<typeof AvailableCampaignResponseSchema>;

export const AvailableCampaignListResponseSchema = Type.Array(AvailableCampaignResponseSchema);

export const TesterParticipationSummarySchema = Type.Object({
  participationId: Type.String({ format: "uuid" }),
  campaignId: Type.String({ format: "uuid" }),
  appId: Type.String({ format: "uuid" }),
  campaignName: Type.String(),
  appName: Type.String(),
  packageName: Type.String(),
  developerName: Type.String(),
  hasCallTestSdk: Type.Boolean(),
  sdkIntegrationStatus: Type.Enum(SdkIntegrationStatus),
  verificationMethodLabel: Type.String(),
  status: Type.Enum(TesterStatus),
  participationStatus: Type.Enum(ParticipationStatus),
  activityScore: Type.Number(),
  isReplacement: Type.Boolean(),
  joinedAt: Type.String(),
  expectedEndAt: Type.Union([Type.String(), Type.Null()]),
  actualEndAt: Type.Union([Type.String(), Type.Null()]),
  dayOfParticipation: Type.Integer(),
  totalDurationDays: Type.Integer(),
  installationStatus: Type.Enum(InstallationStatus),
  installationVerificationMethod: Type.Enum(InstallationVerificationMethod),
  missionsCompleted: Type.Integer(),
  missionsPending: Type.Integer(),
  totalMissions: Type.Integer(),
});

export type TesterParticipationSummary = Static<typeof TesterParticipationSummarySchema>;

export const TesterParticipationListResponseSchema = Type.Array(TesterParticipationSummarySchema);

export const TesterParticipationDetailSchema = Type.Object({
  participation: TesterParticipationSummarySchema,
  missions: Type.Array(
    Type.Object({
      id: Type.String({ format: "uuid" }),
      title: Type.String(),
      objective: Type.String(),
      difficulty: Type.String(),
      estimatedMinutes: Type.Integer(),
      validationMethod: Type.String(),
      requiresEvidence: Type.Boolean(),
      evidenceInstructions: Type.Union([Type.String(), Type.Null()]),
      attemptStatus: Type.Union([Type.String(), Type.Null()]),
      attemptId: Type.Union([Type.String(), Type.Null()]),
    }),
  ),
  activity: Type.Object({
    activityScore: Type.Number(),
    activityState: Type.String(),
    sessionsCount: Type.Integer(),
    missionsCompletedCount: Type.Integer(),
    feedbacksSubmittedCount: Type.Integer(),
  }),
});

export type TesterParticipationDetail = Static<typeof TesterParticipationDetailSchema>;
