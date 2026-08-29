import { Type, Static } from "@sinclair/typebox";
import { RewardSource, RewardStatus, RewardType } from "@calltest/shared-types";

export const RewardLedgerItemSchema = Type.Object({
  id: Type.String({ format: "uuid" }),
  userId: Type.String({ format: "uuid" }),
  campaignId: Type.Optional(Type.Union([Type.String({ format: "uuid" }), Type.Null()])),
  missionId: Type.Optional(Type.Union([Type.String({ format: "uuid" }), Type.Null()])),
  sourceType: Type.Enum(RewardSource),
  sourceId: Type.String(),
  type: Type.Enum(RewardType),
  amount: Type.Integer(),
  xpAmount: Type.Integer(),
  goldAmount: Type.Integer(),
  status: Type.Enum(RewardStatus),
  reason: Type.String(),
  createdAt: Type.String(),
});

export type RewardLedgerItem = Static<typeof RewardLedgerItemSchema>;

export const UserRewardsSummaryResponseSchema = Type.Object({
  userId: Type.String({ format: "uuid" }),
  totalXp: Type.Integer(),
  totalGold: Type.Integer(),
  completedMissionsCount: Type.Integer(),
  completedCampaignsCount: Type.Integer(),
  recentRewards: Type.Array(RewardLedgerItemSchema),
});

export type UserRewardsSummaryResponse = Static<typeof UserRewardsSummaryResponseSchema>;

export const RewardHistoryQuerySchema = Type.Object({
  page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 20 })),
  campaignId: Type.Optional(Type.String({ format: "uuid" })),
  sourceType: Type.Optional(Type.Enum(RewardSource)),
});

export type RewardHistoryQuery = Static<typeof RewardHistoryQuerySchema>;

export const RewardHistoryResponseSchema = Type.Object({
  items: Type.Array(RewardLedgerItemSchema),
  total: Type.Integer(),
  page: Type.Integer(),
  limit: Type.Integer(),
  totalPages: Type.Integer(),
});

export type RewardHistoryResponse = Static<typeof RewardHistoryResponseSchema>;
