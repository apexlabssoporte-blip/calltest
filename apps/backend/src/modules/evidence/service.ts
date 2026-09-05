import { prisma } from "../../core/database/prisma.js";
import { EvidenceRepository } from "./repository.js";
import { evidenceStorage } from "../../core/storage/evidence-storage.js";
import {
  AttemptStatus,
  AuditAction,
  EvidenceRejectionReason,
  EvidenceStatus,
  FraudEventType,
  FraudSeverity,
  UserRole,
} from "@calltest/shared-types";
import { AuditService } from "../../core/services/audit-service.js";
import { BadRequestError, ForbiddenError, NotFoundError } from "../../core/errors/app-error.js";
import { eventBus } from "../../core/events/domain-event-bus.js";
import { FraudService } from "../fraud/service.js";

export class EvidenceService {
  /**
   * Submits screenshot evidence for a mission attempt with hash integrity & duplication checking.
   */
  public static async submitEvidence(
    missionAttemptId: string,
    testerId: string,
    imageBase64: string,
    originalFilename: string,
    mimeType: string,
    metadata?: { ipAddress?: string; userAgent?: string },
  ) {
    const attempt = await prisma.missionAttempt.findUnique({
      where: { id: missionAttemptId },
      include: {
        mission: true,
        campaignTester: {
          include: {
            campaign: {
              include: { app: true },
            },
          },
        },
      },
    });

    if (!attempt) {
      throw new NotFoundError("Mission attempt not found");
    }

    if (attempt.testerId !== testerId) {
      throw new ForbiddenError("You can only submit evidence for your own mission attempts");
    }

    if (attempt.status === AttemptStatus.VALIDATED) {
      throw new BadRequestError("This mission attempt has already been validated");
    }

    // 1. Decode base64 buffer
    let buffer: Buffer;
    try {
      // Strip data:image/...;base64, prefix if present
      const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");
      buffer = Buffer.from(cleanBase64, "base64");
    } catch {
      throw new BadRequestError("Invalid image base64 format");
    }

    // 2. Save via Storage abstraction (Validates MIME, Size, computes SHA-256)
    const stored = await evidenceStorage.save(buffer, originalFilename, mimeType);

    // 3. Duplication check across campaigns / testers
    const existingSameHash = await EvidenceRepository.findBySha256(stored.sha256);
    if (existingSameHash.length > 0) {
      const isDifferentUser = existingSameHash.some((e) => e.testerId !== testerId);
      const isDifferentCampaign = existingSameHash.some(
        (e) => e.campaignId !== attempt.campaignTester.campaignId,
      );

      if (isDifferentUser || isDifferentCampaign) {
        // Report cumulative signal to Fraud Engine without auto-banning
        await FraudService.recordFraudEvent({
          userId: testerId,
          type: FraudEventType.REPEATED_EVIDENCE_HASH,
          severity: FraudSeverity.MEDIUM,
          scoreImpact: 10,
          reason: `Duplicate screenshot evidence hash ${stored.sha256} detected across campaigns or accounts`,
          sourceId: missionAttemptId,
          idempotencyKey: `fraud_dup_evidence_${missionAttemptId}_${stored.sha256}`,
        });
      }
    }

    // 4. Create MissionEvidence record
    const evidence = await EvidenceRepository.create({
      missionAttempt: { connect: { id: missionAttemptId } },
      campaign: { connect: { id: attempt.campaignTester.campaignId } },
      tester: { connect: { id: testerId } },
      mission: { connect: { id: attempt.missionId } },
      fileReference: stored.fileReference,
      mimeType: stored.mimeType,
      fileSize: stored.fileSize,
      sha256: stored.sha256,
      status: EvidenceStatus.PENDING_REVIEW,
    });

    // Update attempt status to SUBMITTED
    await prisma.missionAttempt.update({
      where: { id: missionAttemptId },
      data: { status: AttemptStatus.SUBMITTED },
    });

    // 5. Audit Log & Domain Event
    const now = new Date();
    await AuditService.log({
      userId: testerId,
      campaignId: attempt.campaignTester.campaignId,
      action: AuditAction.EVIDENCE_SUBMITTED,
      entityName: "MissionEvidence",
      entityId: evidence.id,
      changes: {
        missionAttemptId,
        sha256: stored.sha256,
        status: EvidenceStatus.PENDING_REVIEW,
      },
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
    });

    await eventBus.publish({
      id: `evt_evid_sub_${evidence.id}_${now.getTime()}`,
      type: "evidence.submitted",
      occurredAt: now,
      payload: {
        evidenceId: evidence.id,
        campaignId: attempt.campaignTester.campaignId,
        missionId: attempt.missionId,
        testerId,
        developerId: attempt.campaignTester.campaign.app.developerId,
      },
    });

    return evidence;
  }

