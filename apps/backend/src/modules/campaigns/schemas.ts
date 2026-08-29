import { Type, Static } from "@sinclair/typebox";
import {
  CampaignRisk,
  CampaignStatus,
  GoogleGroupValidationStatus,
  PlayStoreValidationStatus,
  TesterAssignmentType,
  TesterStatus,
} from "@calltest/shared-types";

export const CreateCampaignRequestSchema = Type.Object({
  name: Type.String({ minLength: 2, maxLength: 100 }),
  targetTesters: Type.Optional(Type.Integer({ minimum: 1, maximum: 50 })),
  maxTesters: Type.Optional(Type.Integer({ minimum: 1, maximum: 50 })),
  durationDays: Type.Optional(Type.Integer({ minimum: 1, maximum: 90 })),
});

export type CreateCampaignRequest = Static<typeof CreateCampaignRequestSchema>;

export const UpdateCampaignRequestSchema = Type.Object({
  name: Type.Optional(Type.String({ minLength: 2, maxLength: 100 })),
  targetTesters: Type.Optional(Type.Integer({ minimum: 1, maximum: 50 })),
  maxTesters: Type.Optional(Type.Integer({ minimum: 1, maximum: 50 })),
  durationDays: Type.Optional(Type.Integer({ minimum: 1, maximum: 90 })),
  developerConfirmedLinksTest: Type.Optional(Type.Boolean()),
});

export type UpdateCampaignRequest = Static<typeof UpdateCampaignRequestSchema>;

export const CampaignTransitionRequestSchema = Type.Object({
  targetStatus: Type.Enum(CampaignStatus),
});

export type CampaignTransitionRequest = Static<typeof CampaignTransitionRequestSchema>;

export const AppCampaignParamsSchema = Type.Object({
  appId: Type.String({ format: "uuid" }),
});

export type AppCampaignParams = Static<typeof AppCampaignParamsSchema>;

export const CampaignParamsSchema = Type.Object({
  id: Type.String({ format: "uuid" }),
});

export type CampaignParams = Static<typeof CampaignParamsSchema>;

export const CampaignTesterOverviewParamsSchema = Type.Object({
  campaignId: Type.String({ format: "uuid" }),
  testerId: Type.String({ format: "uuid" }),
});

export type CampaignTesterOverviewParams = Static<typeof CampaignTesterOverviewParamsSchema>;

export const CampaignResponseSchema = Type.Object({
  id: Type.String({ format: "uuid" }),
  appId: Type.String({ format: "uuid" }),
  name: Type.String(),
  status: Type.Enum(CampaignStatus),
  targetTesters: Type.Integer(),
  maxTesters: Type.Integer(),
  durationDays: Type.Integer(),
  developerConfirmedLinksTest: Type.Optional(Type.Boolean()),
  storeValidationStatus: Type.Optional(Type.Enum(PlayStoreValidationStatus)),
  groupValidationStatus: Type.Optional(Type.Enum(GoogleGroupValidationStatus)),
  startsAt: Type.Union([Type.String(), Type.Null()]),
  endsAt: Type.Union([Type.String(), Type.Null()]),
  activeTestersCount: Type.Optional(Type.Integer()),
  createdAt: Type.String(),
  updatedAt: Type.String(),
});

export type CampaignResponse = Static<typeof CampaignResponseSchema>;

export const CampaignListResponseSchema = Type.Array(CampaignResponseSchema);

export const CampaignDashboardResponseSchema = Type.Object({
  campaignId: Type.String({ format: "uuid" }),
  campaignName: Type.String(),
  appId: Type.String({ format: "uuid" }),
  appName: Type.String(),
  packageName: Type.String(),
  status: Type.Enum(CampaignStatus),
  durationDays: Type.Integer(),
  daysElapsed: Type.Integer(),
  daysRemaining: Type.Integer(),
  startsAt: Type.Union([Type.String(), Type.Null()]),
  endsAt: Type.Union([Type.String(), Type.Null()]),
  expectedEndAt: Type.Union([Type.String(), Type.Null()]),
  targetActiveTesters: Type.Integer(),
  assignedTestersCount: Type.Integer(),
  installationClaimedCount: Type.Integer(),
  installationVerifiedCount: Type.Integer(),
  participationVerifiedCount: Type.Integer(),
  pendingVerificationCount: Type.Integer(),
  activeTestersCount: Type.Integer(),
  lowActivityTestersCount: Type.Integer(),
  abandonedTestersCount: Type.Integer(),
  completedTestersCount: Type.Integer(),
  replacementCount: Type.Integer(),
  missionProgress: Type.Object({
    totalMissions: Type.Integer(),
    totalAttempts: Type.Integer(),
    completedAttempts: Type.Integer(),
    completionRate: Type.Number(),
  }),
  missionsSummary: Type.Object({
    totalMissions: Type.Integer(),
    completedAttempts: Type.Integer(),
    pendingAttempts: Type.Integer(),
    rejectedAttempts: Type.Integer(),
  }),
  health: Type.Object({
    risk: Type.Enum(CampaignRisk),
    score: Type.Number(),
    replacementNeeded: Type.Integer(),
    canAddTesters: Type.Boolean(),
  }),
  storeValidationStatus: Type.Enum(PlayStoreValidationStatus),
  groupValidationStatus: Type.Enum(GoogleGroupValidationStatus),
  developerConfirmedLinksTest: Type.Boolean(),
  publicVerifiedAt: Type.Union([Type.String(), Type.Null()]),
});

