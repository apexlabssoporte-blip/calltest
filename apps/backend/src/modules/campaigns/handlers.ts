import { FastifyRequest, FastifyReply } from "fastify";
import { CampaignService } from "./service.js";
import { AuthenticatedUser } from "../../core/middlewares/auth-guard.js";
import {
  CreateCampaignRequest,
  UpdateCampaignRequest,
  CampaignTransitionRequest,
  AppCampaignParams,
  CampaignParams,
  CampaignTesterOverviewParams,
} from "./schemas.js";
import { CampaignOperationsService } from "./operations/campaign-operations.service.js";
import { CampaignReadinessService } from "./operations/campaign-readiness.service.js";
import { PlayStoreValidationService } from "./validation/play-store-validation.service.js";
import { GoogleGroupValidationService } from "./validation/google-group-validation.service.js";
import { CampaignCompletionService } from "./operations/campaign-completion.service.js";
import { CampaignEarlyCompletionService } from "./early-completion.service.js";
import { DashboardService } from "./dashboard.service.js";
import { prisma } from "../../core/database/prisma.js";
import { AuditService } from "../../core/services/audit-service.js";
import { AuditAction, UserRole } from "@calltest/shared-types";
import { ForbiddenError, NotFoundError } from "../../core/errors/app-error.js";

async function verifyCampaignOwnership(campaignId: string, user: AuthenticatedUser) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { app: true },
  });

  if (!campaign) {
    throw new NotFoundError("Campaign not found");
  }

  if (user.role !== UserRole.ADMIN && campaign.app.developerId !== user.id) {
    throw new ForbiddenError("You do not have permission to access this campaign");
  }

  return campaign;
}

export async function createCampaignHandler(
  request: FastifyRequest<{
    Params: AppCampaignParams;
    Body: CreateCampaignRequest;
  }>,
  reply: FastifyReply,
) {
  const user = request.user as AuthenticatedUser;
  const campaign = await CampaignService.createCampaign(
    request.params.appId,
    user.id,
    user.role,
    request.body,
    {
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
    },
  );

  return reply.code(201).send({
    id: campaign.id,
    appId: campaign.appId,
    name: campaign.name,
    status: campaign.status,
    targetTesters: campaign.targetTesters,
    maxTesters: campaign.maxTesters,
    durationDays: campaign.durationDays,
    developerConfirmedLinksTest: campaign.developerConfirmedLinksTest,
    storeValidationStatus: campaign.storeValidationStatus,
    groupValidationStatus: campaign.groupValidationStatus,
    startsAt: campaign.startsAt ? campaign.startsAt.toISOString() : null,
    endsAt: campaign.endsAt ? campaign.endsAt.toISOString() : null,
    createdAt: campaign.createdAt.toISOString(),
    updatedAt: campaign.updatedAt.toISOString(),
  });
}

export async function listAppCampaignsHandler(
  request: FastifyRequest<{ Params: AppCampaignParams }>,
  reply: FastifyReply,
) {
  const user = request.user as AuthenticatedUser;
  const campaigns = await CampaignService.listAppCampaigns(
    request.params.appId,
    user.id,
    user.role,
  );

  return reply.code(200).send(
    campaigns.map((c) => ({
      id: c.id,
      appId: c.appId,
      name: c.name,
      status: c.status,
      targetTesters: c.targetTesters,
      maxTesters: c.maxTesters,
      durationDays: c.durationDays,
      developerConfirmedLinksTest: c.developerConfirmedLinksTest,
      storeValidationStatus: c.storeValidationStatus,
      groupValidationStatus: c.groupValidationStatus,
      startsAt: c.startsAt ? c.startsAt.toISOString() : null,
      endsAt: c.endsAt ? c.endsAt.toISOString() : null,
      activeTestersCount: c.activeTestersCount,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    })),
  );
}

