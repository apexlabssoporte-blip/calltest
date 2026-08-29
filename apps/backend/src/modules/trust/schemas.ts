import { Type, Static } from "@sinclair/typebox";
import { ReputationStatus, TrustEventType, TrustRank } from "@calltest/shared-types";

export const UserTrustParamsSchema = Type.Object({
  userId: Type.String({ format: "uuid" }),
});

export type UserTrustParams = Static<typeof UserTrustParamsSchema>;

export const TrustHistoryItemSchema = Type.Object({
  id: Type.String({ format: "uuid" }),
  previousScore: Type.Integer(),
  newScore: Type.Integer(),
  previousRank: Type.Enum(TrustRank),
  newRank: Type.Enum(TrustRank),
  eventType: Type.Enum(TrustEventType),
  reason: Type.String(),
  createdAt: Type.String(),
});

export const UserTrustResponseSchema = Type.Object({
  userId: Type.String({ format: "uuid" }),
  trustScore: Type.Integer(),
  trustRank: Type.Enum(TrustRank),
  reputationStatus: Type.Enum(ReputationStatus),
  completedCampaignsCount: Type.Integer(),
  abandonedCampaignsCount: Type.Integer(),
  history: Type.Array(TrustHistoryItemSchema),
});

export type UserTrustResponse = Static<typeof UserTrustResponseSchema>;

export const DeveloperUserTrustResponseSchema = Type.Object({
  userId: Type.String({ format: "uuid" }),
  trustRank: Type.Enum(TrustRank),
  reputationStatus: Type.Enum(ReputationStatus),
  completedCampaignsCount: Type.Integer(),
});

export type DeveloperUserTrustResponse = Static<typeof DeveloperUserTrustResponseSchema>;

export const UserReputationResponseSchema = Type.Object({
  userId: Type.String({ format: "uuid" }),
  reputationStatus: Type.Enum(ReputationStatus),
  trustRank: Type.Enum(TrustRank),
  trustScore: Type.Integer(),
  activeRestrictions: Type.Array(Type.String()),
});

export type UserReputationResponse = Static<typeof UserReputationResponseSchema>;
