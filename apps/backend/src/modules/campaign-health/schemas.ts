import { Type, Static } from "@sinclair/typebox";
import { CampaignRisk } from "@calltest/shared-types";

export const CampaignHealthParamsSchema = Type.Object({
  campaignId: Type.String({ format: "uuid" }),
});

export type CampaignHealthParams = Static<typeof CampaignHealthParamsSchema>;

export const CampaignHealthResponseSchema = Type.Object({
  campaignId: Type.String({ format: "uuid" }),
  targetActiveTesters: Type.Integer(),
  maxActiveTesters: Type.Integer(),
  activeTesters: Type.Integer(),
  lowActivityTesters: Type.Integer(),
  abandonedTesters: Type.Integer(),
  completedTesters: Type.Integer(),
  totalEnrolledTesters: Type.Integer(),
  missionCompletionRate: Type.Number(),
  activityRate: Type.Number(),
  replacementNeed: Type.Integer(),
  availableCapacity: Type.Integer(),
  campaignRisk: Type.Enum(CampaignRisk),
});

export type CampaignHealthResponse = Static<typeof CampaignHealthResponseSchema>;