export async function getCampaignByIdHandler(
  request: FastifyRequest<{ Params: CampaignParams }>,
  reply: FastifyReply,
) {
  const user = request.user as AuthenticatedUser;
  const campaign = await CampaignService.getCampaignById(
    request.params.id,
    user.id,
    user.role,
  );

  return reply.code(200).send({
    id: campaign.id,
    appId: campaign.appId,
    name: campaign.name,
    status: campaign.status,
    targetTesters: campaign.targetTesters,
    maxTesters: campaign.maxTesters,
    durationDays: campaign.durationDays,
    developerConfirmedLinksTest: campaign.developerConfirmedLinksTest,
    storeValidationStatus: campaign.storeValidationStatus,
    groupValidationStatus: campaign.groupValidationStatus,
    startsAt: campaign.startsAt ? campaign.startsAt.toISOString() : null,
    endsAt: campaign.endsAt ? campaign.endsAt.toISOString() : null,
    activeTestersCount: campaign.activeTestersCount,
    createdAt: campaign.createdAt.toISOString(),
    updatedAt: campaign.updatedAt.toISOString(),
  });
}

export async function updateCampaignHandler(
  request: FastifyRequest<{
    Params: CampaignParams;
    Body: UpdateCampaignRequest;
  }>,
  reply: FastifyReply,
) {
  const user = request.user as AuthenticatedUser;
  const campaign = await CampaignService.updateCampaign(
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
    id: campaign.id,
    appId: campaign.appId,
    name: campaign.name,
    status: campaign.status,
    targetTesters: campaign.targetTesters,
    maxTesters: campaign.maxTesters,
    durationDays: campaign.durationDays,
    developerConfirmedLinksTest: campaign.developerConfirmedLinksTest,
    storeValidationStatus: campaign.storeValidationStatus,
    groupValidationStatus: campaign.groupValidationStatus,
    startsAt: campaign.startsAt ? campaign.startsAt.toISOString() : null,
    endsAt: campaign.endsAt ? campaign.endsAt.toISOString() : null,
    createdAt: campaign.createdAt.toISOString(),
    updatedAt: campaign.updatedAt.toISOString(),
  });
}

export async function transitionCampaignHandler(
  request: FastifyRequest<{
    Params: CampaignParams;
    Body: CampaignTransitionRequest;
  }>,
  reply: FastifyReply,
) {
  const user = request.user as AuthenticatedUser;
  const campaign = await CampaignService.transitionCampaign(
    request.params.id,
    user.id,
    user.role,
    request.body.targetStatus,
    {
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
    },
  );

  return reply.code(200).send({
    id: campaign.id,
    appId: campaign.appId,
    name: campaign.name,
    status: campaign.status,
    targetTesters: campaign.targetTesters,
    maxTesters: campaign.maxTesters,
    durationDays: campaign.durationDays,
    developerConfirmedLinksTest: campaign.developerConfirmedLinksTest,
    storeValidationStatus: campaign.storeValidationStatus,
    groupValidationStatus: campaign.groupValidationStatus,
    startsAt: campaign.startsAt ? campaign.startsAt.toISOString() : null,
    endsAt: campaign.endsAt ? campaign.endsAt.toISOString() : null,
    createdAt: campaign.createdAt.toISOString(),
    updatedAt: campaign.updatedAt.toISOString(),
  });
}

// -----------------------------------------------------------------------------
// PHASE 7 OPERATIONS HANDLERS
// -----------------------------------------------------------------------------

export async function getCampaignDashboardHandler(
  request: FastifyRequest<{ Params: CampaignParams }>,
  reply: FastifyReply,
) {
  const user = request.user as AuthenticatedUser;
  await verifyCampaignOwnership(request.params.id, user);

  const summary = await CampaignOperationsService.getCampaignOperationsSummary(request.params.id);

  return reply.code(200).send({
    ...summary,
    startsAt: summary.startsAt ? summary.startsAt.toISOString() : null,
    endsAt: summary.endsAt ? summary.endsAt.toISOString() : null,
    expectedEndAt: summary.expectedEndAt ? summary.expectedEndAt.toISOString() : null,
    publicVerifiedAt: summary.publicVerifiedAt ? summary.publicVerifiedAt.toISOString() : null,
  });
}

