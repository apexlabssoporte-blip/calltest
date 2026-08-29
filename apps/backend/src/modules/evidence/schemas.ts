import { Type, Static } from "@sinclair/typebox";
import {
  EvidenceRejectionReason,
  EvidenceStatus,
} from "@calltest/shared-types";

export const SubmitEvidenceBodySchema = Type.Object({
  imageBase64: Type.String({ minLength: 20 }),
  filename: Type.String({ minLength: 3, maxLength: 128 }),
  mimeType: Type.String({ minLength: 5, maxLength: 64 }),
});

export type SubmitEvidenceBody = Static<typeof SubmitEvidenceBodySchema>;

export const RejectEvidenceBodySchema = Type.Object({
  reason: Type.Enum(EvidenceRejectionReason),
  comment: Type.Optional(Type.String({ maxLength: 500 })),
});

export type RejectEvidenceBody = Static<typeof RejectEvidenceBodySchema>;

export const MissionEvidenceResponseSchema = Type.Object({
  id: Type.String({ format: "uuid" }),
  missionAttemptId: Type.String({ format: "uuid" }),
  campaignId: Type.String({ format: "uuid" }),
  testerId: Type.String({ format: "uuid" }),
  missionId: Type.String({ format: "uuid" }),
  fileReference: Type.String(),
  mimeType: Type.String(),
  fileSize: Type.Integer(),
  sha256: Type.String(),
  status: Type.Enum(EvidenceStatus),
  submittedAt: Type.String(),
  reviewedAt: Type.Union([Type.String(), Type.Null()]),
  reviewedById: Type.Union([Type.String(), Type.Null()]),
  rejectionReason: Type.Union([Type.Enum(EvidenceRejectionReason), Type.Null()]),
  rejectionComment: Type.Union([Type.String(), Type.Null()]),
  createdAt: Type.String(),
  updatedAt: Type.String(),
});

export type MissionEvidenceResponse = Static<typeof MissionEvidenceResponseSchema>;

export const MissionEvidenceListResponseSchema = Type.Array(MissionEvidenceResponseSchema);
