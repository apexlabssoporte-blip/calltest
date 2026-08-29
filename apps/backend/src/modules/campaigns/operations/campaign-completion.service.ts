import { prisma } from "../../../core/database/prisma.js";
import {
  AuditAction,
  CampaignStatus,
  TesterStatus,
} from "@calltest/shared-types";
import { eventBus } from "../../../core/events/domain-event-bus.js";
import { AuditService } from "../../../core/services/audit-service.js";
import { AppPublicationStatusService } from "./publication-status.service.js";
import { BadRequestError, NotFoundError } from "../../../core/errors/app-error.js";

export interface CampaignCompletionResult {
  campaignId: string;
  previousStatus: CampaignStatus;
  newStatus: CampaignStatus;
  completedTestersCount: number;
  isPubliclyVerified: boolean;
  completedAt: Date;
}

export class CampaignCompletionService {
  /**
   * Evaluates campaign duration and tester conditions, gracefully completes testing,
   * archives active missions, updates memberships, and emits domain events.
   */
  public static async completeCampaign(
    campaignId: string,
    actorId?: string,
  ): Promise<CampaignCompletionResult> {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        app: true,
        campaignTesters: true,
      },
    });

    if (!campaign) {
      throw new NotFoundError("Campaign not found");
    }

    if (
      campaign.status === CampaignStatus.COMPLETED ||
      campaign.status === CampaignStatus.PUBLIC ||
      campaign.status === CampaignStatus.CANCELLED
    ) {
      throw new BadRequestError(`Cannot complete campaign in status ${campaign.status}`);
    }

    const previousStatus = campaign.status;
    const now = new Date();

    // 1. Check if public status can be verified independently
    const pubStatus = await AppPublicationStatusService.evaluatePublicationStatus(campaign.appId);
    const targetStatus = pubStatus.isPubliclyVerified ? CampaignStatus.PUBLIC : CampaignStatus.COMPLETED;

    let completedTestersCount = 0;

    await prisma.$transaction(async (tx) => {
      // 2. Update Campaign Record
      await tx.campaign.update({
        where: { id: campaignId },
        data: {
          status: targetStatus,
          endsAt: now,
          publicVerifiedAt: pubStatus.isPubliclyVerified ? now : undefined,
        },
      });

      // 3. Complete Active & Low Activity Testers (Including Replacements)
      const eligibleTesters = campaign.campaignTesters.filter(
        (t) => t.status === TesterStatus.ACTIVE || t.status === TesterStatus.LOW_ACTIVITY,
      );

      for (const tester of eligibleTesters) {
        await tx.campaignTester.update({
          where: { id: tester.id },
          data: {
            status: TesterStatus.COMPLETED,
            actualEndAt: now,
          },
        });
        completedTestersCount++;
      }
    });

    // 4. Record Audit Log
    await AuditService.log({
      userId: actorId || campaign.app.developerId,
      campaignId,
      action: AuditAction.CAMPAIGN_COMPLETED_OPERATIONS,
      entityName: "Campaign",
      entityId: campaignId,
      changes: {
        previousStatus,
        newStatus: targetStatus,
        completedTestersCount,
        isPubliclyVerified: pubStatus.isPubliclyVerified,
      },
    });

    // 5. Emit Domain Events
    await eventBus.publish({
      id: `evt_camp_comp_${campaignId}_${now.getTime()}`,
      type: "campaign.completed",
      occurredAt: now,
      payload: {
        campaignId,
        appId: campaign.appId,
        developerId: campaign.app.developerId,
        appName: campaign.app.name,
        campaignName: campaign.name,
        isPublic: targetStatus === CampaignStatus.PUBLIC,
      },
    });

    for (const tester of campaign.campaignTesters) {
      if (tester.status === TesterStatus.ACTIVE || tester.status === TesterStatus.LOW_ACTIVITY) {
        await eventBus.publish({
          id: `evt_tester_part_comp_${tester.id}_${now.getTime()}`,
          type: "tester.participation_completed",
          occurredAt: now,
          payload: {
            testerId: tester.testerId,
            campaignId,
            appName: campaign.app.name,
            isReplacement: tester.isReplacement,
          },
        });
      }
    }

    return {
      campaignId,
      previousStatus: previousStatus as unknown as CampaignStatus,
      newStatus: targetStatus,
      completedTestersCount,
      isPubliclyVerified: pubStatus.isPubliclyVerified,
      completedAt: now,
    };
  }
}
