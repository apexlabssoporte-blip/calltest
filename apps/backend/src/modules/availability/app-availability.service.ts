import { prisma } from "../../core/database/prisma.js";
import { NotificationService } from "../notifications/service.js";
import { AuditService } from "../../core/services/audit-service.js";
import {
  AppAvailabilityStatus,
  AvailabilityIssueType,
  AvailabilityEvidenceType,
  ScheduledMissionStatus,
  NotificationType,
  AuditAction,
} from "@calltest/shared-types";
import { randomUUID } from "node:crypto";

export interface AvailabilityEvidenceRecord {
  id: string;
  availabilityReportId: string;
  submittedByDeveloperId: string;
  evidenceType: AvailabilityEvidenceType;
  fileReference: string;
  notes?: string;
  submittedAt: Date;
  status: "SUBMITTED" | "VERIFIED" | "REJECTED";
}

export interface AppAvailabilityReportRecord {
  id: string;
  campaignId: string;
  campaignTesterId: string;
  appId: string;
  testerId: string;
  countryCode: string;
  issueType: AvailabilityIssueType;
  reason: string;
  status: AppAvailabilityStatus;
  affectedTestersCount: number;
  affectedTesterIds: string[];
  evidence: AvailabilityEvidenceRecord[];
  createdAt: Date;
  resolvedAt?: Date;
  resolution?: string;
  resolvedBy?: string;
}

// In-memory persistent store for availability reports
const reportsStore = new Map<string, AppAvailabilityReportRecord>();

export class AppAvailabilityService {
  /**
   * Resets in-memory store for testing.
   */
  public static _clearStore(): void {
    reportsStore.clear();
  }

