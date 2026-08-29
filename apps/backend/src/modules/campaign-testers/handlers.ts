import { FastifyRequest, FastifyReply } from "fastify";
import { CampaignTesterService } from "./service.js";
import { AuthenticatedUser } from "../../core/middlewares/auth-guard.js";
import {
  CampaignTesterParams,
  CampaignTesterDetailParams,
  AddTesterToCampaignRequest,
  RemoveTesterFromCampaignRequest,
} from "./schemas.js";

export async function listCampaignTestersHandler(
  request: FastifyRequest<{ Params: CampaignTesterParams }>,
  reply: FastifyReply,
) {
  const user = request.user as AuthenticatedUser;
  const testers = await CampaignTesterService.listCampaignTesters(
    request.params.campaignId,
    user.id,
    user.role,
  );

  return reply.code(200).send(
    testers.map((t) => ({
      id: t.id,
      campaignId: t.campaignId,
      testerId: t.testerId,
      assignmentType: t.assignmentType,
      status: t.status,
      activityScore: t.activityScore,
      isReplacement: t.isReplacement,
      exitReason: t.exitReason,
      joinedAt: t.joinedAt.toISOString(),
      expectedEndAt: t.expectedEndAt ? t.expectedEndAt.toISOString() : null,
      actualEndAt: t.actualEndAt ? t.actualEndAt.toISOString() : null,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      tester: t.tester
        ? {
            id: t.tester.id,
            email: t.tester.email,
            displayName: t.tester.displayName,
            trustScore: t.tester.trustScore,
            rank: t.tester.rank,
          }
        : undefined,
    })),
  );
}

export async function getCampaignTesterHandler(
  request: FastifyRequest<{ Params: CampaignTesterDetailParams }>,
  reply: FastifyReply,
) {
  const user = request.user as AuthenticatedUser;
  const t = await CampaignTesterService.getCampaignTester(
    request.params.campaignId,
    request.params.testerId,
    user.id,
    user.role,
  );

  return reply.code(200).send({
    id: t.id,
    campaignId: t.campaignId,
    testerId: t.testerId,
    assignmentType: t.assignmentType,
    status: t.status,
    activityScore: t.activityScore,
    isReplacement: t.isReplacement,
    exitReason: t.exitReason,
    joinedAt: t.joinedAt.toISOString(),
    expectedEndAt: t.expectedEndAt ? t.expectedEndAt.toISOString() : null,
    actualEndAt: t.actualEndAt ? t.actualEndAt.toISOString() : null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    tester: t.tester
      ? {
          id: t.tester.id,
          email: t.tester.email,
          displayName: t.tester.displayName,
          trustScore: t.tester.trustScore,
          rank: t.tester.rank,
        }
      : undefined,
  });
}

export async function addTesterToCampaignHandler(
  request: FastifyRequest<{
    Params: CampaignTesterParams;
    Body: AddTesterToCampaignRequest;
  }>,
  reply: FastifyReply,
) {
  const user = request.user as AuthenticatedUser;
  const t = await CampaignTesterService.addTesterToCampaign(
    request.params.campaignId,
    user.id,
    user.role,
    request.body,
    {
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
    },
  );

  return reply.code(201).send({
    id: t.id,
    campaignId: t.campaignId,
    testerId: t.testerId,
    assignmentType: t.assignmentType,
    status: t.status,
    activityScore: t.activityScore,
    isReplacement: t.isReplacement,
    exitReason: t.exitReason,
    joinedAt: t.joinedAt.toISOString(),
    expectedEndAt: t.expectedEndAt ? t.expectedEndAt.toISOString() : null,
    actualEndAt: t.actualEndAt ? t.actualEndAt.toISOString() : null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    tester: t.tester
      ? {
          id: t.tester.id,
          email: t.tester.email,
          displayName: t.tester.displayName,
          trustScore: t.tester.trustScore,
          rank: t.tester.rank,
        }
      : undefined,
  });
}

export async function removeTesterFromCampaignHandler(
  request: FastifyRequest<{
    Params: CampaignTesterDetailParams;
    Body?: RemoveTesterFromCampaignRequest;
  }>,
  reply: FastifyReply,
) {
  const user = request.user as AuthenticatedUser;
  const t = await CampaignTesterService.removeTesterFromCampaign(
    request.params.campaignId,
    request.params.testerId,
    user.id,
    user.role,
    request.body?.exitReason,
    {
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
    },
  );

  return reply.code(200).send({
    id: t.id,
    campaignId: t.campaignId,
    testerId: t.testerId,
    assignmentType: t.assignmentType,
    status: t.status,
    activityScore: t.activityScore,
    isReplacement: t.isReplacement,
    exitReason: t.exitReason,
    joinedAt: t.joinedAt.toISOString(),
    expectedEndAt: t.expectedEndAt ? t.expectedEndAt.toISOString() : null,
    actualEndAt: t.actualEndAt ? t.actualEndAt.toISOString() : null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    tester: t.tester
      ? {
          id: t.tester.id,
          email: t.tester.email,
          displayName: t.tester.displayName,
          trustScore: t.tester.trustScore,
          rank: t.tester.rank,
        }
      : undefined,
  });
}

export async function joinCampaignHandler(
  request: FastifyRequest<{ Params: CampaignTesterParams }>,
  reply: FastifyReply,
) {
  const user = request.user as AuthenticatedUser;
  const t = await CampaignTesterService.joinCampaign(
    request.params.campaignId,
    user.id,
    user.role,
    {
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
    },
  );

  return reply.code(201).send({
    id: t.id,
    campaignId: t.campaignId,
    testerId: t.testerId,
    assignmentType: t.assignmentType,
    status: t.status,
    activityScore: t.activityScore,
    isReplacement: t.isReplacement,
    exitReason: t.exitReason,
    joinedAt: t.joinedAt.toISOString(),
    expectedEndAt: t.expectedEndAt ? t.expectedEndAt.toISOString() : null,
    actualEndAt: t.actualEndAt ? t.actualEndAt.toISOString() : null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  });
}

export async function listAvailableCampaignsHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const user = request.user as AuthenticatedUser;
  const campaigns = await CampaignTesterService.listAvailableCampaignsForTester(user.id);
  return reply.code(200).send(campaigns);
}

export async function listMyCampaignsHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const user = request.user as AuthenticatedUser;
  const participations = await CampaignTesterService.listTesterParticipations(user.id);
  return reply.code(200).send(participations);
}

export async function getMyCampaignDetailHandler(
  request: FastifyRequest<{ Params: CampaignTesterParams }>,
  reply: FastifyReply,
) {
  const user = request.user as AuthenticatedUser;
  const detail = await CampaignTesterService.getTesterParticipationDetail(
    request.params.campaignId,
    user.id,
  );
  return reply.code(200).send(detail);
}
