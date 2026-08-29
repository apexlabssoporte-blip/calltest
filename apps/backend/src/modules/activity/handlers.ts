import { FastifyRequest, FastifyReply } from "fastify";
import { ActivityEventService } from "./event-service.js";
import { ActivityClassificationService } from "./classification-service.js";
import { AuthenticatedUser } from "../../core/middlewares/auth-guard.js";
import { verifyCampaignOwnership } from "../../core/middlewares/rbac-guard.js";
import { prisma } from "../../core/database/prisma.js";
import { NotFoundError } from "../../core/errors/app-error.js";
import {
  IngestActivityEvent,
  IngestActivityEventsBatch,
  TesterOverviewQuery,
} from "./schemas.js";

export async function ingestActivityEventHandler(
  request: FastifyRequest<{ Body: IngestActivityEvent | IngestActivityEventsBatch }>,
  reply: FastifyReply,
) {
  const user = request.user as AuthenticatedUser;

  if ("events" in request.body && Array.isArray(request.body.events)) {
    const results = await ActivityEventService.ingestBatch(
      user.id,
      request.body.events,
    );
    return reply.code(200).send({
      processedCount: results.length,
      results: results.map((r) => ({
        id: r.event.id,
        isDuplicate: r.isDuplicate,
        isAnomalousTimestamp: r.isAnomalousTimestamp,
      })),
    });
  }

  const singleEvent = request.body as IngestActivityEvent;
  const result = await ActivityEventService.ingestEvent(user.id, singleEvent);

  return reply.code(200).send({
    id: result.event.id,
    isDuplicate: result.isDuplicate,
    isAnomalousTimestamp: result.isAnomalousTimestamp,
  });
}

export async function getTesterActivityScoreHandler(
  request: FastifyRequest<{ Params: { campaignTesterId: string } }>,
  reply: FastifyReply,
) {
  const classification = await ActivityClassificationService.classifyTester(
    request.params.campaignTesterId,
  );

  const campaignTester = await prisma.campaignTester.findUnique({
    where: { id: request.params.campaignTesterId },
  });

  if (!campaignTester) {
    throw new NotFoundError("Campaign tester not found");
  }

  return reply.code(200).send({
    testerId: campaignTester.testerId,
    campaignTesterId: campaignTester.id,
    activityScore: classification.score,
    activityState: classification.state,
    signals: classification.signals,
  });
}

export async function getDeveloperTesterOverviewHandler(
  request: FastifyRequest<{ Params: TesterOverviewQuery }>,
  reply: FastifyReply,
) {
  const user = request.user as AuthenticatedUser;
  await verifyCampaignOwnership(request.params.campaignId, user.id, user.role);

  const campaignTester = await prisma.campaignTester.findFirst({
    where: {
      campaignId: request.params.campaignId,
      testerId: request.params.testerId,
    },
    include: {
      tester: {
        select: {
          id: true,
          email: true,
          displayName: true,
        },
      },
    },
  });

  if (!campaignTester) {
    throw new NotFoundError("Tester participation record not found");
  }

  const classification = await ActivityClassificationService.classifyTester(
    campaignTester.id,
  );

  return reply.code(200).send({
    testerId: campaignTester.testerId,
    displayName: campaignTester.tester.displayName,
    email: campaignTester.tester.email,
    joinedAt: campaignTester.joinedAt.toISOString(),
    expectedEndAt: campaignTester.expectedEndAt
      ? campaignTester.expectedEndAt.toISOString()
      : null,
    isReplacement: campaignTester.isReplacement,
    daysParticipating: classification.signals.daysEnrolled,
    completedMissionsCount: classification.signals.completedMissions,
    activityScore: classification.score,
    activityState: classification.state,
  });
}