export type CampaignDashboardResponse = Static<typeof CampaignDashboardResponseSchema>;

export const CampaignReadinessResponseSchema = Type.Object({
  campaignId: Type.String({ format: "uuid" }),
  ready: Type.Boolean(),
  checks: Type.Array(
    Type.Object({
      code: Type.String(),
      name: Type.String(),
      passed: Type.Boolean(),
      isBlocking: Type.Boolean(),
      message: Type.String(),
    }),
  ),
  blockingReasons: Type.Array(Type.String()),
  warnings: Type.Array(Type.String()),
});

export type CampaignReadinessResponse = Static<typeof CampaignReadinessResponseSchema>;

export const ValidateLinksResponseSchema = Type.Object({
  campaignId: Type.String({ format: "uuid" }),
  playStore: Type.Object({
    validUrl: Type.Boolean(),
    reachable: Type.Boolean(),
    packageName: Type.Union([Type.String(), Type.Null()]),
    packageMatches: Type.Boolean(),
    isPubliclyAvailable: Type.Boolean(),
    status: Type.Enum(PlayStoreValidationStatus),
    message: Type.String(),
  }),
  googleGroup: Type.Object({
    valid: Type.Boolean(),
    reachable: Type.Boolean(),
    requiresApproval: Type.Boolean(),
    publiclyJoinable: Type.Boolean(),
    status: Type.Enum(GoogleGroupValidationStatus),
    message: Type.String(),
  }),
  updatedAt: Type.String(),
});

export type ValidateLinksResponse = Static<typeof ValidateLinksResponseSchema>;

export const ConfirmLinksTestResponseSchema = Type.Object({
  campaignId: Type.String({ format: "uuid" }),
  developerConfirmedLinksTest: Type.Boolean(),
  confirmedAt: Type.String(),
});

export type ConfirmLinksTestResponse = Static<typeof ConfirmLinksTestResponseSchema>;

export const CompleteCampaignResponseSchema = Type.Object({
  campaignId: Type.String({ format: "uuid" }),
  previousStatus: Type.Enum(CampaignStatus),
  newStatus: Type.Enum(CampaignStatus),
  completedTestersCount: Type.Integer(),
  isPubliclyVerified: Type.Boolean(),
  completedAt: Type.String(),
});

export type CompleteCampaignResponse = Static<typeof CompleteCampaignResponseSchema>;

export const SanitizedTesterOverviewResponseSchema = Type.Object({
  campaignTesterId: Type.String({ format: "uuid" }),
  campaignId: Type.String({ format: "uuid" }),
  testerId: Type.String({ format: "uuid" }),
  displayName: Type.String(),
  status: Type.Enum(TesterStatus),
  assignmentType: Type.Enum(TesterAssignmentType),
  isReplacement: Type.Boolean(),
  joinedAt: Type.String(),
  expectedEndAt: Type.Union([Type.String(), Type.Null()]),
  actualEndAt: Type.Union([Type.String(), Type.Null()]),
  daysParticipating: Type.Integer(),
  completedMissionsCount: Type.Integer(),
  pendingMissionsCount: Type.Integer(),
  completionPercentage: Type.Number(),
  activityScore: Type.Number(),
  lastActivityAt: Type.Union([Type.String(), Type.Null()]),
  feedbacksSubmittedCount: Type.Integer(),
  participationStatus: Type.String(),
});

export type SanitizedTesterOverviewResponse = Static<typeof SanitizedTesterOverviewResponseSchema>;