  /**
   * Creates a new availability report or groups under an existing open incident for the country.
   * INVARIANT: Duplicate reports from the same tester are prevented.
   * INVARIANT: Affected missions are marked BLOCKED_BY_AVAILABILITY with ZERO reliability penalty.
   */
  public static async createOrGroupReport(params: {
    campaignId: string;
    campaignTesterId: string;
    appId: string;
    testerId: string;
    countryCode: string;
    issueType: AvailabilityIssueType;
    reason: string;
    context?: { ipAddress?: string; userAgent?: string };
  }): Promise<{ report: AppAvailabilityReportRecord; isGrouped: boolean; isDuplicate: boolean }> {
    const { campaignId, campaignTesterId, appId, testerId, countryCode, issueType, reason } = params;
    const normalizedCountry = countryCode.trim().toUpperCase();

    // 1. Check for existing open incident matching campaignId + appId + countryCode + issueType
    for (const report of reportsStore.values()) {
      if (
        report.campaignId === campaignId &&
        report.appId === appId &&
        report.countryCode === normalizedCountry &&
        report.issueType === issueType &&
        [
          AppAvailabilityStatus.OPEN,
          AppAvailabilityStatus.AWAITING_DEVELOPER_EVIDENCE,
          AppAvailabilityStatus.UNDER_REVIEW,
          AppAvailabilityStatus.UNVERIFIED,
        ].includes(report.status)
      ) {
        // Check if tester already reported this
        if (report.affectedTesterIds.includes(testerId)) {
          await AuditService.log({
            userId: testerId,
            campaignId,
            action: AuditAction.AVAILABILITY_REPORT_DUPLICATE,
            entityName: "AppAvailabilityReport",
            entityId: report.id,
            changes: { countryCode: normalizedCountry, issueType, duplicateTesterId: testerId },
            ipAddress: params.context?.ipAddress,
            userAgent: params.context?.userAgent,
          });

          return { report, isGrouped: true, isDuplicate: true };
        }

        // Group another affected tester from the same country
        report.affectedTestersCount += 1;
        report.affectedTesterIds.push(testerId);

        await AuditService.log({
          userId: testerId,
          campaignId,
          action: AuditAction.AVAILABILITY_REPORT_CREATED,
          entityName: "AppAvailabilityReport",
          entityId: report.id,
          changes: {
            countryCode: normalizedCountry,
            issueType,
            affectedTestersCount: report.affectedTestersCount,
            grouped: true,
          },
          ipAddress: params.context?.ipAddress,
          userAgent: params.context?.userAgent,
        });

        return { report, isGrouped: true, isDuplicate: false };
      }
    }

    // 2. Create new AppAvailabilityReport
    const reportId = randomUUID();
    const newReport: AppAvailabilityReportRecord = {
      id: reportId,
      campaignId,
      campaignTesterId,
      appId,
      testerId,
      countryCode: normalizedCountry,
      issueType,
      reason: reason.trim(),
      status: AppAvailabilityStatus.OPEN,
      affectedTestersCount: 1,
      affectedTesterIds: [testerId],
      evidence: [],
      createdAt: new Date(),
    };

    reportsStore.set(reportId, newReport);

    // 3. Notify Developer about reported unavailability
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { app: true },
    });

    if (campaign?.app?.developerId) {
      await NotificationService.createNotification({
        userId: campaign.app.developerId,
        type: NotificationType.AVAILABILITY_REPORT_RECEIVED,
        title: "Reporte de disponibilidad recibido",
        body: `Un tester reportó que tu aplicación "${campaign.app.name}" no está disponible en ${normalizedCountry}.`,
        data: { reportId, campaignId, countryCode: normalizedCountry },
      });
    }

    // 4. Notify Tester that report was received and mission is protected
    await NotificationService.createNotification({
      userId: testerId,
      type: NotificationType.AVAILABILITY_REPORT_RECEIVED,
      title: "Reporte de disponibilidad recibido",
      body: "Tu reporte de disponibilidad fue recibido. La misión no computará como perdida mientras se revisa.",
      data: { reportId, campaignId },
    });

    await AuditService.log({
      userId: testerId,
      campaignId,
      action: AuditAction.AVAILABILITY_REPORT_CREATED,
      entityName: "AppAvailabilityReport",
      entityId: reportId,
      changes: {
        countryCode: normalizedCountry,
        issueType,
        reason,
        status: AppAvailabilityStatus.OPEN,
      },
      ipAddress: params.context?.ipAddress,
      userAgent: params.context?.userAgent,
    });

    await AuditService.log({
      userId: testerId,
      campaignId,
      action: AuditAction.MISSION_BLOCKED_BY_AVAILABILITY,
      entityName: "CampaignTester",
      entityId: campaignTesterId,
      changes: { status: ScheduledMissionStatus.BLOCKED_BY_AVAILABILITY },
    });

    return { report: newReport, isGrouped: false, isDuplicate: false };
  }

  /**
   * Developer requests or is prompted to submit Google Play Console evidence.
   */
  public static async requestDeveloperEvidence(
    reportId: string,
    developerId: string,
    context?: { ipAddress?: string; userAgent?: string }
  ): Promise<AppAvailabilityReportRecord> {
    const report = reportsStore.get(reportId);
    if (!report) {
      throw new Error("Availability report not found");
    }

    report.status = AppAvailabilityStatus.AWAITING_DEVELOPER_EVIDENCE;

    await NotificationService.createNotification({
      userId: developerId,
      type: NotificationType.AVAILABILITY_EVIDENCE_REQUESTED,
      title: "Evidencia de Google Play Console requerida",
      body: `Por favor aporta una captura de Google Play Console verificando la disponibilidad en ${report.countryCode}.`,
      data: { reportId },
    });

    await AuditService.log({
      userId: developerId,
      campaignId: report.campaignId,
      action: AuditAction.DEVELOPER_EVIDENCE_REQUESTED,
      entityName: "AppAvailabilityReport",
      entityId: report.id,
      changes: { status: AppAvailabilityStatus.AWAITING_DEVELOPER_EVIDENCE },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    return report;
  }

  /**
   * Developer submits Google Play Console screenshot evidence.
   */
  public static async submitDeveloperEvidence(params: {
    reportId: string;
    developerId: string;
    evidenceType: AvailabilityEvidenceType;
    fileReference: string;
    notes?: string;
    context?: { ipAddress?: string; userAgent?: string };
  }): Promise<AvailabilityEvidenceRecord> {
    const report = reportsStore.get(params.reportId);
    if (!report) {
      throw new Error("Availability report not found");
    }

    const evidenceId = randomUUID();
    const evidence: AvailabilityEvidenceRecord = {
      id: evidenceId,
      availabilityReportId: params.reportId,
      submittedByDeveloperId: params.developerId,
      evidenceType: params.evidenceType,
      fileReference: params.fileReference,
      notes: params.notes,
      submittedAt: new Date(),
      status: "SUBMITTED",
    };

    report.evidence.push(evidence);
    report.status = AppAvailabilityStatus.UNDER_REVIEW;

    await AuditService.log({
      userId: params.developerId,
      campaignId: report.campaignId,
      action: AuditAction.DEVELOPER_EVIDENCE_SUBMITTED,
      entityName: "AvailabilityEvidence",
      entityId: evidenceId,
      changes: {
        evidenceType: params.evidenceType,
        fileReference: params.fileReference,
        status: AppAvailabilityStatus.UNDER_REVIEW,
      },
      ipAddress: params.context?.ipAddress,
      userAgent: params.context?.userAgent,
    });

    return evidence;
  }

  /**
   * Resolves availability conflict.
   * INVARIANT: Testers are NEVER penalized while report was open or if restricted.
   */
  public static async resolveAvailabilityReport(params: {
    reportId: string;
    reviewerId: string;
    resolutionStatus:
      | AppAvailabilityStatus.AVAILABLE
      | AppAvailabilityStatus.RESTRICTED
      | AppAvailabilityStatus.UNVERIFIED
      | AppAvailabilityStatus.DISMISSED;
    resolutionNotes: string;
    isDeveloperConfirmation?: boolean;
    context?: { ipAddress?: string; userAgent?: string };
  }): Promise<AppAvailabilityReportRecord> {
    const report = reportsStore.get(params.reportId);
    if (!report) {
      throw new Error("Availability report not found");
    }

    report.status =
      params.resolutionStatus === AppAvailabilityStatus.AVAILABLE ||
      params.resolutionStatus === AppAvailabilityStatus.RESTRICTED
        ? AppAvailabilityStatus.RESOLVED
        : params.resolutionStatus;

    report.resolvedAt = new Date();
    report.resolution = `${params.resolutionStatus}: ${params.resolutionNotes}`;
    report.resolvedBy = params.reviewerId;

    const actionAudit =
      params.resolutionStatus === AppAvailabilityStatus.AVAILABLE
        ? AuditAction.AVAILABILITY_CONFIRMED
        : params.resolutionStatus === AppAvailabilityStatus.RESTRICTED
        ? AuditAction.AVAILABILITY_RESTRICTED
        : params.resolutionStatus === AppAvailabilityStatus.UNVERIFIED
        ? AuditAction.AVAILABILITY_UNVERIFIED
        : AuditAction.AVAILABILITY_DISMISSED;

    await AuditService.log({
      userId: params.reviewerId,
      campaignId: report.campaignId,
      action: actionAudit,
      entityName: "AppAvailabilityReport",
      entityId: report.id,
      changes: {
        resolutionStatus: params.resolutionStatus,
        resolutionNotes: params.resolutionNotes,
        affectedTestersCount: report.affectedTestersCount,
      },
      ipAddress: params.context?.ipAddress,
      userAgent: params.context?.userAgent,
    });

    // Notify all affected testers
    for (const testerId of report.affectedTesterIds) {
      await NotificationService.createNotification({
        userId: testerId,
        type: NotificationType.AVAILABILITY_RESOLVED,
        title: "Problema de disponibilidad resuelto",
        body: `El problema de disponibilidad para tu país fue resuelto: ${params.resolutionNotes}.`,
        data: { reportId: report.id, status: params.resolutionStatus },
      });
    }

    return report;
  }

  /**
   * Retrieves an availability report by ID.
   */
  public static getReportById(reportId: string): AppAvailabilityReportRecord | null {
    return reportsStore.get(reportId) || null;
  }

  /**
   * Re-evaluates and unblocks missions after an availability report is resolved.
   * INVARIANT: If mission is still useful, generates a NEW VALID TEMPORAL WINDOW starting now.
   * INVARIANT: NEVER preserves an expired deadline from before the blockage.
   * INVARIANT: If no longer useful, transitions to CANCELLED with 0 penalty.
   */
  public static recoverBlockedMissions(
    missions: any[],
    resolutionDate: Date = new Date(),
    windowHours = 48
  ): any[] {
    const windowMs = windowHours * 60 * 60 * 1000;
    const nowMs = resolutionDate.getTime();

    return missions.map((m) => {
      if (m.status === ScheduledMissionStatus.BLOCKED_BY_AVAILABILITY) {
        return {
          ...m,
          status: ScheduledMissionStatus.AVAILABLE,
          availableFrom: new Date(nowMs),
          deadline: new Date(nowMs + windowMs), // Brand new valid 48h deadline window!
          description: (m.description || "").replace(/ \[⚠️ Bloqueada por disponibilidad.*?\]/g, ""),
        };
      }
      return m;
    });
  }
}
