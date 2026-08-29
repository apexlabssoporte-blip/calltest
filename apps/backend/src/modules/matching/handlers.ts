import { FastifyRequest, FastifyReply } from "fastify";
import { MatchingEngine } from "./service.js";
import { TesterLoadService } from "./load-service.js";
import { AuthenticatedUser } from "../../core/middlewares/auth-guard.js";
import { EvaluateMatchingParams } from "./schemas.js";

export async function evaluateMatchingHandler(
  request: FastifyRequest<{ Params: EvaluateMatchingParams }>,
  reply: FastifyReply,
) {
  const user = request.user as AuthenticatedUser | undefined;
  const actorId = user?.id || "internal-service";
  const actorRole = user?.role || ("ADMIN" as any);

  const result = await MatchingEngine.evaluateAndAssignReplacements(
    request.params.campaignId,
    actorId,
    actorRole,
    {
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
    },
  );

  return reply.code(200).send({
    campaignId: result.campaignId,
    assignedCount: result.assignedCount,
    reason: result.reason,
    health: result.health,
    assignedTesters: result.assignedTesters.map((t) => ({
      testerId: t.testerId,
      campaignTesterId: t.campaignTesterId,
      score: t.score,
      joinedAt: t.joinedAt.toISOString(),
      expectedEndAt: t.expectedEndAt.toISOString(),
      isReplacement: t.isReplacement,
    })),
  });
}

export async function getTesterExposureHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const user = request.user as AuthenticatedUser;
  const load = await TesterLoadService.calculateLoad(user.id);

  return reply.code(200).send({
    userId: user.id,
    level: load.exposure.level,
    maxActiveCampaigns: load.maxActiveCampaigns,
    currentActiveCampaigns: load.activeCampaignsCount,
    completedCampaignsCount: load.exposure.completedCampaignsCount,
    abandonedCampaignsCount: load.exposure.abandonedCampaignsCount,
    averageActivityScore: load.exposure.averageActivityScore,
  });
}