export async function getCampaignReadinessHandler(
  request: FastifyRequest<{ Params: CampaignParams }>,
  reply: FastifyReply,
) {
  const user = request.user as AuthenticatedUser;
  await verifyCampaignOwnership(request.params.id, user);

  const readiness = await CampaignReadinessService.evaluateReadiness(request.params.id);

  return reply.code(200).send(readiness);
}

export async function validateCampaignLinksHandler(
  request: FastifyRequest<{ Params: CampaignParams }>,
  reply: FastifyReply,
) {
  const user = request.user as AuthenticatedUser;
  const campaign = await verifyCampaignOwnership(request.params.id, user);

  const [playStore, googleGroup] = await Promise.all([
    PlayStoreValidationService.validatePlayStoreUrl(
      campaign.app.playStoreUrl,
      campaign.app.packageName,
    ),
    GoogleGroupValidationService.validateGoogleGroup(
      campaign.app.googleGroupUrl,
    ),
  ]);

  const now = new Date();
  await prisma.campaign.update({
    where: { id: campaign.id },
    data: {
      storeValidationStatus: playStore.status,
      groupValidationStatus: googleGroup.status,
      lastStoreValidationAt: now,
      lastGroupValidationAt: now,
    },
  });

  await AuditService.log({
    userId: user.id,
    campaignId: campaign.id,
    action: AuditAction.STORE_VALIDATION_PERFORMED,
    entityName: "Campaign",
    entityId: campaign.id,
    changes: {
      storeValidationStatus: playStore.status,
      groupValidationStatus: googleGroup.status,
    },
  });

  return reply.code(200).send({
    campaignId: campaign.id,
    playStore: {
      validUrl: playStore.validUrl,
      reachable: playStore.reachable,
      packageName: playStore.packageName,
      packageMatches: playStore.packageMatches,
      isPubliclyAvailable: playStore.isPubliclyAvailable,
      status: playStore.status,
      message: playStore.message,
    },
    googleGroup: {
      valid: googleGroup.valid,
      reachable: googleGroup.reachable,
      requiresApproval: googleGroup.requiresApproval,
      publiclyJoinable: googleGroup.publiclyJoinable,
      status: googleGroup.status,
      message: googleGroup.message,
    },
    updatedAt: now.toISOString(),
  });
}

export async function confirmLinksTestHandler(
  request: FastifyRequest<{ Params: CampaignParams }>,
  reply: FastifyReply,
) {
  const user = request.user as AuthenticatedUser;
  const campaign = await verifyCampaignOwnership(request.params.id, user);

  const now = new Date();
  await prisma.campaign.update({
    where: { id: campaign.id },
    data: {
      developerConfirmedLinksTest: true,
    },
  });

  await AuditService.log({
    userId: user.id,
    campaignId: campaign.id,
    action: AuditAction.CAMPAIGN_LINKS_TEST_CONFIRMED,
    entityName: "Campaign",
    entityId: campaign.id,
    changes: { developerConfirmedLinksTest: true },
  });

  return reply.code(200).send({
    campaignId: campaign.id,
    developerConfirmedLinksTest: true,
    confirmedAt: now.toISOString(),
  });
}

export async function completeCampaignHandler(
  request: FastifyRequest<{ Params: CampaignParams }>,
  reply: FastifyReply,
) {
  const user = request.user as AuthenticatedUser;
  await verifyCampaignOwnership(request.params.id, user);

  const result = await CampaignCompletionService.completeCampaign(request.params.id, user.id);

  return reply.code(200).send({
    campaignId: result.campaignId,
    previousStatus: result.previousStatus,
    newStatus: result.newStatus,
    completedTestersCount: result.completedTestersCount,
    isPubliclyVerified: result.isPubliclyVerified,
    completedAt: result.completedAt.toISOString(),
  });
}

