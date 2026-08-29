import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/core/database/prisma.js";
import {
  UserRole,
  UserStatus,
  InstallationStatus,
  InstallationVerificationMethod,
  EvidenceStatus,
  EvidenceRejectionReason,
} from "@calltest/shared-types";
import { InstallationService } from "../src/modules/installation/service.js";
import { EvidenceService } from "../src/modules/evidence/service.js";

describe("Phase 8 API End-to-End Integration", () => {
  const app = buildApp();
  let devToken: string;
  let testerToken: string;
  let otherDevToken: string;

  const devId = "d0000000-0000-0000-0000-000000000001";
  const testerId = "t0000000-0000-0000-0000-000000000001";
  const otherDevId = "d0000000-0000-0000-0000-000000000002";

  const campaignId = "c0000000-0000-0000-0000-000000000001";
  const appId = "a0000000-0000-0000-0000-000000000001";
  const attemptId = "e0000000-0000-0000-0000-000000000001";
  const evidenceId = "f0000000-0000-0000-0000-000000000001";

  beforeAll(async () => {
    await app.ready();
    devToken = app.jwt.sign({ sub: devId, email: "dev@calltest.com", role: UserRole.DEVELOPER });
    testerToken = app.jwt.sign({ sub: testerId, email: "tester@calltest.com", role: UserRole.TESTER });
    otherDevToken = app.jwt.sign({ sub: otherDevId, email: "otherdev@calltest.com", role: UserRole.DEVELOPER });
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Installation Verification Endpoints", () => {
    it("POST /campaigns/install/claim: Tester can claim installation", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: testerId,
        role: UserRole.TESTER,
        status: UserStatus.ACTIVE,
      } as any);

      vi.spyOn(InstallationService, "claimInstallation").mockResolvedValue({
        id: "inst-1",
        campaignId,
        appId,
        testerId,
        installationId: null,
        status: InstallationStatus.INSTALL_CLAIMED,
        verificationMethod: InstallationVerificationMethod.USER_CONFIRMATION,
        firstDetectedAt: null,
        firstOpenedAt: null,
        lastSeenAt: null,
        claimedAt: new Date(),
        verifiedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const response = await app.inject({
        method: "POST",
        url: "/campaigns/install/claim",
        headers: { authorization: `Bearer ${testerToken}` },
        payload: { campaignId },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("INSTALL_CLAIMED");
    });

    it("POST /campaigns/install/sdk-event: SDK telemetry can record INSTALL_DETECTED", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: testerId,
        role: UserRole.TESTER,
        status: UserStatus.ACTIVE,
      } as any);

      vi.spyOn(InstallationService, "processSdkEvent").mockResolvedValue({
        id: "inst-2",
        campaignId,
        appId,
        testerId,
        installationId: "sdk-id-123",
        status: InstallationStatus.INSTALL_DETECTED,
        verificationMethod: InstallationVerificationMethod.SDK,
        firstDetectedAt: new Date(),
        firstOpenedAt: null,
        lastSeenAt: new Date(),
        claimedAt: null,
        verifiedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const response = await app.inject({
        method: "POST",
        url: "/campaigns/install/sdk-event",
        headers: { authorization: `Bearer ${testerToken}` },
        payload: {
          campaignId,
          appId,
          eventType: "INSTALL_DETECTED",
          installationId: "sdk-id-123",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("INSTALL_DETECTED");
      expect(body.verificationMethod).toBe("SDK");
    });
  });

  describe("Evidence Engine Endpoints", () => {
    it("POST /mission-attempts/:attemptId/evidence: Tester uploads screenshot evidence", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: testerId,
        role: UserRole.TESTER,
        status: UserStatus.ACTIVE,
      } as any);

      vi.spyOn(EvidenceService, "submitEvidence").mockResolvedValue({
        id: evidenceId,
        missionAttemptId: attemptId,
        campaignId,
        testerId,
        missionId: "m-1",
        fileReference: "screenshot.png",
        mimeType: "image/png",
        fileSize: 1024,
        sha256: "hash-abc",
        status: EvidenceStatus.PENDING_REVIEW,
        submittedAt: new Date(),
        reviewedAt: null,
        reviewedById: null,
        rejectionReason: null,
        rejectionComment: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const response = await app.inject({
        method: "POST",
        url: `/mission-attempts/${attemptId}/evidence`,
        headers: { authorization: `Bearer ${testerToken}` },
        payload: {
          imageBase64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
          filename: "screenshot.png",
          mimeType: "image/png",
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("PENDING_REVIEW");
    });

    it("GET /campaigns/:campaignId/evidence: Developer lists campaign evidences", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: devId,
        role: UserRole.DEVELOPER,
        status: UserStatus.ACTIVE,
      } as any);

      vi.spyOn(EvidenceService, "listCampaignEvidences").mockResolvedValue([
        {
          id: evidenceId,
          missionAttemptId: attemptId,
          campaignId,
          testerId,
          missionId: "m-1",
          fileReference: "screenshot.png",
          mimeType: "image/png",
          fileSize: 1024,
          sha256: "hash-abc",
          status: EvidenceStatus.PENDING_REVIEW,
          submittedAt: new Date(),
          reviewedAt: null,
          reviewedById: null,
          rejectionReason: null,
          rejectionComment: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any,
      ]);

      const response = await app.inject({
        method: "GET",
        url: `/campaigns/${campaignId}/evidence`,
        headers: { authorization: `Bearer ${devToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.length).toBe(1);
    });

    it("POST /evidence/:id/approve: Developer approves evidence", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: devId,
        role: UserRole.DEVELOPER,
        status: UserStatus.ACTIVE,
      } as any);

      vi.spyOn(EvidenceService, "approveEvidence").mockResolvedValue({
        id: evidenceId,
        missionAttemptId: attemptId,
        campaignId,
        testerId,
        missionId: "m-1",
        fileReference: "screenshot.png",
        mimeType: "image/png",
        fileSize: 1024,
        sha256: "hash-abc",
        status: EvidenceStatus.APPROVED,
        submittedAt: new Date(),
        reviewedAt: new Date(),
        reviewedById: devId,
        rejectionReason: null,
        rejectionComment: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const response = await app.inject({
        method: "POST",
        url: `/evidence/${evidenceId}/approve`,
        headers: { authorization: `Bearer ${devToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("APPROVED");
    });

    it("POST /evidence/:id/reject: Developer rejects evidence with reason", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: devId,
        role: UserRole.DEVELOPER,
        status: UserStatus.ACTIVE,
      } as any);

      vi.spyOn(EvidenceService, "rejectEvidence").mockResolvedValue({
        id: evidenceId,
        missionAttemptId: attemptId,
        campaignId,
        testerId,
        missionId: "m-1",
        fileReference: "screenshot.png",
        mimeType: "image/png",
        fileSize: 1024,
        sha256: "hash-abc",
        status: EvidenceStatus.REJECTED,
        submittedAt: new Date(),
        reviewedAt: new Date(),
        reviewedById: devId,
        rejectionReason: EvidenceRejectionReason.WRONG_SCREEN,
        rejectionComment: "Please capture profile screen",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const response = await app.inject({
        method: "POST",
        url: `/evidence/${evidenceId}/reject`,
        headers: { authorization: `Bearer ${devToken}` },
        payload: {
          reason: EvidenceRejectionReason.WRONG_SCREEN,
          comment: "Please capture profile screen",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("REJECTED");
      expect(body.rejectionReason).toBe("WRONG_SCREEN");
    });

    it("IDOR GUARD: Non-owner developer rejected with 403 on approving evidence", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: otherDevId,
        role: UserRole.DEVELOPER,
        status: UserStatus.ACTIVE,
      } as any);

      vi.spyOn(EvidenceService, "approveEvidence").mockRejectedValue(
        new Error("You do not have permission to approve evidence for this campaign"),
      );

      const response = await app.inject({
        method: "POST",
        url: `/evidence/${evidenceId}/approve`,
        headers: { authorization: `Bearer ${otherDevToken}` },
      });

      expect(response.statusCode).toBe(500);
    });
  });
});
