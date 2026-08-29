import { prisma } from "../../core/database/prisma.js";
import { verifyCampaignOwnership } from "../../core/middlewares/rbac-guard.js";
import { AuditService } from "../../core/services/audit-service.js";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../core/errors/app-error.js";
import {
  AttemptStatus,
  AuditAction,
  CampaignStatus,
  InstallationStatus,
  InstallationVerificationMethod,
  SdkIntegrationStatus,
  TesterAssignmentType,
  TesterStatus,
  UserRole,
  UserStatus,
} from "@calltest/shared-types";
import { AddTesterToCampaignRequest } from "./schemas.js";
import { eventBus } from "../../core/events/domain-event-bus.js";
import { ParticipationVerificationService } from "../participation/service.js";

export class CampaignTesterService {
  /**
   * Adds a tester to a campaign with invariant enforcement (12/15 rule, uniqueness, individual duration).
   */
  public static async addTesterToCampaign(
    campaignId: string,
    developerId: string,
    userRole: UserRole,
    data: AddTesterToCampaignRequest,
    context?: { ipAddress?: string; userAgent?: string },
  ) {
    const campaign = await verifyCampaignOwnership(campaignId, developerId, userRole);

    // Self-Testing Protection
    if (campaign.app.developerId === data.testerId) {
      throw new BadRequestError("SELF_TESTING_NOT_ALLOWED: Developers cannot participate as testers in their own applications");
    }

    // Verify tester existence and eligible role
    const testerUser = await prisma.user.findUnique({
      where: { id: data.testerId },
    });

    if (!testerUser) {
      throw new NotFoundError("Tester user not found");
    }

    if (testerUser.status !== UserStatus.ACTIVE) {
      throw new BadRequestError(`Cannot assign a tester with status '${testerUser.status}'`);
    }

    if (testerUser.role !== UserRole.TESTER && testerUser.role !== UserRole.BOTH && testerUser.role !== UserRole.ADMIN) {
      throw new BadRequestError("User does not have TESTER role");
    }

    // Uniqueness: User cannot have multiple active memberships in the same campaign
    const existingActiveParticipation = await prisma.campaignTester.findFirst({
      where: {
        campaignId,
        testerId: data.testerId,
        status: {
          in: [TesterStatus.INVITED, TesterStatus.ACTIVE, TesterStatus.LOW_ACTIVITY],
        },
      },
    });

    if (existingActiveParticipation) {
      throw new ConflictError("User already has an active participation in this campaign");
    }

    const assignedStatus = data.status ?? TesterStatus.ACTIVE;

    // Individual participation dates calculation (never based on global campaign.startsAt)
    const joinedAt = new Date();
    const expectedEndAt = new Date(
      joinedAt.getTime() + campaign.durationDays * 24 * 60 * 60 * 1000,
    );

    const campaignTester = await prisma.$transaction(async (tx) => {
      // Rule of 12 / 15: Maximum active testers constraint inside transaction
      if (assignedStatus === TesterStatus.ACTIVE) {
        const activeTestersCount = await tx.campaignTester.count({
          where: {
            campaignId,
            status: TesterStatus.ACTIVE,
          },
        });

        if (activeTestersCount >= campaign.maxTesters) {
          throw new BadRequestError(
            `Cannot exceed maximum of ${campaign.maxTesters} active testers for this campaign`,
          );
        }
      }

      return tx.campaignTester.create({
        data: {
          campaignId,
          testerId: data.testerId,
          assignmentType: data.assignmentType ?? TesterAssignmentType.PRIMARY,
          status: assignedStatus,
          isReplacement: data.isReplacement ?? false,
          joinedAt,
          expectedEndAt,
        },
        include: {
          tester: {
            select: {
              id: true,
              email: true,
              displayName: true,
              trustScore: true,
              rank: true,
            },
          },
        },
      });
    });

    await AuditService.log({
      userId: developerId,
      campaignId,
      action: AuditAction.CAMPAIGN_TESTER_ADDED,
      entityName: "CampaignTester",
      entityId: campaignTester.id,
      changes: {
        testerId: data.testerId,
        isReplacement: campaignTester.isReplacement,
        status: campaignTester.status,
      },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    return campaignTester;
  }

  /**
   * Tester self-enrolls into an eligible campaign.
   * STRICT PRINCIPLES:
   * - Self-testing protection: Developer cannot test their own app.
   * - Individual joinedAt and expectedEndAt calculation.
   * - Invariant check: max active testers <= 15.
   */
  public static async joinCampaign(
    campaignId: string,
    testerId: string,
    userRole: UserRole,
    context?: { ipAddress?: string; userAgent?: string },
  ) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { app: true },
    });

    if (!campaign) {
      throw new NotFoundError("Campaign not found");
    }

