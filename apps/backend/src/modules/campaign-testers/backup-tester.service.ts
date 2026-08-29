import { prisma } from "../../core/database/prisma.js";
import { BackupTesterStatus, TesterAssignmentType, TesterStatus } from "@calltest/shared-types";
import { AuditService } from "../../core/services/audit-service.js";
import { AuditAction } from "@calltest/shared-types";

export interface BackupTesterRecord {
  id: string;
  campaignId: string;
  testerId: string;
  status: BackupTesterStatus;
  reservedAt: Date;
  activatedAt?: Date;
}

export class BackupTesterService {
  public static readonly MAX_BACKUPS_PER_CAMPAIGN = 3;

  /**
   * Reserves backup testers for a campaign up to the max of 3.
   * Backups do NOT count as active testers in the campaign.
   */
  public static async reserveBackups(campaignId: string, candidateTesterIds: string[]): Promise<string[]> {
    const existingBackups = await prisma.campaignTester.findMany({
      where: {
        campaignId,
        assignmentType: TesterAssignmentType.BACKUP,
        status: { in: [TesterStatus.INVITED, TesterStatus.ACTIVE] },
      },
    });

    const neededSlots = this.MAX_BACKUPS_PER_CAMPAIGN - existingBackups.length;
    if (neededSlots <= 0) {
      return [];
    }

    const assignedIds: string[] = [];
    const candidatesToAssign = candidateTesterIds.slice(0, neededSlots);

    for (const testerId of candidatesToAssign) {
      const assignment = await prisma.campaignTester.create({
        data: {
          campaignId,
          testerId,
          assignmentType: TesterAssignmentType.BACKUP,
          status: TesterStatus.INVITED,
        },
      });

      assignedIds.push(assignment.id);

      await AuditService.log({
        action: AuditAction.TESTER_ASSIGNED,
        entityName: "CampaignTester",
        entityId: assignment.id,
        changes: {
          campaignId,
          testerId,
          assignmentType: TesterAssignmentType.BACKUP,
          isBackup: true,
        },
      });
    }

    return assignedIds;
  }

  /**
   * Retrieves the next available backup tester for a campaign.
   */
  public static async getNextAvailableBackup(campaignId: string) {
    return prisma.campaignTester.findFirst({
      where: {
        campaignId,
        assignmentType: TesterAssignmentType.BACKUP,
        status: TesterStatus.INVITED,
      },
      include: {
        tester: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });
  }

  /**
   * Activates a backup tester, converting their assignment to REPLACEMENT and status to ACTIVE.
   */
  public static async activateBackup(campaignTesterId: string) {
    const backup = await prisma.campaignTester.findUnique({
      where: { id: campaignTesterId },
    });

    if (!backup || backup.assignmentType !== TesterAssignmentType.BACKUP) {
      throw new Error("Target assignment is not a valid backup tester");
    }

    const updated = await prisma.campaignTester.update({
      where: { id: campaignTesterId },
      data: {
        assignmentType: TesterAssignmentType.REPLACEMENT,
        status: TesterStatus.ACTIVE,
        isReplacement: true,
        joinedAt: new Date(),
      },
    });

    await AuditService.log({
      action: AuditAction.TESTER_REPLACED,
      entityName: "CampaignTester",
      entityId: updated.id,
      changes: {
        campaignId: updated.campaignId,
        testerId: updated.testerId,
        activatedFromBackup: true,
      },
    });

    return updated;
  }

  /**
   * Releases unactivated backups when a campaign completes or ends early.
   */
  public static async releaseBackups(campaignId: string) {
    return prisma.campaignTester.updateMany({
      where: {
        campaignId,
        assignmentType: TesterAssignmentType.BACKUP,
        status: TesterStatus.INVITED,
      },
      data: {
        status: TesterStatus.COMPLETED,
        actualEndAt: new Date(),
      },
    });
  }
}
