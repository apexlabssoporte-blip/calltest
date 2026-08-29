import { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../../core/database/prisma.js";
import { FraudScoreService } from "./fraud-score-service.js";
import { UserFraudParams } from "./schemas.js";
import { NotFoundError } from "../../core/errors/app-error.js";

export async function getUserFraudReportHandler(
  request: FastifyRequest<{ Params: UserFraudParams }>,
  reply: FastifyReply,
) {
  const targetUser = await prisma.user.findUnique({
    where: { id: request.params.userId },
  });

  if (!targetUser) {
    throw new NotFoundError("User not found");
  }

  const scoreResult = await FraudScoreService.calculateFraudScore(targetUser.id);

  const events = await prisma.fraudEvent.findMany({
    where: { userId: targetUser.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return reply.code(200).send({
    userId: targetUser.id,
    fraudScore: scoreResult.fraudScore,
    unresolvedEventsCount: scoreResult.unresolvedEventsCount,
    criticalEventsCount: scoreResult.criticalEventsCount,
    highestSeverity: scoreResult.highestSeverity,
    recommendedStatus: scoreResult.recommendedStatus,
    events: events.map((e) => ({
      id: e.id,
      type: e.type,
      severity: e.severity,
      scoreImpact: e.scoreImpact,
      reason: e.reason,
      sourceId: e.sourceId || undefined,
      createdAt: e.createdAt.toISOString(),
    })),
  });
}
