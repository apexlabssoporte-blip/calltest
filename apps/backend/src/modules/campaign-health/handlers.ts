import { FastifyRequest, FastifyReply } from "fastify";
import { CampaignHealthService } from "./service.js";
import { AuthenticatedUser } from "../../core/middlewares/auth-guard.js";
import { verifyCampaignOwnership } from "../../core/middlewares/rbac-guard.js";
import { CampaignHealthParams } from "./schemas.js";

export async function getCampaignHealthHandler(
  request: FastifyRequest<{ Params: CampaignHealthParams }>,
  reply: FastifyReply,
) {
  const user = request.user as AuthenticatedUser;
  await verifyCampaignOwnership(request.params.campaignId, user.id, user.role);

  const health = await CampaignHealthService.calculateHealth(request.params.campaignId);

  return reply.code(200).send(health);
}