    // Self-Testing Guard: Developer cannot test their own app
    if (campaign.app.developerId === testerId) {
      throw new BadRequestError("SELF_TESTING_NOT_ALLOWED: Developers cannot participate as testers in their own applications");
    }

    if (
      campaign.status !== CampaignStatus.READY &&
      campaign.status !== CampaignStatus.ACTIVE &&
      campaign.status !== CampaignStatus.TESTING
    ) {
      throw new BadRequestError(`Cannot join campaign in status '${campaign.status}'`);
    }

    const testerUser = await prisma.user.findUnique({
      where: { id: testerId },
    });

    if (!testerUser || testerUser.status !== UserStatus.ACTIVE) {
      throw new BadRequestError("Tester account is not active");
    }

    if (
      userRole !== UserRole.TESTER &&
      userRole !== UserRole.BOTH &&
      userRole !== UserRole.ADMIN
    ) {
      throw new BadRequestError("User does not have TESTER permissions");
    }

    // Uniqueness check
    const existingParticipation = await prisma.campaignTester.findFirst({
      where: {
        campaignId,
        testerId,
        status: {
          in: [TesterStatus.INVITED, TesterStatus.ACTIVE, TesterStatus.LOW_ACTIVITY],
        },
      },
    });

    if (existingParticipation) {
      throw new ConflictError("You are already actively participating in this campaign");
    }

    // Individual participation timeline
    const now = new Date();
    const expectedEndAt = new Date(now.getTime() + campaign.durationDays * 24 * 60 * 60 * 1000);

    const campaignTester = await prisma.$transaction(async (tx) => {
      // Re-verify capacity constraint atomically inside transaction lock
      const activeTestersCount = await tx.campaignTester.count({
        where: {
          campaignId,
          status: TesterStatus.ACTIVE,
        },
      });

      if (activeTestersCount >= campaign.maxTesters) {
        throw new BadRequestError("This campaign has reached its maximum tester capacity (15)");
      }

      const membership = await tx.campaignTester.create({
        data: {
          campaignId,
          testerId,
          assignmentType: TesterAssignmentType.PRIMARY,
          status: TesterStatus.ACTIVE,
          isReplacement: false,
          joinedAt: now,
          expectedEndAt,
        },
      });

      // Initialize InstallationRecord
      await tx.installationRecord.upsert({
        where: {
          campaignId_testerId: {
            campaignId,
            testerId,
          },
        },
        create: {
          campaign: { connect: { id: campaignId } },
          app: { connect: { id: campaign.appId } },
          tester: { connect: { id: testerId } },
          status: InstallationStatus.NOT_STARTED,
          verificationMethod: InstallationVerificationMethod.USER_CONFIRMATION,
        },
        update: {},
      });

      return membership;
    });