  /**
   * Approves mission evidence by the campaign developer or admin.
   */
  public static async approveEvidence(
    evidenceId: string,
    actorId: string,
    actorRole: UserRole,
    metadata?: { ipAddress?: string; userAgent?: string },
  ) {
    const evidence = await EvidenceRepository.findById(evidenceId);
    if (!evidence) {
      throw new NotFoundError("Evidence not found");
    }

    if (actorRole !== UserRole.ADMIN && evidence.campaign.app.developerId !== actorId) {
      throw new ForbiddenError("You do not have permission to approve evidence for this campaign");
    }

    if (evidence.status === EvidenceStatus.APPROVED) {
      return evidence; // Idempotent
    }

    const now = new Date();

    const updated = await prisma.$transaction(async (tx) => {
      const updatedEvidence = await tx.missionEvidence.update({
        where: { id: evidenceId },
        data: {
          status: EvidenceStatus.APPROVED,
          reviewedAt: now,
          reviewedById: actorId,
          rejectionReason: null,
          rejectionComment: null,
        },
      });

      // Update attempt to VALIDATED
      await tx.missionAttempt.update({
        where: { id: evidence.missionAttemptId },
        data: {
          status: AttemptStatus.VALIDATED,
          validationStatus: "EVIDENCE_APPROVED",
          validatedById: actorId,
          validatedAt: now,
          completedAt: now,
        },
      });

      return updatedEvidence;
    });

    await AuditService.log({
      userId: actorId,
      campaignId: evidence.campaignId,
      action: AuditAction.EVIDENCE_APPROVED,
      entityName: "MissionEvidence",
      entityId: evidence.id,
      changes: {
        previousStatus: evidence.status,
        newStatus: EvidenceStatus.APPROVED,
      },
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
    });

    await eventBus.publish({
      id: `evt_evid_app_${evidence.id}_${now.getTime()}`,
      type: "evidence.approved",
      occurredAt: now,
      payload: {
        evidenceId: evidence.id,
        campaignId: evidence.campaignId,
        missionId: evidence.missionId,
        testerId: evidence.testerId,
        developerId: actorId,
      },
    });

    return updated;
  }

  /**
   * Rejects mission evidence with mandatory rejection reason.
   */
  public static async rejectEvidence(
    evidenceId: string,
    actorId: string,
    actorRole: UserRole,
    reason: EvidenceRejectionReason,
    comment?: string,
    metadata?: { ipAddress?: string; userAgent?: string },
  ) {
    if (!reason || !Object.values(EvidenceRejectionReason).includes(reason)) {
      throw new BadRequestError("A valid rejection reason is mandatory when rejecting evidence");
    }

    const evidence = await EvidenceRepository.findById(evidenceId);
    if (!evidence) {
      throw new NotFoundError("Evidence not found");
    }

    if (actorRole !== UserRole.ADMIN && evidence.campaign.app.developerId !== actorId) {
      throw new ForbiddenError("You do not have permission to reject evidence for this campaign");
    }

    const now = new Date();

    const updated = await prisma.$transaction(async (tx) => {
      const updatedEvidence = await tx.missionEvidence.update({
        where: { id: evidenceId },
        data: {
          status: EvidenceStatus.REJECTED,
          reviewedAt: now,
          reviewedById: actorId,
          rejectionReason: reason,
          rejectionComment: comment || null,
        },
      });

      await tx.missionAttempt.update({
        where: { id: evidence.missionAttemptId },
        data: {
          status: AttemptStatus.REJECTED,
          validationStatus: "EVIDENCE_REJECTED",
          validationReason: reason,
        },
      });

      return updatedEvidence;
    });

    await AuditService.log({
      userId: actorId,
      campaignId: evidence.campaignId,
      action: AuditAction.EVIDENCE_REJECTED,
      entityName: "MissionEvidence",
      entityId: evidence.id,
      changes: {
        previousStatus: evidence.status,
        newStatus: EvidenceStatus.REJECTED,
        reason,
        comment,
      },
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
    });

    await eventBus.publish({
      id: `evt_evid_rej_${evidence.id}_${now.getTime()}`,
      type: "evidence.rejected",
      occurredAt: now,
      payload: {
        evidenceId: evidence.id,
        campaignId: evidence.campaignId,
        missionId: evidence.missionId,
        testerId: evidence.testerId,
        reason,
        comment,
      },
    });

    return updated;
  }

  public static async listCampaignEvidences(
    campaignId: string,
    developerId: string,
    role: UserRole,
    status?: EvidenceStatus,
  ) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { app: true },
    });

    if (!campaign) {
      throw new NotFoundError("Campaign not found");
    }

    if (role !== UserRole.ADMIN && campaign.app.developerId !== developerId) {
      throw new ForbiddenError("Access denied to campaign evidence");
    }

    return EvidenceRepository.listByCampaign(campaignId, status);
  }

  public static async listTesterEvidences(campaignId: string, testerId: string) {
    return EvidenceRepository.listByTester(campaignId, testerId);
  }

  public static async getEvidenceById(evidenceId: string, actorId: string, role: UserRole) {
    const evidence = await EvidenceRepository.findById(evidenceId);
    if (!evidence) {
      throw new NotFoundError("Evidence not found");
    }

    const isOwnerDev = evidence.campaign.app.developerId === actorId;
    const isOwnerTester = evidence.testerId === actorId;
    const isAdmin = role === UserRole.ADMIN;

    if (!isOwnerDev && !isOwnerTester && !isAdmin) {
      throw new ForbiddenError("Access denied to this evidence");
    }

    return evidence;
  }
}
