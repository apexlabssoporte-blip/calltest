import { Type, Static } from "@sinclair/typebox";
import {
  ReportCategory,
  ReportSeverity,
  ReportStatus,
  DeveloperReportDecision,
  HumanReportDecision,
  AiReportClassification,
  AiRecommendedAction,
  ReportClusterStatus,
} from "@calltest/shared-types";

// ==========================================
// 1. Request Schemas
// ==========================================

export const CreateReportBodySchema = Type.Object(
  {
    title: Type.String({ minLength: 3, maxLength: 150 }),
    description: Type.String({ minLength: 10, maxLength: 3000 }),
    category: Type.Enum(ReportCategory),
    severity: Type.Enum(ReportSeverity),
    missionId: Type.Optional(Type.String({ format: "uuid" })),
    evidenceIds: Type.Optional(Type.Array(Type.String({ format: "uuid" }), { maxItems: 5 })),
  },
  { additionalProperties: false },
);

export type CreateReportBody = Static<typeof CreateReportBodySchema>;

export const DeveloperReviewBodySchema = Type.Object(
  {
    decision: Type.Enum(DeveloperReportDecision),
    reason: Type.String({ minLength: 3, maxLength: 1000 }),
  },
  { additionalProperties: false },
);

export type DeveloperReviewBody = Static<typeof DeveloperReviewBodySchema>;

export const EscalateReportBodySchema = Type.Object(
  {
    reason: Type.String({ minLength: 3, maxLength: 1000 }),
  },
  { additionalProperties: false },
);

export type EscalateReportBody = Static<typeof EscalateReportBodySchema>;

export const FinalizeReportBodySchema = Type.Object(
  {
    decision: Type.Enum(HumanReportDecision),
    reason: Type.String({ minLength: 3, maxLength: 1000 }),
  },
  { additionalProperties: false },
);

export type FinalizeReportBody = Static<typeof FinalizeReportBodySchema>;

// ==========================================
// 2. Response Schemas
// ==========================================

export const TesterReportResponseSchema = Type.Object({
  id: Type.String(),
  campaignId: Type.String(),
  appId: Type.String(),
  testerId: Type.String(),
  missionId: Type.Union([Type.String(), Type.Null()]),
  clusterId: Type.Union([Type.String(), Type.Null()]),
  title: Type.String(),
  description: Type.String(),
  category: Type.Enum(ReportCategory),
  severity: Type.Enum(ReportSeverity),
  status: Type.Enum(ReportStatus),
  developerDecision: Type.Union([Type.Enum(DeveloperReportDecision), Type.Null()]),
  developerDecisionReason: Type.Union([Type.String(), Type.Null()]),
  developerId: Type.Union([Type.String(), Type.Null()]),
  evidenceIds: Type.Array(Type.String()),
  createdAt: Type.String(),
  updatedAt: Type.String(),
  resolvedAt: Type.Union([Type.String(), Type.Null()]),
});

export type TesterReportResponse = Static<typeof TesterReportResponseSchema>;

export const TesterReportListResponseSchema = Type.Object({
  reports: Type.Array(TesterReportResponseSchema),
  total: Type.Number(),
});

export const ReportClusterResponseSchema = Type.Object({
  id: Type.String(),
  campaignId: Type.String(),
  appId: Type.String(),
  fingerprint: Type.String(),
  status: Type.Enum(ReportClusterStatus),
  reportCount: Type.Number(),
  firstReportedAt: Type.String(),
  lastReportedAt: Type.String(),
  createdAt: Type.String(),
  updatedAt: Type.String(),
});

export type ReportClusterResponse = Static<typeof ReportClusterResponseSchema>;

export const ReportClusterListResponseSchema = Type.Object({
  clusters: Type.Array(ReportClusterResponseSchema),
  total: Type.Number(),
});

export const AiReviewResponseSchema = Type.Object({
  id: Type.String(),
  clusterId: Type.String(),
  reportId: Type.Union([Type.String(), Type.Null()]),
  provider: Type.String(),
  model: Type.String(),
  policyVersion: Type.String(),
  classification: Type.Enum(AiReportClassification),
  confidence: Type.Number(),
  severityAssessment: Type.Union([Type.Enum(ReportSeverity), Type.Null()]),
  evidenceConsistency: Type.Union([Type.String(), Type.Null()]),
  duplicateLikelihood: Type.Union([Type.Number(), Type.Null()]),
  reasoningSummary: Type.String(),
  recommendedAction: Type.Enum(AiRecommendedAction),
  latencyMs: Type.Number(),
  success: Type.Boolean(),
  createdAt: Type.String(),
});

export type AiReviewResponse = Static<typeof AiReviewResponseSchema>;
