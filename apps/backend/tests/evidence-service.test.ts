import { describe, it, expect, vi, beforeEach } from "vitest";
import { EvidenceService } from "../src/modules/evidence/service.js";
import { EvidenceRepository } from "../src/modules/evidence/repository.js";
import { prisma } from "../src/core/database/prisma.js";
import {
  AttemptStatus,
  EvidenceRejectionReason,
  EvidenceStatus,
  UserRole,
} from "@calltest/shared-types";
import { eventBus } from "../src/core/events/domain-event-bus.js";
import { FraudService } from "../src/modules/fraud/service.js";

describe("Evidence Service & Human Review Workflow", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const attemptId = "att-100";
  const campaignId = "camp-100";
  const testerId = "t-100";
  const devId = "d-100";
  const missionId = "m-100";

  const sampleAttempt = {
    id: attemptId,
    testerId,
    missionId,
    status: AttemptStatus.STARTED,
    campaignTester: {
      campaignId,
      campaign: {
        id: campaignId,
        app: { id: "app-100", developerId: devId, name: "Sample App" },
      },
    },
    mission: { id: missionId, title: "Screenshot Mission" },
  };

  // Valid 1x1 transparent PNG base64
  const sampleBase64Png =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

  describe("Evidence Submission", () => {
    it("should accept valid screenshot evidence and create PENDING_REVIEW record", async () => {
      vi.spyOn(prisma.missionAttempt, "findUnique").mockResolvedValue(sampleAttempt as any);
      vi.spyOn(EvidenceRepository, "findBySha256").mockResolvedValue([]);
      vi.spyOn(EvidenceRepository, "create").mockResolvedValue({
        id: "evid-1",
        missionAttemptId: attemptId,
        campaignId,
        testerId,
        missionId,
        fileReference: "evidence_sample.png",
        mimeType: "image/png",
        fileSize: 68,
        sha256: "fake-sha-256",
        status: EvidenceStatus.PENDING_REVIEW,
        submittedAt: new Date(),
      } as any);
      vi.spyOn(prisma.missionAttempt, "update").mockResolvedValue({} as any);
      vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);
      const publishSpy = vi.spyOn(eventBus, "publish");

      const result = await EvidenceService.submitEvidence(
        attemptId,
        testerId,
        sampleBase64Png,
        "screenshot.png",
        "image/png",
      );

      expect(result.status).toBe(EvidenceStatus.PENDING_REVIEW);
      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: "evidence.submitted" }),
      );
    });

    it("should reject evidence with unsupported MIME types", async () => {
      vi.spyOn(prisma.missionAttempt, "findUnique").mockResolvedValue(sampleAttempt as any);

      await expect(
        EvidenceService.submitEvidence(
          attemptId,
          testerId,
          sampleBase64Png,
          "document.pdf",
          "application/pdf",
        ),
      ).rejects.toThrow("Unsupported MIME type");
    });

    it("IDOR GUARD: should reject submission if attempt belongs to another tester", async () => {
      vi.spyOn(prisma.missionAttempt, "findUnique").mockResolvedValue(sampleAttempt as any);

      await expect(
        EvidenceService.submitEvidence(
          attemptId,
          "attacker-tester-id",
          sampleBase64Png,
          "screenshot.png",
          "image/png",
        ),
      ).rejects.toThrow("You can only submit evidence for your own mission attempts");
    });

    it("should notify Fraud Engine if duplicate screenshot hash is reused across campaigns", async () => {
      vi.spyOn(prisma.missionAttempt, "findUnique").mockResolvedValue(sampleAttempt as any);
      vi.spyOn(EvidenceRepository, "findBySha256").mockResolvedValue([
        { id: "evid-old", campaignId: "diff-camp", testerId: "diff-tester" } as any,
      ]);
      vi.spyOn(EvidenceRepository, "create").mockResolvedValue({
        id: "evid-2",
        status: EvidenceStatus.PENDING_REVIEW,
        submittedAt: new Date(),
      } as any);
      vi.spyOn(prisma.missionAttempt, "update").mockResolvedValue({} as any);
      vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);
      const fraudSpy = vi.spyOn(FraudService, "recordFraudEvent").mockResolvedValue({} as any);

      await EvidenceService.submitEvidence(
        attemptId,
        testerId,
        sampleBase64Png,
        "screenshot.png",
        "image/png",
      );

      expect(fraudSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "REPEATED_EVIDENCE_HASH",
          userId: testerId,
        }),
      );
    });
  });

  describe("Developer Human Review", () => {
    const sampleEvidenceRecord = {
      id: "evid-1",
      missionAttemptId: attemptId,
      campaignId,
      testerId,
      missionId,
      status: EvidenceStatus.PENDING_REVIEW,
      campaign: {
        id: campaignId,
        app: { developerId: devId },
      },
    };

    it("should approve evidence and mark mission attempt as VALIDATED", async () => {
      vi.spyOn(EvidenceRepository, "findById").mockResolvedValue(sampleEvidenceRecord as any);
      vi.spyOn(prisma, "$transaction").mockImplementation(async (cb: any) =>
        cb({
          missionEvidence: { update: vi.fn().mockResolvedValue({ status: EvidenceStatus.APPROVED }) },
          missionAttempt: { update: vi.fn().mockResolvedValue({}) },
        }),
      );
      vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);
      const publishSpy = vi.spyOn(eventBus, "publish");

      const result = await EvidenceService.approveEvidence("evid-1", devId, UserRole.DEVELOPER);

      expect(result.status).toBe(EvidenceStatus.APPROVED);
      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: "evidence.approved" }),
      );
    });

    it("should reject evidence with mandatory reason and update mission attempt to REJECTED", async () => {
      vi.spyOn(EvidenceRepository, "findById").mockResolvedValue(sampleEvidenceRecord as any);
      vi.spyOn(prisma, "$transaction").mockImplementation(async (cb: any) =>
        cb({
          missionEvidence: { update: vi.fn().mockResolvedValue({ status: EvidenceStatus.REJECTED }) },
          missionAttempt: { update: vi.fn().mockResolvedValue({}) },
        }),
      );
      vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);
      const publishSpy = vi.spyOn(eventBus, "publish");

      const result = await EvidenceService.rejectEvidence(
        "evid-1",
        devId,
        UserRole.DEVELOPER,
        EvidenceRejectionReason.WRONG_SCREEN,
        "Please capture the profile screen",
      );

      expect(result.status).toBe(EvidenceStatus.REJECTED);
      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: "evidence.rejected" }),
      );
    });

    it("IDOR GUARD: Non-owner developer cannot approve or reject evidence", async () => {
      vi.spyOn(EvidenceRepository, "findById").mockResolvedValue(sampleEvidenceRecord as any);

      await expect(
        EvidenceService.approveEvidence("evid-1", "unauthorized-dev", UserRole.DEVELOPER),
      ).rejects.toThrow("You do not have permission");
    });
  });
});