export async function getSanitizedTesterOverviewHandler(
  request: FastifyRequest<{ Params: CampaignTesterOverviewParams }>,
  reply: FastifyReply,
) {
  const user = request.user as AuthenticatedUser;
  const campaign = await verifyCampaignOwnership(request.params.campaignId, user);

  const campaignTester = await prisma.campaignTester.findFirst({
    where: {
      campaignId: campaign.id,
      testerId: request.params.testerId,
    },
    include: {
      tester: true,
      missionAttempts: true,
      difficultyFeedbacks: true,
      qualityFeedbacks: true,
      activityEvents: {
        orderBy: { serverTimestamp: "desc" },
        take: 1,
      },
    },
  });

  if (!campaignTester) {
    throw new NotFoundError("Tester assignment not found in this campaign");
  }

  // Calculate sanitized statistics
  const now = new Date();
  const joinedMs = campaignTester.joinedAt.getTime();
  const endMs = campaignTester.actualEndAt ? campaignTester.actualEndAt.getTime() : now.getTime();
  const daysParticipating = Math.max(1, Math.floor((endMs - joinedMs) / (1000 * 60 * 60 * 24)));

  const totalCampaignMissions = await prisma.mission.count({
    where: { campaignId: campaign.id },
  });

  const completedMissionsCount = campaignTester.missionAttempts.filter(
    (a) => a.status === "VALIDATED" || a.status === "SUBMITTED",
  ).length;

  const pendingMissionsCount = Math.max(0, totalCampaignMissions - completedMissionsCount);
  const completionPercentage = totalCampaignMissions > 0
    ? Math.min(100, Math.round((completedMissionsCount / totalCampaignMissions) * 100))
    : 100;

  const lastActivityAt = campaignTester.activityEvents[0]?.serverTimestamp || null;
  const feedbacksSubmittedCount = campaignTester.difficultyFeedbacks.length + campaignTester.qualityFeedbacks.length;

  return reply.code(200).send({
    campaignTesterId: campaignTester.id,
    campaignId: campaignTester.campaignId,
    testerId: campaignTester.testerId,
    displayName: campaignTester.tester.displayName,
    status: campaignTester.status,
    assignmentType: campaignTester.assignmentType,
    isReplacement: campaignTester.isReplacement,
    joinedAt: campaignTester.joinedAt.toISOString(),
    expectedEndAt: campaignTester.expectedEndAt ? campaignTester.expectedEndAt.toISOString() : null,
    actualEndAt: campaignTester.actualEndAt ? campaignTester.actualEndAt.toISOString() : null,
    daysParticipating,
    completedMissionsCount,
    pendingMissionsCount,
    completionPercentage,
    activityScore: campaignTester.activityScore,
    lastActivityAt: lastActivityAt ? lastActivityAt.toISOString() : null,
    feedbacksSubmittedCount,
    participationStatus: campaignTester.status,
  });
}

/**
 * Ends campaign early when verified on Google Play
 */
export async function endCampaignEarlyHandler(
  request: FastifyRequest<{ Params: { id: string }; Body: { publicUrl?: string } }>,
  reply: FastifyReply,
) {
  const userId = (request.user as any).sub;
  const campaign = await CampaignEarlyCompletionService.endCampaignEarly(
    request.params.id,
    userId,
    request.body?.publicUrl,
  );
  return reply.code(200).send({
    success: true,
    campaign,
    message: "Campaign ended early successfully. All enrolled testers have received full completion credit.",
  });
}

/**
 * Retrieves authenticated tester dashboard
 */
export async function getTesterDashboardHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const userId = (request.user as any).sub;
  const dashboard = await DashboardService.getTesterDashboard(userId);
  return reply.code(200).send(dashboard);
}

/**
 * Retrieves developer dashboard for a campaign
 */
export async function getDeveloperDashboardHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const dashboard = await DashboardService.getDeveloperDashboard(request.params.id);
  return reply.code(200).send(dashboard);
}

