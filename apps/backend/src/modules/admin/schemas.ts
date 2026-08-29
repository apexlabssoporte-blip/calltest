import { Type, Static } from "@sinclair/typebox";
import { UserRole, UserStatus, EvidenceStatus } from "@calltest/shared-types";

// User Administration
export const AdminUserListQuerySchema = Type.Object({
  page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 20 })),
  status: Type.Optional(Type.Enum(UserStatus)),
  role: Type.Optional(Type.Enum(UserRole)),
  search: Type.Optional(Type.String({ maxLength: 100 })),
});

export type AdminUserListQuery = Static<typeof AdminUserListQuerySchema>;

export const AdminUserListItemSchema = Type.Object({
  id: Type.String({ format: "uuid" }),
  email: Type.String({ format: "email" }),
  displayName: Type.String(),
  role: Type.Enum(UserRole),
  status: Type.Enum(UserStatus),
  xpBalance: Type.Integer(),
  goldBalance: Type.Integer(),
  createdAt: Type.String(),
  updatedAt: Type.String(),
});

export const AdminUserListResponseSchema = Type.Object({
  items: Type.Array(AdminUserListItemSchema),
  total: Type.Integer(),
  page: Type.Integer(),
  limit: Type.Integer(),
  totalPages: Type.Integer(),
});

export type AdminUserListResponse = Static<typeof AdminUserListResponseSchema>;

export const AdminUserDetailResponseSchema = Type.Object({
  id: Type.String({ format: "uuid" }),
  email: Type.String({ format: "email" }),
  displayName: Type.String(),
  role: Type.Enum(UserRole),
  status: Type.Enum(UserStatus),
  xpBalance: Type.Integer(),
  goldBalance: Type.Integer(),
  createdAt: Type.String(),
  updatedAt: Type.String(),
  trustScore: Type.Number(),
  trustRank: Type.String(),
  activeCampaignsCount: Type.Integer(),
  recentAuditLogs: Type.Array(
    Type.Object({
      id: Type.String({ format: "uuid" }),
      action: Type.String(),
      createdAt: Type.String(),
      details: Type.Optional(Type.Record(Type.String(), Type.Any())),
    }),
  ),
});

export type AdminUserDetailResponse = Static<typeof AdminUserDetailResponseSchema>;

export const AdminUserActionRequestSchema = Type.Object({
  reason: Type.String({ minLength: 5, maxLength: 500 }),
});

export type AdminUserActionRequest = Static<typeof AdminUserActionRequestSchema>;

// Evidence Review Admin
export const AdminEvidenceListQuerySchema = Type.Object({
  page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 20 })),
  campaignId: Type.Optional(Type.String({ format: "uuid" })),
});

export type AdminEvidenceListQuery = Static<typeof AdminEvidenceListQuerySchema>;

export const AdminEvidenceItemSchema = Type.Object({
  id: Type.String({ format: "uuid" }),
  attemptId: Type.String({ format: "uuid" }),
  testerId: Type.String({ format: "uuid" }),
  campaignId: Type.String({ format: "uuid" }),
  status: Type.Enum(EvidenceStatus),
  fileUrl: Type.String(),
  sha256Hash: Type.String(),
  mimeType: Type.String(),
  sizeBytes: Type.Integer(),
  rejectionReason: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  createdAt: Type.String(),
  reviewedAt: Type.Optional(Type.Union([Type.String(), Type.Null()])),
});

export const AdminEvidenceListResponseSchema = Type.Object({
  items: Type.Array(AdminEvidenceItemSchema),
  total: Type.Integer(),
  page: Type.Integer(),
  limit: Type.Integer(),
  totalPages: Type.Integer(),
});

export type AdminEvidenceListResponse = Static<typeof AdminEvidenceListResponseSchema>;

export const AdminEvidenceApproveRequestSchema = Type.Object({
  reason: Type.Optional(Type.String({ maxLength: 500 })),
});

export type AdminEvidenceApproveRequest = Static<typeof AdminEvidenceApproveRequestSchema>;

export const AdminEvidenceRejectRequestSchema = Type.Object({
  reason: Type.String({ minLength: 5, maxLength: 500 }),
});

export type AdminEvidenceRejectRequest = Static<typeof AdminEvidenceRejectRequestSchema>;

// Operational Dispute / Review
export enum ReviewStatus {
  OPEN = "OPEN",
  UNDER_REVIEW = "UNDER_REVIEW",
  RESOLVED = "RESOLVED",
  REJECTED = "REJECTED",
}

export const OperationalReviewSchema = Type.Object({
  id: Type.String({ format: "uuid" }),
  entityType: Type.String(),
  entityId: Type.String(),
  status: Type.Enum(ReviewStatus),
  reason: Type.String(),
  resolution: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  openedBy: Type.String({ format: "uuid" }),
  reviewedBy: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  createdAt: Type.String(),
  resolvedAt: Type.Optional(Type.Union([Type.String(), Type.Null()])),
});

export type OperationalReview = Static<typeof OperationalReviewSchema>;

export const CreateOperationalReviewSchema = Type.Object({
  entityType: Type.String({ minLength: 2, maxLength: 50 }),
  entityId: Type.String({ minLength: 2, maxLength: 100 }),
  reason: Type.String({ minLength: 5, maxLength: 500 }),
});

export type CreateOperationalReview = Static<typeof CreateOperationalReviewSchema>;

export const UpdateOperationalReviewSchema = Type.Object({
  status: Type.Enum(ReviewStatus),
  resolution: Type.String({ minLength: 5, maxLength: 500 }),
});

export type UpdateOperationalReview = Static<typeof UpdateOperationalReviewSchema>;
