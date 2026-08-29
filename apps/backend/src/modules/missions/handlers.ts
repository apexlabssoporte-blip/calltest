import { FastifyRequest, FastifyReply } from "fastify";
import { MissionService } from "./service.js";
import { MissionAttemptService } from "./attempt-service.js";
import { MissionFeedbackService } from "./feedback-service.js";
import { MissionScheduleService } from "./mission-schedule.service.js";
import { prisma } from "../../core/database/prisma.js";
import { AuthenticatedUser } from "../../core/middlewares/auth-guard.js";
import {
  CreateMissionRequest,
  UpdateMissionRequest,
  ApproveMissionRequest,
  RejectMissionRequest,
  GenerateMissionsRequest,
  SubmitAttemptRequest,
  DifficultyFeedbackRequest,
  QualityFeedbackRequest,
  CampaignMissionsParams,
  MissionParams,
  StartAttemptParams,
  AttemptParams,
  TesterMissionsParams,
} from "./schemas.js";

export async function createMissionHandler(
  request: FastifyRequest<{
    Params: CampaignMissionsParams;
    Body: CreateMissionRequest;
  }>,
  reply: FastifyReply,
) {
  const user = request.user as AuthenticatedUser;
  const mission = await MissionService.createMission(
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
    id: mission.id,
    campaignId: mission.campaignId,
    title: mission.title,
    description: mission.description,
    objective: mission.objective,
    steps: mission.steps,
    difficulty: mission.difficulty,
    estimatedMinutes: mission.estimatedMinutes,
    validationMethod: mission.validationMethod,
    status: mission.status,
    createdAt: mission.createdAt.toISOString(),
    updatedAt: mission.updatedAt.toISOString(),
  });
}

export async function generateMissionsHandler(
  request: FastifyRequest<{
    Params: CampaignMissionsParams;
    Body: GenerateMissionsRequest;
  }>,
  reply: FastifyReply,
) {
  const user = request.user as AuthenticatedUser;
  const missions = await MissionService.generateMissions(
    request.params.campaignId,
    user.id,
    user.role,
    request.body,
    {
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
    },
  );

  return reply.code(201).send(
    missions.map((m) => ({
      id: m.id,
      campaignId: m.campaignId,
      title: m.title,
      description: m.description,
      objective: m.objective,
      steps: m.steps,
      difficulty: m.difficulty,
      estimatedMinutes: m.estimatedMinutes,
      validationMethod: m.validationMethod,
      status: m.status,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    })),
  );
}

export async function listCampaignMissionsHandler(
  request: FastifyRequest<{ Params: CampaignMissionsParams }>,
  reply: FastifyReply,
) {
  const user = request.user as AuthenticatedUser;
  const missions = await MissionService.listCampaignMissions(
    request.params.campaignId,
    user.role,
  );

  return reply.code(200).send(
    missions.map((m) => ({
      id: m.id,
      campaignId: m.campaignId,
      title: m.title,
      description: m.description,
      objective: m.objective,
      steps: m.steps,
      difficulty: m.difficulty,
      estimatedMinutes: m.estimatedMinutes,
      validationMethod: m.validationMethod,
      status: m.status,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    })),
  );
}

export async function getMissionByIdHandler(
  request: FastifyRequest<{ Params: MissionParams }>,
  reply: FastifyReply,
) {
  const mission = await MissionService.getMissionById(request.params.id);

  return reply.code(200).send({
    id: mission.id,
    campaignId: mission.campaignId,
    title: mission.title,
    description: mission.description,
    objective: mission.objective,
    steps: mission.steps,
    difficulty: mission.difficulty,
    estimatedMinutes: mission.estimatedMinutes,
    validationMethod: mission.validationMethod,
    status: mission.status,
    createdAt: mission.createdAt.toISOString(),
    updatedAt: mission.updatedAt.toISOString(),
  });
}

