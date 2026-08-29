import { prisma } from "../../core/database/prisma.js";
import { env } from "../../core/config/env.js";
import { CampaignStateMachine } from "./state-machine.js";
import {
  verifyAppOwnership,
  verifyCampaignOwnership,
} from "../../core/middlewares/rbac-guard.js";
import { AuditService } from "../../core/services/audit-service.js";
import { BadRequestError } from "../../core/errors/app-error.js";
import {
  CampaignStatus,
  AuditAction,
  UserRole,
  TesterStatus,
} from "@calltest/shared-types";
import { CreateCampaignRequest, UpdateCampaignRequest } from "./schemas.js";

export class CampaignService {
  /**
   * Creates a new campaign associated with an application.
   */
  public static async createCampaign(
    appId: string,
    userId: string,
    userRole: UserRole,
    data: CreateCampaignRequest,
    context?: { ipAddress?: string; userAgent?: string },
  ) {
    await verifyAppOwnership(appId, userId, userRole);

    const targetTesters = data.targetTesters ?? env.CAMPAIGN_TARGET_TESTERS;
    const maxTesters = data.maxTesters ?? env.CAMPAIGN_MAX_TESTERS;
    const durationDays = data.durationDays ?? env.CAMPAIGN_DURATION_DAYS;

    if (maxTesters < targetTesters) {
      throw new BadRequestError(
        `maxTesters (${maxTesters}) cannot be less than targetTesters (${targetTesters})`,
      );
    }

    const campaign = await prisma.campaign.create({
      data: {
        appId,
        name: data.name.trim(),
        targetTesters,
        maxTesters,
        durationDays,
        status: CampaignStatus.DRAFT,
      },
    });

    await AuditService.log({
      userId,
      campaignId: campaign.id,
      action: AuditAction.CAMPAIGN_CREATED,
      entityName: "Campaign",
      entityId: campaign.id,
      changes: { name: campaign.name, targetTesters, maxTesters, durationDays },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    return campaign;
  }

  /**
   * Lists campaigns for a given application with IDOR protection.
   */
  public static async listAppCampaigns(
    appId: string,
    userId: string,
    userRole: UserRole,
  ) {
    await verifyAppOwnership(appId, userId, userRole);

    const campaigns = await prisma.campaign.findMany({
      where: { appId },
      include: {
        _count: {
          select: {
            campaignTesters: {
              where: { status: TesterStatus.ACTIVE },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return campaigns.map((c) => ({
      ...c,
      activeTestersCount: c._count.campaignTesters,
    }));
  }

  /**
   * Retrieves a campaign by ID with IDOR protection.
   */
  public static async getCampaignById(
    campaignId: string,
    userId: string,
    userRole: UserRole,
  ) {
    const campaign = await verifyCampaignOwnership(campaignId, userId, userRole);

    const activeTestersCount = await prisma.campaignTester.count({
      where: {
        campaignId,
        status: TesterStatus.ACTIVE,
      },
    });

    return {
      ...campaign,
      activeTestersCount,
    };
  }

  /**
   * Updates campaign configuration details (in DRAFT or READY states).
   */
  public static async updateCampaign(
    campaignId: string,
    userId: string,
    userRole: UserRole,
    data: UpdateCampaignRequest,
    context?: { ipAddress?: string; userAgent?: string },
  ) {
    const campaign = await verifyCampaignOwnership(campaignId, userId, userRole);

    if (
      campaign.status === CampaignStatus.COMPLETED ||
      campaign.status === CampaignStatus.CANCELLED ||
      campaign.status === CampaignStatus.PUBLIC
    ) {
      throw new BadRequestError(
        `Cannot modify campaign in status '${campaign.status}'`,
      );
    }

    const targetTesters = data.targetTesters ?? campaign.targetTesters;
    const maxTesters = data.maxTesters ?? campaign.maxTesters;

    if (maxTesters < targetTesters) {
      throw new BadRequestError(
        `maxTesters (${maxTesters}) cannot be less than targetTesters (${targetTesters})`,
      );
    }

    const updated = await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        name: data.name ? data.name.trim() : undefined,
        targetTesters: data.targetTesters !== undefined ? data.targetTesters : undefined,
        maxTesters: data.maxTesters !== undefined ? data.maxTesters : undefined,
        durationDays: data.durationDays !== undefined ? data.durationDays : undefined,
      },
    });

    await AuditService.log({
      userId,
      campaignId,
      action: AuditAction.CAMPAIGN_STATE_CHANGED,
      entityName: "Campaign",
      entityId: campaignId,
      changes: data as Record<string, unknown>,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    return updated;
  }

  /**
   * Transitions a campaign state using strict CampaignStateMachine validation.
   */
  public static async transitionCampaign(
    campaignId: string,
    userId: string,
    userRole: UserRole,
    targetStatus: CampaignStatus,
    context?: { ipAddress?: string; userAgent?: string },
  ) {
    const campaign = await verifyCampaignOwnership(campaignId, userId, userRole);

    CampaignStateMachine.validateTransition(
      campaign.status as unknown as CampaignStatus,
      targetStatus,
      userRole,
    );

    const updateData: {
      status: CampaignStatus;
      startsAt?: Date;
      endsAt?: Date;
    } = {
      status: targetStatus,
    };

    // When transitioning to ACTIVE for the first time, establish timeline
    if (targetStatus === CampaignStatus.ACTIVE && !campaign.startsAt) {
      const now = new Date();
      const endsAt = new Date(now.getTime() + campaign.durationDays * 24 * 60 * 60 * 1000);
      updateData.startsAt = now;
      updateData.endsAt = endsAt;
    } else if (targetStatus === CampaignStatus.COMPLETED && !campaign.endsAt) {
      updateData.endsAt = new Date();
    }

    const updated = await prisma.campaign.update({
      where: { id: campaignId },
      data: updateData,
    });

    await AuditService.log({
      userId,
      campaignId,
      action: AuditAction.CAMPAIGN_STATE_CHANGED,
      entityName: "Campaign",
      entityId: campaignId,
      changes: {
        previousStatus: campaign.status,
        newStatus: targetStatus,
      },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    return updated;
  }
}
