import { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../../core/database/prisma.js";
import { TrustProfileService } from "./trust-profile-service.js";
import { ReputationService } from "./reputation-service.js";
import { AuthenticatedUser } from "../../core/middlewares/auth-guard.js";
import { UserTrustParams } from "./schemas.js";
import { NotFoundError } from "../../core/errors/app-error.js";

export async function getMyTrustHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const user = request.user as AuthenticatedUser;
  const profile = await TrustProfileService.getOrCreateProfile(user.id);

  const history = await prisma.trustHistory.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return reply.code(200).send({
    userId: profile.userId,
    trustScore: profile.trustScore,
    trustRank: profile.trustRank,
    reputationStatus: profile.reputationStatus,
    completedCampaignsCount: profile.completedCampaignsCount,
    abandonedCampaignsCount: profile.abandonedCampaignsCount,
    history: history.map((h) => ({
      id: h.id,
      previousScore: h.previousScore,
      newScore: h.newScore,
      previousRank: h.previousRank,
      newRank: h.newRank,
      eventType: h.eventType,
      reason: h.reason,
      createdAt: h.createdAt.toISOString(),
    })),
  });
}

export async function getMyReputationHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const user = request.user as AuthenticatedUser;
  const rep = await ReputationService.getReputation(user.id);

  return reply.code(200).send(rep);
}

export async function getUserTrustForDeveloperHandler(
  request: FastifyRequest<{ Params: UserTrustParams }>,
  reply: FastifyReply,
) {
  const targetUser = await prisma.user.findUnique({
    where: { id: request.params.userId },
  });

  if (!targetUser) {
    throw new NotFoundError("User not found");
  }

  const profile = await TrustProfileService.getOrCreateProfile(targetUser.id);

  // PRIVACY: Sanitized public metrics only. No raw internal fraud data.
  return reply.code(200).send({
    userId: profile.userId,
    trustRank: profile.trustRank,
    reputationStatus: profile.reputationStatus,
    completedCampaignsCount: profile.completedCampaignsCount,
  });
}