export async function updateMissionHandler(
  request: FastifyRequest<{
    Params: MissionParams;
    Body: UpdateMissionRequest;
  }>,
  reply: FastifyReply,
) {
  const user = request.user as AuthenticatedUser;
  const mission = await MissionService.updateMission(
    request.params.id,
    user.id,
    user.role,
    request.body,
    {
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
    },
  );

  return reply.code(200).send({
    id: mission.id,
    campaignId: mission.campaignId,
    title: mission.title,
    description: mission.description,
    objective: mission.objective,
    steps: mission.steps,
    difficulty: mission.difficulty,
    estimatedMinutes: mission.estimatedMinutes,
    validationMethod: mission.validationMethod,
    status: mission.status,
    createdAt: mission.createdAt.toISOString(),
    updatedAt: mission.updatedAt.toISOString(),
  });
}

export async function approveMissionHandler(
  request: FastifyRequest<{
    Params: MissionParams;
    Body?: ApproveMissionRequest;
  }>,
  reply: FastifyReply,
) {
  const user = request.user as AuthenticatedUser;
  const mission = await MissionService.approveMission(
    request.params.id,
    user.id,
    user.role,
    request.body?.reason,
    {
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
    },
  );

  return reply.code(200).send({
    id: mission.id,
    campaignId: mission.campaignId,
    title: mission.title,
    description: mission.description,
    objective: mission.objective,
    steps: mission.steps,
    difficulty: mission.difficulty,
    estimatedMinutes: mission.estimatedMinutes,
    validationMethod: mission.validationMethod,
    status: mission.status,
    createdAt: mission.createdAt.toISOString(),
    updatedAt: mission.updatedAt.toISOString(),
  });
}

export async function rejectMissionHandler(
  request: FastifyRequest<{
    Params: MissionParams;
    Body: RejectMissionRequest;
  }>,
  reply: FastifyReply,
) {
  const user = request.user as AuthenticatedUser;
  const mission = await MissionService.rejectMission(
    request.params.id,
    user.id,
    user.role,
    request.body.reason,
    {
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
    },
  );

  return reply.code(200).send({
    id: mission.id,
    campaignId: mission.campaignId,
    title: mission.title,
    description: mission.description,
    objective: mission.objective,
    steps: mission.steps,
    difficulty: mission.difficulty,
    estimatedMinutes: mission.estimatedMinutes,
    validationMethod: mission.validationMethod,
    status: mission.status,
    createdAt: mission.createdAt.toISOString(),
    updatedAt: mission.updatedAt.toISOString(),
  });
}

export async function startAttemptHandler(
  request: FastifyRequest<{ Params: StartAttemptParams }>,
  reply: FastifyReply,
) {
  const user = request.user as AuthenticatedUser;
  const attempt = await MissionAttemptService.startAttempt(
    request.params.missionId,
    user.id,
    {
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
    },
  );

  return reply.code(201).send({
    id: attempt.id,
    missionId: attempt.missionId,
    campaignTesterId: attempt.campaignTesterId,
    testerId: attempt.testerId,
    status: attempt.status,
    attemptCount: attempt.attemptCount,
    validationStatus: attempt.validationStatus,
    startedAt: attempt.startedAt.toISOString(),
    completedAt: attempt.completedAt ? attempt.completedAt.toISOString() : null,
    createdAt: attempt.createdAt.toISOString(),
    updatedAt: attempt.updatedAt.toISOString(),
  });
}

export async function submitAttemptHandler(
  request: FastifyRequest<{
    Params: AttemptParams;
    Body?: SubmitAttemptRequest;
  }>,
  reply: FastifyReply,
) {
  const user = request.user as AuthenticatedUser;
  const attempt = await MissionAttemptService.submitAttempt(
    request.params.id,
    user.id,
    request.body?.proofData as Record<string, unknown> | undefined,
    {
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
    },
  );

  return reply.code(200).send({
    id: attempt.id,
    missionId: attempt.missionId,
    campaignTesterId: attempt.campaignTesterId,
    testerId: attempt.testerId,
    status: attempt.status,
    attemptCount: attempt.attemptCount,
    validationStatus: attempt.validationStatus,
    startedAt: attempt.startedAt.toISOString(),
    completedAt: attempt.completedAt ? attempt.completedAt.toISOString() : null,
    createdAt: attempt.createdAt.toISOString(),
    updatedAt: attempt.updatedAt.toISOString(),
  });
}