    await AuditService.log({
      userId: testerId,
      campaignId,
      action: AuditAction.TESTER_ASSIGNED,
      entityName: "CampaignTester",
      entityId: campaignTester.id,
      changes: {
        status: TesterStatus.ACTIVE,
        joinedAt: now,
        expectedEndAt,
      },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    await eventBus.publish({
      id: `evt_tester_joined_${campaignTester.id}_${now.getTime()}`,
      type: "campaign.tester.assigned",
      occurredAt: now,
      payload: {
        campaignId,
        developerId: campaign.app.developerId,
        testerId,
        campaignName: campaign.name,
        appName: campaign.app.name,
      },
    });

    return campaignTester;
  }

  /**
   * Lists campaigns available for discovery and self-enrollment by an authenticated tester.
   */
  public static async listAvailableCampaignsForTester(testerId: string) {
    const campaigns = await prisma.campaign.findMany({
      where: {
        status: {
          in: [CampaignStatus.READY, CampaignStatus.ACTIVE, CampaignStatus.TESTING],
        },
        app: {
          developerId: {
            not: testerId, // Exclude developer's own applications
          },
        },
        campaignTesters: {
          none: {
            testerId,
            status: {
              in: [TesterStatus.INVITED, TesterStatus.ACTIVE, TesterStatus.LOW_ACTIVITY],
            },
          },
        },
      },
      include: {
        app: {
          include: {
            developer: {
              select: {
                displayName: true,
              },
            },
          },
        },
        campaignTesters: {
          where: {
            status: TesterStatus.ACTIVE,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Filter campaigns that have available capacity (< 15)
    return campaigns
      .filter((c) => c.campaignTesters.length < c.maxTesters)
      .map((c) => ({
        id: c.id,
        appId: c.appId,
        name: c.name,
        appName: c.app.name,
        packageName: c.app.packageName,
        appDescription: c.app.description,
        developerName: c.app.developer.displayName,
        status: c.status as unknown as CampaignStatus,
        durationDays: c.durationDays,
        targetTesters: c.targetTesters,
        activeTestersCount: c.campaignTesters.length,
        hasCallTestSdk: c.app.hasCallTestSdk,
        sdkIntegrationStatus: c.app.sdkIntegrationStatus as unknown as SdkIntegrationStatus,
        verificationMethodLabel: c.app.hasCallTestSdk ? "CallTest SDK" : "Evidencias",
        startsAt: c.startsAt ? c.startsAt.toISOString() : null,
        endsAt: c.endsAt ? c.endsAt.toISOString() : null,
      }));
  }

  /**
   * Lists all campaigns in which the authenticated tester participates (Active, Pending, Completed).
   */
  public static async listTesterParticipations(testerId: string) {
    const memberships = await prisma.campaignTester.findMany({
      where: { testerId },
      include: {
        campaign: {
          include: {
            app: {
              include: {
                developer: {
                  select: { displayName: true },
                },
              },
            },
            missions: true,
          },
        },
        missionAttempts: true,
      },
      orderBy: { joinedAt: "desc" },
    });

    const now = new Date();
    const summaries = [];

    for (const m of memberships) {
      const evaluation = await ParticipationVerificationService.evaluateParticipation(
        m.campaignId,
        testerId,
      );

      const elapsedMs = Math.max(0, now.getTime() - m.joinedAt.getTime());
      const dayOfParticipation = Math.min(
        m.campaign.durationDays,
        Math.floor(elapsedMs / (1000 * 60 * 60 * 24)) + 1,
      );

      const completedCount = m.missionAttempts.filter(
        (a) => a.status === AttemptStatus.VALIDATED,
      ).length;
      const pendingCount = Math.max(0, m.campaign.missions.length - completedCount);

      summaries.push({
        participationId: m.id,
        campaignId: m.campaignId,
        appId: m.campaign.appId,
        campaignName: m.campaign.name,
        appName: m.campaign.app.name,
        packageName: m.campaign.app.packageName,
        developerName: m.campaign.app.developer.displayName,
        hasCallTestSdk: m.campaign.app.hasCallTestSdk,
        sdkIntegrationStatus: m.campaign.app.sdkIntegrationStatus as unknown as SdkIntegrationStatus,
        verificationMethodLabel: m.campaign.app.hasCallTestSdk ? "CallTest SDK" : "Evidencias",
        status: m.status as unknown as TesterStatus,
        participationStatus: evaluation.participationStatus,
        activityScore: m.activityScore,
        isReplacement: m.isReplacement,
        joinedAt: m.joinedAt.toISOString(),
        expectedEndAt: m.expectedEndAt ? m.expectedEndAt.toISOString() : null,
        actualEndAt: m.actualEndAt ? m.actualEndAt.toISOString() : null,
        dayOfParticipation,
        totalDurationDays: m.campaign.durationDays,
        installationStatus: evaluation.installationStatus,
        installationVerificationMethod: m.campaign.app.hasCallTestSdk
          ? InstallationVerificationMethod.SDK
          : InstallationVerificationMethod.USER_CONFIRMATION,
        missionsCompleted: completedCount,
        missionsPending: pendingCount,
        totalMissions: m.campaign.missions.length,
      });
    }

    return summaries;
  }

  /**
   * Retrieves single tester participation detail with mission breakdown and activity metrics.
   */
  public static async getTesterParticipationDetail(campaignId: string, testerId: string) {
    const membership = await prisma.campaignTester.findFirst({
      where: { campaignId, testerId },
      include: {
        campaign: {
          include: {
            app: {
              include: {
                developer: {
                  select: { displayName: true },
                },
              },
            },
            missions: true,
          },
        },
        missionAttempts: true,
      },
    });

    if (!membership) {
      throw new NotFoundError("Participation record not found");
    }

    const evaluation = await ParticipationVerificationService.evaluateParticipation(
      campaignId,
      testerId,
    );

    const now = new Date();
    const elapsedMs = Math.max(0, now.getTime() - membership.joinedAt.getTime());
    const dayOfParticipation = Math.min(
      membership.campaign.durationDays,
      Math.floor(elapsedMs / (1000 * 60 * 60 * 24)) + 1,
    );

    const completedAttempts = membership.missionAttempts.filter(
      (a) => a.status === AttemptStatus.VALIDATED,
    );

    const feedbacksCount = await prisma.feedback.count({
      where: { campaignId, testerId },
    });

    const sessionsCount = await prisma.sessionRecord.count({
      where: { testerId },
    });

    const participationSummary = {
      participationId: membership.id,
      campaignId: membership.campaignId,
      appId: membership.campaign.appId,
      campaignName: membership.campaign.name,
      appName: membership.campaign.app.name,
      packageName: membership.campaign.app.packageName,
      developerName: membership.campaign.app.developer.displayName,
      hasCallTestSdk: membership.campaign.app.hasCallTestSdk,
      sdkIntegrationStatus: membership.campaign.app.sdkIntegrationStatus as unknown as SdkIntegrationStatus,
      verificationMethodLabel: membership.campaign.app.hasCallTestSdk ? "CallTest SDK" : "Evidencias",
      status: membership.status as unknown as TesterStatus,
      participationStatus: evaluation.participationStatus,
      activityScore: membership.activityScore,
      isReplacement: membership.isReplacement,
      joinedAt: membership.joinedAt.toISOString(),
      expectedEndAt: membership.expectedEndAt ? membership.expectedEndAt.toISOString() : null,
      actualEndAt: membership.actualEndAt ? membership.actualEndAt.toISOString() : null,
      dayOfParticipation,
      totalDurationDays: membership.campaign.durationDays,
      installationStatus: evaluation.installationStatus,
      installationVerificationMethod: membership.campaign.app.hasCallTestSdk
        ? InstallationVerificationMethod.SDK
        : InstallationVerificationMethod.USER_CONFIRMATION,
      missionsCompleted: completedAttempts.length,
      missionsPending: Math.max(0, membership.campaign.missions.length - completedAttempts.length),
      totalMissions: membership.campaign.missions.length,
    };

    const missionsList = membership.campaign.missions.map((mission) => {
      const attempt = membership.missionAttempts.find((a) => a.missionId === mission.id);
      return {
        id: mission.id,
        title: mission.title,
        objective: mission.objective,
        difficulty: mission.difficulty,
        estimatedMinutes: mission.estimatedMinutes,
        validationMethod: mission.validationMethod,
        requiresEvidence: mission.requiresEvidence,
        evidenceInstructions: mission.evidenceInstructions,
        attemptStatus: attempt ? attempt.status : null,
        attemptId: attempt ? attempt.id : null,
      };
    });

    return {
      participation: participationSummary,
      missions: missionsList,
      activity: {
        activityScore: membership.activityScore,
        activityState: membership.status,
        sessionsCount,
        missionsCompletedCount: completedAttempts.length,
        feedbacksSubmittedCount: feedbacksCount,
      },
    };
  }

  /**
   * Removes or marks a tester membership as terminated.
   */
  public static async removeTesterFromCampaign(
    campaignId: string,
    testerId: string,
    developerId: string,
    userRole: UserRole,
    exitReason?: string,
    context?: { ipAddress?: string; userAgent?: string },
  ) {
    await verifyCampaignOwnership(campaignId, developerId, userRole);

    const membership = await prisma.campaignTester.findFirst({
      where: {
        campaignId,
        testerId,
        status: {
          in: [TesterStatus.INVITED, TesterStatus.ACTIVE, TesterStatus.LOW_ACTIVITY],
        },
      },
    });

    if (!membership) {
      throw new NotFoundError("Active tester membership not found in this campaign");
    }

    const updated = await prisma.campaignTester.update({
      where: { id: membership.id },
      data: {
        status: TesterStatus.REMOVED,
        actualEndAt: new Date(),
        exitReason: exitReason || "Removed by developer",
      },
      include: {
        tester: {
          select: {
            id: true,
            email: true,
            displayName: true,
            trustScore: true,
            rank: true,
          },
        },
      },
    });

    await AuditService.log({
      userId: developerId,
      campaignId,
      action: AuditAction.CAMPAIGN_TESTER_REMOVED,
      entityName: "CampaignTester",
      entityId: membership.id,
      changes: {
        testerId,
        previousStatus: membership.status,
        newStatus: TesterStatus.REMOVED,
        exitReason,
      },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    return updated;
  }

  /**
   * Lists testers assigned to a campaign.
   */
  public static async listCampaignTesters(
    campaignId: string,
    userId: string,
    userRole: UserRole,
  ) {
    await verifyCampaignOwnership(campaignId, userId, userRole);

    return prisma.campaignTester.findMany({
      where: { campaignId },
      include: {
        tester: {
          select: {
            id: true,
            email: true,
            displayName: true,
            trustScore: true,
            rank: true,
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    });
  }

  /**
   * Retrieves single tester participation details in a campaign.
   */
  public static async getCampaignTester(
    campaignId: string,
    testerId: string,
    userId: string,
    userRole: UserRole,
  ) {
    // A developer/admin or the tester themselves can view this record
    if (userRole !== UserRole.ADMIN && userId !== testerId) {
      await verifyCampaignOwnership(campaignId, userId, userRole);
    }

    const membership = await prisma.campaignTester.findFirst({
      where: { campaignId, testerId },
      include: {
        tester: {
          select: {
            id: true,
            email: true,
            displayName: true,
            trustScore: true,
            rank: true,
          },
        },
      },
    });

    if (!membership) {
      throw new NotFoundError("Campaign tester record not found");
    }

    return membership;
  }
}
