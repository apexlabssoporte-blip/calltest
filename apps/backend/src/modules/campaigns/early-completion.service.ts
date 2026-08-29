import { prisma } from "../../core/database/prisma.js";
import { CampaignStatus, TesterStatus, NotificationType, AuditAction } from "@calltest/shared-types";
import { BackupTesterService } from "../campaign-testers/backup-tester.service.js";
import { NotificationService } from "../notifications/service.js";
import { AuditService } from "../../core/services/audit-service.js";
import { MetricsService } from "../../core/metrics/metrics-service.js";

export class CampaignEarlyCompletionService {
  /**
   * Completes a campaign early when the app is verified as publicly available on Google Play.
   * INVARIANT: All enrolled testers receive full valid completion, zero reliability penalty,
   * and their active campaign slot is immediately released.
   */
  public static async endCampaignEarly(
    campaignId: string,
    verifiedByUserId?: string,
    publicUrl?: string
  ) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        app: true,
        campaignTesters: {
          include: {
            tester: true,
          },
        },
      },
    });

    if (!campaign) {
      throw new Error("Campaign not found");
    }

    if (campaign.status !== CampaignStatus.ACTIVE && campaign.status !== CampaignStatus.TESTING) {
      throw new Error(`Cannot end campaign early in status ${campaign.status}`);
    }

    // 1. Update Campaign to ENDED_EARLY
    const updatedCampaign = await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: CampaignStatus.ENDED_EARLY,
        publicVerifiedAt: new Date(),
        endsAt: new Date(),
      },
    });

    // 2. Mark active enrolled testers as COMPLETED (valid participation, no penalty)
    const activeTesters = campaign.campaignTesters.filter(
      (ct) => ct.status === TesterStatus.ACTIVE || ct.status === TesterStatus.INVITED
    );

    for (const ct of activeTesters) {
      await prisma.campaignTester.update({
        where: { id: ct.id },
        data: {
          status: TesterStatus.COMPLETED,
          actualEndAt: new Date(),
        },
      });

      // Update trust/exposure profile completed count
      await prisma.trustProfile.upsert({
        where: { userId: ct.testerId },
        create: {
          userId: ct.testerId,
          completedCampaignsCount: 1,
        },
        update: {
          completedCampaignsCount: { increment: 1 },
        },
      });

      // Notify tester
      await NotificationService.createNotification({
        userId: ct.testerId,
        type: NotificationType.CAMPAIGN_ENDED_EARLY,
        title: "Campaign Successfully Ended Early",
        body: `"${campaign.app.name}" is now publicly available! Your testing has been marked as fully completed.`,
        data: { campaignId, publicUrl },
      });
    }

    // 3. Release unactivated backups
    await BackupTesterService.releaseBackups(campaignId);

    // 4. Record metrics & audit log
    MetricsService.recordCampaignEvent("completed");

    await AuditService.log({
      action: AuditAction.CAMPAIGN_STATUS_CHANGED,
      entityName: "Campaign",
      entityId: campaignId,
      userId: verifiedByUserId,
      changes: {
        previousStatus: campaign.status,
        newStatus: CampaignStatus.ENDED_EARLY,
        reason: "App verified as publicly available on Google Play",
        publicUrl,
      },
    });

    return updatedCampaign;
  }
}
