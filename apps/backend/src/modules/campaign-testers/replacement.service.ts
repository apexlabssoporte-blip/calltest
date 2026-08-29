import { prisma } from "../../core/database/prisma.js";
import { TesterStatus, TesterAssignmentType, NotificationType, AuditAction } from "@calltest/shared-types";
import { BackupTesterService } from "./backup-tester.service.js";
import { NotificationService } from "../notifications/service.js";
import { AuditService } from "../../core/services/audit-service.js";
import { MetricsService } from "../../core/metrics/metrics-service.js";

export interface ReplacementResult {
  abandonedTesterId: string;
  replacementTesterId: string | null;
  source: "BACKUP" | "MATCHING_SEARCH" | "PENDING_POOL";
  campaignId: string;
}

export class ReplacementService {
  /**
   * Replaces an inactive/abandoned tester in a campaign.
   * Priority:
   *  1. Activate available reserved Backup
   *  2. If no Backup available: Trigger replacement search via matching pool
   */
  public static async replaceAbandonedTester(
    campaignTesterId: string,
    reason = "Tester marked inactive or abandoned"
  ): Promise<ReplacementResult> {
    const abandonedAssignment = await prisma.campaignTester.findUnique({
      where: { id: campaignTesterId },
      include: {
        campaign: {
          include: {
            app: true,
          },
        },
        tester: true,
      },
    });

    if (!abandonedAssignment) {
      throw new Error("CampaignTester assignment not found");
    }

    const campaignId = abandonedAssignment.campaignId;
    const developerId = abandonedAssignment.campaign.app.developerId;

    // 1. Mark abandoned tester as REMOVED or ABANDONED
    await prisma.campaignTester.update({
      where: { id: campaignTesterId },
      data: {
        status: TesterStatus.ABANDONED,
        actualEndAt: new Date(),
        exitReason: reason,
      },
    });

    MetricsService.recordCampaignEvent("replacement_requested");

    // 2. Check for available Backup in campaign
    const availableBackup = await BackupTesterService.getNextAvailableBackup(campaignId);

    if (availableBackup) {
      await BackupTesterService.activateBackup(availableBackup.id);

      // Notify developer
      await NotificationService.createNotification({
        userId: developerId,
        type: NotificationType.TESTER_REPLACED,
        title: "Tester Replaced",
        body: `An inactive tester in campaign "${abandonedAssignment.campaign.name}" was replaced by backup tester ${availableBackup.tester.displayName}.`,
        data: {
          campaignId,
          abandonedTesterId: abandonedAssignment.testerId,
          replacementTesterId: availableBackup.testerId,
        },
      });

      // Notify incoming replacement tester
      await NotificationService.createNotification({
        userId: availableBackup.testerId,
        type: NotificationType.NEW_TESTER_ASSIGNED,
        title: "Campaign Testing Activated",
        body: `You have been activated from backup to start testing "${abandonedAssignment.campaign.app.name}".`,
        data: { campaignId },
      });

      return {
        abandonedTesterId: abandonedAssignment.testerId,
        replacementTesterId: availableBackup.testerId,
        source: "BACKUP",
        campaignId,
      };
    }

    // 3. No backup available -> Fallback to searching from candidate pool
    const replacementCandidate = await prisma.user.findFirst({
      where: {
        status: "ACTIVE",
        role: { in: ["TESTER", "BOTH"] },
        id: { notIn: [abandonedAssignment.testerId, developerId] },
        testerAssignments: {
          none: {
            campaignId,
            status: { in: [TesterStatus.ACTIVE, TesterStatus.INVITED] },
          },
        },
      },
      include: {
        trustProfile: true,
      },
      orderBy: {
        trustScore: "desc",
      },
    });

    if (replacementCandidate) {
      const newAssignment = await prisma.campaignTester.create({
        data: {
          campaignId,
          testerId: replacementCandidate.id,
          assignmentType: TesterAssignmentType.REPLACEMENT,
          status: TesterStatus.ACTIVE,
          isReplacement: true,
          joinedAt: new Date(),
        },
      });

      await AuditService.log({
        action: AuditAction.TESTER_REPLACED,
        entityName: "CampaignTester",
        entityId: newAssignment.id,
        changes: {
          campaignId,
          abandonedTesterId: abandonedAssignment.testerId,
          replacementTesterId: replacementCandidate.id,
          source: "MATCHING_SEARCH",
        },
      });

      // Notify developer
      await NotificationService.createNotification({
        userId: developerId,
        type: NotificationType.TESTER_REPLACED,
        title: "Tester Replaced via Matching",
        body: `An inactive tester in campaign "${abandonedAssignment.campaign.name}" was replaced by ${replacementCandidate.displayName}.`,
        data: {
          campaignId,
          abandonedTesterId: abandonedAssignment.testerId,
          replacementTesterId: replacementCandidate.id,
        },
      });

      return {
        abandonedTesterId: abandonedAssignment.testerId,
        replacementTesterId: replacementCandidate.id,
        source: "MATCHING_SEARCH",
        campaignId,
      };
    }

    return {
      abandonedTesterId: abandonedAssignment.testerId,
      replacementTesterId: null,
      source: "PENDING_POOL",
      campaignId,
    };
  }

  /**
   * Dispatches warning notification when tester enters AT_RISK status.
   * INVARIANT: Does NOT expose internal scoring algorithms or metrics.
   */
  public static async notifyTesterAtRisk(userId: string, campaignId: string, appName: string): Promise<void> {
    await NotificationService.createNotification({
      userId,
      type: NotificationType.MISSION_REMINDER,
      title: "Misiones pendientes que requieren tu atención",
      body: `⚠️ Tienes misiones pendientes para "${appName}" que requieren tu atención. Completar tus misiones a tiempo ayuda a mantener tu participación activa.`,
      data: { campaignId, status: "AT_RISK" },
    });
  }

  /**
   * Dispatches confirmation notification when tester recovers to ACTIVE.
   */
  public static async notifyTesterRecovered(userId: string, campaignId: string, appName: string): Promise<void> {
    await NotificationService.createNotification({
      userId,
      type: NotificationType.MISSION_REMINDER,
      title: "Participación al día",
      body: `✅ Tu participación en "${appName}" está al día. Gracias por continuar con el testing.`,
      data: { campaignId, status: "ACTIVE" },
    });
  }

  /**
   * Dispatches reward/encouragement notification when tester finishes full 14-day campaign.
   */
  public static async notifyCampaignCompletedReward(userId: string, appName: string): Promise<void> {
    await NotificationService.createNotification({
      userId,
      type: NotificationType.MISSION_REMINDER,
      title: "🎉 Campaña completada con éxito",
      body: `🎉 Completaste tu campaña de testing para "${appName}". Seguir participando en nuevas campañas y completar tus misiones de forma consistente puede mejorar tu prioridad para recibir testers de mayor confiabilidad cuando publiques una aplicación.`,
      data: { appName, completed: true },
    });
  }
}