export async function listTesterMissionsHandler(
  request: FastifyRequest<{ Params: TesterMissionsParams }>,
  reply: FastifyReply,
) {
  const user = request.user as AuthenticatedUser;
  const attempts = await MissionAttemptService.listTesterMissions(
    request.params.testerId,
    user.id,
    user.role,
  );

  return reply.code(200).send(
    attempts.map((a) => ({
      id: a.id,
      missionId: a.missionId,
      campaignTesterId: a.campaignTesterId,
      testerId: a.testerId,
      status: a.status,
      attemptCount: a.attemptCount,
      validationStatus: a.validationStatus,
      startedAt: a.startedAt.toISOString(),
      completedAt: a.completedAt ? a.completedAt.toISOString() : null,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
      mission: {
        id: a.mission.id,
        campaignId: a.mission.campaignId,
        title: a.mission.title,
        description: a.mission.description,
        objective: a.mission.objective,
        steps: a.mission.steps as string[],
        difficulty: a.mission.difficulty,
        estimatedMinutes: a.mission.estimatedMinutes,
        validationMethod: a.mission.validationMethod,
        status: a.mission.status,
        createdAt: a.mission.createdAt.toISOString(),
        updatedAt: a.mission.updatedAt.toISOString(),
      },
    })),
  );
}

export async function recordDifficultyFeedbackHandler(
  request: FastifyRequest<{
    Params: AttemptParams;
    Body: DifficultyFeedbackRequest;
  }>,
  reply: FastifyReply,
) {
  const user = request.user as AuthenticatedUser;
  const feedback = await MissionFeedbackService.recordDifficultyFeedback(
    request.params.id,
    user.id,
    request.body.rating,
    {
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
    },
  );

  return reply.code(201).send({
    id: feedback.id,
    missionId: feedback.missionId,
    campaignTesterId: feedback.campaignTesterId,
    rating: feedback.rating,
    createdAt: feedback.createdAt.toISOString(),
  });
}

export async function recordQualityFeedbackHandler(
  request: FastifyRequest<{
    Params: AttemptParams;
    Body: QualityFeedbackRequest;
  }>,
  reply: FastifyReply,
) {
  const user = request.user as AuthenticatedUser;
  const feedback = await MissionFeedbackService.recordQualityFeedback(
    request.params.id,
    user.id,
    request.body.feedback,
    request.body.comment,
    {
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
    },
  );

  return reply.code(201).send({
    id: feedback.id,
    missionId: feedback.missionId,
    campaignTesterId: feedback.campaignTesterId,
    feedback: feedback.feedback,
    comment: feedback.comment,
    createdAt: feedback.createdAt.toISOString(),
  });
}

export async function getDailyMissionsInboxHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const user = request.user as AuthenticatedUser;
  const assignments = await prisma.campaignTester.findMany({
    where: {
      testerId: user.id,
      status: "ACTIVE",
    },
    include: {
      campaign: {
        include: { app: true },
      },
    },
  });

  const now = new Date();
  const campaignSchedules = assignments.map((assignment, index) => {
    const startsAt = assignment.campaign.startsAt || assignment.campaign.createdAt;
    const daysSinceStart = Math.max(1, Math.floor((now.getTime() - new Date(startsAt).getTime()) / (1000 * 60 * 60 * 24)));
    const missions = MissionScheduleService.generate14DayStaggeredSchedule(
      assignment.campaignId,
      assignment.id,
      startsAt,
      index
    );
    return {
      campaignId: assignment.campaignId,
      appName: assignment.campaign.app.name,
      campaignDay: daysSinceStart,
      missions,
    };
  });

  const inbox = MissionScheduleService.aggregateDailyInbox(user.id, campaignSchedules, now);
  return reply.code(200).send(inbox);
}
