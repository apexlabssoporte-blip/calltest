import { describe, it, expect, vi, beforeEach } from "vitest";
import { ParticipationVerificationService } from "../src/modules/participation/service.js";
import { prisma } from "../src/core/database/prisma.js";
import {
  AttemptStatus,
  InstallationStatus,
  ParticipationStatus,
  TesterStatus,
} from "@calltest/shared-types";

describe("Participation Verification Engine", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const campaignId = "camp-part-1";
  const testerId = "t-part-1";

  describe("Single Tester Evaluation", () => {
    it("CLAIMED != VERIFIED: A tester with only INSTALL_CLAIMED should be PARTIALLY_VERIFIED, never VERIFIED or ACTIVE", async () => {
      vi.spyOn(prisma.campaignTester, "findFirst").mockResolvedValue({
        id: "ct-1",
        campaignId,
        testerId,
        status: TesterStatus.INVITED,
        activityScore: 50,
        missionAttempts: [],
        campaign: { id: campaignId, appId: "app-1", app: { hasCallTestSdk: false } },
      } as any);

      vi.spyOn(prisma.installationRecord, "findUnique").mockResolvedValue({
        id: "inst-1",
        status: InstallationStatus.INSTALL_CLAIMED,
      } as any);

      vi.spyOn(prisma.missionEvidence, "count").mockResolvedValue(0);

      const result = await ParticipationVerificationService.evaluateParticipation(
        campaignId,
        testerId,
      );

      expect(result.isInstallationVerified).toBe(false);
      expect(result.isParticipationVerified).toBe(false);
      expect(result.participationStatus).toBe(ParticipationStatus.PARTIALLY_VERIFIED);
      expect(result.participationStatus).not.toBe(ParticipationStatus.ACTIVE);
    });

    it("VERIFIED != ACTIVE: A verified tester whose activity score is LOW_ACTIVITY must retain LOW_ACTIVITY status", async () => {
      vi.spyOn(prisma.campaignTester, "findFirst").mockResolvedValue({
        id: "ct-2",
        campaignId,
        testerId,
        status: TesterStatus.LOW_ACTIVITY,
        activityScore: 45,
        missionAttempts: [{ status: AttemptStatus.VALIDATED }],
        campaign: { id: campaignId, appId: "app-1", app: { hasCallTestSdk: true } },
      } as any);

      vi.spyOn(prisma.installationRecord, "findUnique").mockResolvedValue({
        id: "inst-2",
        status: InstallationStatus.FIRST_OPEN,
      } as any);

      vi.spyOn(prisma.missionEvidence, "count").mockResolvedValue(0);

      const result = await ParticipationVerificationService.evaluateParticipation(
        campaignId,
        testerId,
      );

      expect(result.isInstallationVerified).toBe(true);
      expect(result.participationStatus).toBe(ParticipationStatus.LOW_ACTIVITY);
      expect(result.participationStatus).not.toBe(ParticipationStatus.ACTIVE);
    });

    it("Fully verified and active tester: Evaluated as ACTIVE when SDK verified and missions validated", async () => {
      vi.spyOn(prisma.campaignTester, "findFirst").mockResolvedValue({
        id: "ct-3",
        campaignId,
        testerId,
        status: TesterStatus.ACTIVE,
        activityScore: 95,
        missionAttempts: [{ status: AttemptStatus.VALIDATED }],
        campaign: { id: campaignId, appId: "app-1", app: { hasCallTestSdk: true } },
      } as any);

      vi.spyOn(prisma.installationRecord, "findUnique").mockResolvedValue({
        id: "inst-3",
        status: InstallationStatus.FIRST_OPEN,
      } as any);

      vi.spyOn(prisma.missionEvidence, "count").mockResolvedValue(0);

      const result = await ParticipationVerificationService.evaluateParticipation(
        campaignId,
        testerId,
      );

      expect(result.isInstallationVerified).toBe(true);
      expect(result.isParticipationVerified).toBe(true);
      expect(result.participationStatus).toBe(ParticipationStatus.ACTIVE);
    });
  });

  describe("Campaign-wide Participation Summary", () => {
    it("should compute exact breakdowns without mislabeling claimed testers as active", async () => {
      const sampleCampaign = {
        id: campaignId,
        targetTesters: 12,
        missions: [{ id: "m-1" }, { id: "m-2" }],
        campaignTesters: [
          // 2 Active & Verified
          {
            id: "ct-1",
            testerId: "t-1",
            status: TesterStatus.ACTIVE,
            missionAttempts: [{ status: AttemptStatus.VALIDATED }],
          },
          {
            id: "ct-2",
            testerId: "t-2",
            status: TesterStatus.ACTIVE,
            missionAttempts: [{ status: AttemptStatus.VALIDATED }],
          },
          // 1 Low Activity
          {
            id: "ct-3",
            testerId: "t-3",
            status: TesterStatus.LOW_ACTIVITY,
            missionAttempts: [{ status: AttemptStatus.STARTED }],
          },
          // 1 Claimed only
          {
            id: "ct-4",
            testerId: "t-4",
            status: TesterStatus.INVITED,
            missionAttempts: [],
          },
        ],
        installationRecords: [
          { testerId: "t-1", status: InstallationStatus.FIRST_OPEN },
          { testerId: "t-2", status: InstallationStatus.FIRST_OPEN },
          { testerId: "t-3", status: InstallationStatus.INSTALL_CLAIMED },
          { testerId: "t-4", status: InstallationStatus.INSTALL_CLAIMED },
        ],
      };

      vi.spyOn(prisma.campaign, "findUnique").mockResolvedValue(sampleCampaign as any);

      const summary = await ParticipationVerificationService.getCampaignParticipationSummary(
        campaignId,
      );

      expect(summary.assignedTestersCount).toBe(4);
      expect(summary.activeTestersCount).toBe(2);
      expect(summary.lowActivityTestersCount).toBe(1);
      expect(summary.installationClaimedCount).toBe(2);
      expect(summary.installationVerifiedCount).toBe(2);
      expect(summary.participationVerifiedCount).toBe(2);
      expect(summary.pendingVerificationCount).toBe(2);
    });
  });
});
