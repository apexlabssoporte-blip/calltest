import { prisma } from "../../core/database/prisma.js";
import { InstallationRepository } from "./repository.js";
import {
  AuditAction,
  InstallationStatus,
  InstallationVerificationMethod,
} from "@calltest/shared-types";
import { AuditService } from "../../core/services/audit-service.js";
import { NotFoundError } from "../../core/errors/app-error.js";
import { eventBus } from "../../core/events/domain-event-bus.js";

export class InstallationService {
  /**
   * Records tester's manual claim that they have installed the application.
   * STRICT PRINCIPLE: Always sets status to INSTALL_CLAIMED, NEVER INSTALL_VERIFIED.
   */
  public static async claimInstallation(
    campaignId: string,
    testerId: string,
    metadata?: { ipAddress?: string; userAgent?: string },
  ) {
    const campaignTester = await prisma.campaignTester.findFirst({
      where: { campaignId, testerId },
      include: { campaign: { include: { app: true } } },
    });

    if (!campaignTester) {
      throw new NotFoundError("Tester assignment not found in this campaign");
    }

    const now = new Date();

    const record = await InstallationRepository.upsert(
      campaignId,
      testerId,
      {
        campaign: { connect: { id: campaignId } },
        app: { connect: { id: campaignTester.campaign.appId } },
        tester: { connect: { id: testerId } },
        status: InstallationStatus.INSTALL_CLAIMED,
        verificationMethod: InstallationVerificationMethod.USER_CONFIRMATION,
        claimedAt: now,
      },
      {
        status: InstallationStatus.INSTALL_CLAIMED,
        verificationMethod: InstallationVerificationMethod.USER_CONFIRMATION,
        claimedAt: now,
      },
    );

    await AuditService.log({
      userId: testerId,
      campaignId,
      action: AuditAction.INSTALLATION_CLAIMED,
      entityName: "InstallationRecord",
      entityId: record.id,
      changes: {
        status: InstallationStatus.INSTALL_CLAIMED,
        verificationMethod: InstallationVerificationMethod.USER_CONFIRMATION,
      },
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
    });

    await eventBus.publish({
      id: `evt_inst_claim_${record.id}_${now.getTime()}`,
      type: "installation.claimed",
      occurredAt: now,
      payload: {
        installationRecordId: record.id,
        campaignId,
        appId: campaignTester.campaign.appId,
        testerId,
      },
    });

    return record;
  }

  /**
   * Processes verified technical signals directly from CallTest SDK.
   */
  public static async processSdkEvent(
    campaignId: string,
    appId: string,
    testerId: string,
    eventType: "INSTALL_DETECTED" | "FIRST_OPEN",
    installationId?: string,
    metadata?: { ipAddress?: string; userAgent?: string },
  ) {
    const campaignTester = await prisma.campaignTester.findFirst({
      where: { campaignId, testerId },
    });

    if (!campaignTester) {
      throw new NotFoundError("Tester assignment not found in this campaign");
    }

    const app = await prisma.app.findUnique({
      where: { id: appId },
    });

    if (!app) {
      throw new NotFoundError("App not found");
    }

    const now = new Date();
    const newStatus =
      eventType === "FIRST_OPEN"
        ? InstallationStatus.FIRST_OPEN
        : InstallationStatus.INSTALL_DETECTED;

    const record = await InstallationRepository.upsert(
      campaignId,
      testerId,
      {
        campaign: { connect: { id: campaignId } },
        app: { connect: { id: appId } },
        tester: { connect: { id: testerId } },
        installationId: installationId || null,
        status: newStatus,
        verificationMethod: InstallationVerificationMethod.SDK,
        firstDetectedAt: now,
        firstOpenedAt: eventType === "FIRST_OPEN" ? now : undefined,
        lastSeenAt: now,
      },
      {
        installationId: installationId || undefined,
        status: newStatus,
        verificationMethod: InstallationVerificationMethod.SDK,
        firstDetectedAt: eventType === "INSTALL_DETECTED" ? now : undefined,
        firstOpenedAt: eventType === "FIRST_OPEN" ? now : undefined,
        lastSeenAt: now,
      },
    );

    await AuditService.log({
      userId: testerId,
      campaignId,
      action: AuditAction.INSTALLATION_DETECTED,
      entityName: "InstallationRecord",
      entityId: record.id,
      changes: {
        eventType,
        status: newStatus,
        verificationMethod: InstallationVerificationMethod.SDK,
      },
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
    });

    await eventBus.publish({
      id: `evt_inst_sdk_${record.id}_${now.getTime()}`,
      type: "installation.detected",
      occurredAt: now,
      payload: {
        installationRecordId: record.id,
        campaignId,
        appId,
        testerId,
        eventType,
      },
    });

    return record;
  }

  public static async getInstallationStatus(campaignId: string, testerId: string) {
    const record = await InstallationRepository.findByCampaignAndTester(campaignId, testerId);
    if (!record) {
      return {
        status: InstallationStatus.NOT_STARTED,
        verificationMethod: InstallationVerificationMethod.USER_CONFIRMATION,
        claimedAt: null,
        verifiedAt: null,
      };
    }
    return record;
  }
}
