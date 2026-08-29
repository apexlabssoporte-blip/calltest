import { describe, it, expect, vi, beforeEach } from "vitest";
import { InstallationService } from "../src/modules/installation/service.js";
import { prisma } from "../src/core/database/prisma.js";
import {
  InstallationStatus,
  InstallationVerificationMethod,
} from "@calltest/shared-types";
import { eventBus } from "../src/core/events/domain-event-bus.js";

describe("Installation Verification Service", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const campaignId = "c0000000-0000-0000-0000-000000000001";
  const appId = "a0000000-0000-0000-0000-000000000001";
  const testerId = "t0000000-0000-0000-0000-000000000001";

  const sampleCampaignTester = {
    id: "ct-1",
    campaignId,
    testerId,
    campaign: {
      id: campaignId,
      appId,
      app: { id: appId, name: "Test App", packageName: "com.test.app" },
    },
  };

  describe("Manual Installation Claim (App Without SDK)", () => {
    it("should set status to INSTALL_CLAIMED and NEVER to INSTALL_VERIFIED", async () => {
      vi.spyOn(prisma.campaignTester, "findFirst").mockResolvedValue(sampleCampaignTester as any);
      vi.spyOn(prisma.installationRecord, "upsert").mockResolvedValue({
        id: "inst-1",
        campaignId,
        appId,
        testerId,
        status: InstallationStatus.INSTALL_CLAIMED,
        verificationMethod: InstallationVerificationMethod.USER_CONFIRMATION,
        claimedAt: new Date(),
        verifiedAt: null,
      } as any);
      vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);
      const publishSpy = vi.spyOn(eventBus, "publish");

      const result = await InstallationService.claimInstallation(campaignId, testerId);

      expect(result.status).toBe(InstallationStatus.INSTALL_CLAIMED);
      expect(result.status).not.toBe(InstallationStatus.ACTIVE);
      expect(result.verificationMethod).toBe(InstallationVerificationMethod.USER_CONFIRMATION);
      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: "installation.claimed" }),
      );
    });

    it("should reject claim if tester is not enrolled in the campaign", async () => {
      vi.spyOn(prisma.campaignTester, "findFirst").mockResolvedValue(null);

      await expect(
        InstallationService.claimInstallation(campaignId, "unassigned-tester"),
      ).rejects.toThrow("Tester assignment not found");
    });
  });

  describe("SDK Technical Verification (App With SDK)", () => {
    it("should process SDK INSTALL_DETECTED event and record SDK verification method", async () => {
      vi.spyOn(prisma.campaignTester, "findFirst").mockResolvedValue(sampleCampaignTester as any);
      vi.spyOn(prisma.app, "findUnique").mockResolvedValue({ id: appId } as any);
      vi.spyOn(prisma.installationRecord, "upsert").mockResolvedValue({
        id: "inst-2",
        campaignId,
        appId,
        testerId,
        installationId: "sdk-device-uuid-123",
        status: InstallationStatus.INSTALL_DETECTED,
        verificationMethod: InstallationVerificationMethod.SDK,
        firstDetectedAt: new Date(),
      } as any);
      vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);
      const publishSpy = vi.spyOn(eventBus, "publish");

      const result = await InstallationService.processSdkEvent(
        campaignId,
        appId,
        testerId,
        "INSTALL_DETECTED",
        "sdk-device-uuid-123",
      );

      expect(result.status).toBe(InstallationStatus.INSTALL_DETECTED);
      expect(result.verificationMethod).toBe(InstallationVerificationMethod.SDK);
      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: "installation.detected" }),
      );
    });

    it("should process SDK FIRST_OPEN event and record timestamp", async () => {
      vi.spyOn(prisma.campaignTester, "findFirst").mockResolvedValue(sampleCampaignTester as any);
      vi.spyOn(prisma.app, "findUnique").mockResolvedValue({ id: appId } as any);
      vi.spyOn(prisma.installationRecord, "upsert").mockResolvedValue({
        id: "inst-3",
        campaignId,
        appId,
        testerId,
        status: InstallationStatus.FIRST_OPEN,
        verificationMethod: InstallationVerificationMethod.SDK,
        firstOpenedAt: new Date(),
      } as any);
      vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

      const result = await InstallationService.processSdkEvent(
        campaignId,
        appId,
        testerId,
        "FIRST_OPEN",
      );

      expect(result.status).toBe(InstallationStatus.FIRST_OPEN);
      expect(result.verificationMethod).toBe(InstallationVerificationMethod.SDK);
    });
  });
});
