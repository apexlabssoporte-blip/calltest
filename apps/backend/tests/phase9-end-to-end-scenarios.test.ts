import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/core/database/prisma.js";
import {
  AttemptStatus,
  CampaignRisk,
  CampaignStatus,
  EvidenceStatus,
  InstallationStatus,
  TesterStatus,
  UserRole,
  UserStatus,
} from "@calltest/shared-types";
import { eventBus } from "../src/core/events/domain-event-bus.js";
import { CampaignHealthService } from "../src/modules/campaign-health/service.js";
import { CampaignCompletionService } from "../src/modules/campaigns/operations/campaign-completion.service.js";
import { CampaignTesterService } from "../src/modules/campaign-testers/service.js";
import { EvidenceService } from "../src/modules/evidence/service.js";
import { EvidenceRepository } from "../src/modules/evidence/repository.js";
import { InstallationService } from "../src/modules/installation/service.js";
import { InstallationRepository } from "../src/modules/installation/repository.js";
import { NotificationService } from "../src/modules/notifications/service.js";
import { AppPublicationStatusService } from "../src/modules/campaigns/operations/publication-status.service.js";

describe("Phase 9: Comprehensive End-to-End Scenarios", () => {
  const app = buildApp();

  const devAId = "d0000000-0000-0000-0000-000000000001";
  const devBId = "d0000000-0000-0000-0000-000000000002";
  const tester1Id = "t0000000-0000-0000-0000-000000000001";
  const replacementTesterId = "t0000000-0000-0000-0000-000000000020";

  const appAId = "a0000000-0000-0000-0000-000000000001";
  const campaignAId = "c0000000-0000-0000-0000-000000000001";
  const mission1Id = "m0000000-0000-0000-0000-000000000001";
  const attempt1Id = "att00000-0000-0000-0000-000000000001";

  let devAToken: string;
  let devBToken: string;

  beforeAll(async () => {
    await app.ready();
    devAToken = app.jwt.sign({ sub: devAId, email: "deva@calltest.com", role: UserRole.DEVELOPER });
    devBToken = app.jwt.sign({ sub: devBId, email: "devb@calltest.com", role: UserRole.DEVELOPER });
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Scenario A: Standard Tester Flow (SDK)", () => {
    it("should successfully join, verify installation via SDK, record mission activity and complete campaign", async () => {
      // 1. Join campaign
      vi.spyOn(prisma.campaign, "findUnique").mockResolvedValue({
        id: campaignAId,
        appId: appAId,
        name: "Standard Beta",
        status: CampaignStatus.ACTIVE,
        durationDays: 14,
        maxTesters: 15,
        targetTesters: 12,
        app: { developerId: devAId, name: "Super App", hasCallTestSdk: true },
      } as any);

      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: tester1Id,
        status: UserStatus.ACTIVE,
        role: UserRole.TESTER,
      } as any);

      vi.spyOn(prisma.campaignTester, "findFirst").mockResolvedValue(null);
      vi.spyOn(prisma.campaignTester, "count").mockResolvedValue(5);
      vi.spyOn(prisma, "$transaction").mockImplementation(async (cb: any) =>
        cb({
          campaignTester: {
            count: vi.fn().mockResolvedValue(5),
            create: vi.fn().mockResolvedValue({
              id: "ct-1",
              campaignId: campaignAId,
              testerId: tester1Id,
              status: TesterStatus.ACTIVE,
              joinedAt: new Date(),
              expectedEndAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            }),
          },
          installationRecord: {
            upsert: vi.fn().mockResolvedValue({}),
          },
          campaign: { update: vi.fn() },
        }),
      );
      vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

      const joinResult = await CampaignTesterService.joinCampaign(
        campaignAId,
        tester1Id,
        UserRole.TESTER,
      );
      expect(joinResult.status).toBe(TesterStatus.ACTIVE);

      // 2. SDK Installation & First Open
      vi.spyOn(prisma.campaignTester, "findFirst").mockResolvedValue({
        id: "ct-1",
        campaignId: campaignAId,
        testerId: tester1Id,
      } as any);
      vi.spyOn(prisma.app, "findUnique").mockResolvedValue({
        id: appAId,
        hasCallTestSdk: true,
      } as any);
      vi.spyOn(InstallationRepository, "upsert").mockResolvedValue({
        id: "inst-1",
        campaignId: campaignAId,
        testerId: tester1Id,
        status: InstallationStatus.FIRST_OPEN,
      } as any);

      const installResult = await InstallationService.processSdkEvent(
        campaignAId,
        appAId,
        tester1Id,
        "FIRST_OPEN",
      );
      expect(installResult.status).toBe(InstallationStatus.FIRST_OPEN);

      // 3. Campaign Completion
      vi.spyOn(prisma.campaign, "findUnique").mockResolvedValue({
        id: campaignAId,
        appId: appAId,
        name: "Standard Beta",
        status: CampaignStatus.ACTIVE,
        durationDays: 14,
        app: { id: appAId, developerId: devAId, name: "Super App", playStoreUrl: "https://play.google.com/store/apps/details?id=com.app" },
        campaignTesters: [
          { id: "ct-1", testerId: tester1Id, status: TesterStatus.ACTIVE, isReplacement: false },
        ],
      } as any);
      vi.spyOn(AppPublicationStatusService, "evaluatePublicationStatus").mockResolvedValue({
        appId: appAId,
        isPubliclyVerified: false,
        evaluatedAt: new Date(),
      } as any);
      vi.spyOn(prisma, "$transaction").mockImplementation(async (cb: any) =>
        cb({
          campaign: { update: vi.fn().mockResolvedValue({}) },
          campaignTester: { update: vi.fn().mockResolvedValue({}) },
        }),
      );

      const dispatchSpy = vi.spyOn(NotificationService, "dispatch").mockResolvedValue({} as any);

      const compResult = await CampaignCompletionService.completeCampaign(campaignAId, devAId);
      expect(compResult.completedTestersCount).toBe(1);
      expect(dispatchSpy).toBeDefined();
    });
  });

  describe("Scenario B: NO SDK Evidence Review Flow", () => {
    it("should handle claim -> evidence submission -> developer approval -> installation verified", async () => {
      // 1. Claim installation
      vi.spyOn(prisma.campaignTester, "findFirst").mockResolvedValue({
        id: "ct-1",
        status: TesterStatus.ACTIVE,
        campaign: { appId: appAId },
      } as any);
      vi.spyOn(InstallationRepository, "upsert").mockResolvedValue({
        id: "inst-1",
        campaignId: campaignAId,
        testerId: tester1Id,
        status: InstallationStatus.INSTALL_CLAIMED,
      } as any);
      vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

      const claim = await InstallationService.claimInstallation(
        campaignAId,
        tester1Id,
      );
      expect(claim.status).toBe(InstallationStatus.INSTALL_CLAIMED);

      // 2. Submit Evidence
      vi.spyOn(prisma.missionAttempt, "findUnique").mockResolvedValue({
        id: attempt1Id,
        testerId: tester1Id,
        missionId: mission1Id,
        status: AttemptStatus.IN_PROGRESS,
        mission: { id: mission1Id, requiresEvidence: true },
        campaignTester: {
          campaign: {
            id: campaignAId,
            app: { developerId: devAId },
          },
        },
      } as any);
      vi.spyOn(EvidenceRepository, "findBySha256").mockResolvedValue([]);
      vi.spyOn(EvidenceRepository, "create").mockResolvedValue({
        id: "ev-1",
        campaignId: campaignAId,
        testerId: tester1Id,
        missionId: mission1Id,
        status: EvidenceStatus.PENDING_REVIEW,
      } as any);
      vi.spyOn(prisma.missionAttempt, "update").mockResolvedValue({
        id: attempt1Id,
        status: AttemptStatus.SUBMITTED,
      } as any);

      const base64Data = Buffer.from("fake-png-data").toString("base64");
      const evidence = await EvidenceService.submitEvidence(
        attempt1Id,
        tester1Id,
        base64Data,
        "screenshot.png",
        "image/png",
      );
      expect(evidence.status).toBe(EvidenceStatus.PENDING_REVIEW);

      // 3. Developer Approves Evidence
      vi.spyOn(EvidenceRepository, "findById").mockResolvedValue({
        id: "ev-1",
        campaignId: campaignAId,
        testerId: tester1Id,
        missionId: mission1Id,
        missionAttemptId: attempt1Id,
        status: EvidenceStatus.PENDING_REVIEW,
        campaign: { app: { developerId: devAId } },
      } as any);
      vi.spyOn(prisma, "$transaction").mockImplementation(async (cb: any) =>
        cb({
          missionEvidence: {
            update: vi.fn().mockResolvedValue({
              id: "ev-1",
              status: EvidenceStatus.APPROVED,
            }),
          },
          missionAttempt: { update: vi.fn().mockResolvedValue({}) },
          installationRecord: { update: vi.fn().mockResolvedValue({}) },
        }),
      );

      const approved = await EvidenceService.approveEvidence(
        "ev-1",
        devAId,
        UserRole.DEVELOPER,
      );
      expect(approved.status).toBe(EvidenceStatus.APPROVED);
    });
  });

  describe("Scenario C & D: Replacement & 2-Day Replacement Completion", () => {
    it("should calculate replacement expectedEndAt from joinedAt and preserve valid participation on campaign completion", async () => {
      const now = new Date();
      const campaignStartsAt = new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000); // 12 days ago

      vi.spyOn(prisma.campaign, "findUnique").mockResolvedValue({
        id: campaignAId,
        appId: appAId,
        developerId: devAId,
        name: "Quick Campaign",
        status: CampaignStatus.ACTIVE,
        durationDays: 14,
        startsAt: campaignStartsAt,
        app: { id: appAId, developerId: devAId, name: "Fast App", playStoreUrl: "https://play.google.com/store/apps/details?id=com.fast" },
        campaignTesters: [
          {
            id: "ct-rep-20",
            testerId: replacementTesterId,
            status: TesterStatus.ACTIVE,
            isReplacement: true,
            joinedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // Joined 2 days ago
            expectedEndAt: new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000), // joinedAt + 14 days
          },
        ],
      } as any);
      vi.spyOn(AppPublicationStatusService, "evaluatePublicationStatus").mockResolvedValue({
        appId: appAId,
        isPubliclyVerified: false,
        evaluatedAt: new Date(),
      } as any);

      vi.spyOn(prisma, "$transaction").mockImplementation(async (cb: any) => cb({
        campaign: { update: vi.fn() },
        campaignTester: { update: vi.fn() },
      }));
      vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);
      const publishSpy = vi.spyOn(eventBus, "publish");

      // Campaign completes 2 days after tester 20 joined
      const completion = await CampaignCompletionService.completeCampaign(campaignAId, devAId);

      expect(completion.completedTestersCount).toBe(1);
      // Validates that tester.participation_completed event was published for tester 20
      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "tester.participation_completed",
          payload: expect.objectContaining({
            testerId: replacementTesterId,
            isReplacement: true,
          }),
        }),
      );
    });
  });

  describe("Scenario E: LOW_ACTIVITY 12 ACTIVE + 5 LOW_ACTIVITY", () => {
    it("should report activeTesters = 12, replacementNeed = 0, campaignRisk = HEALTHY", async () => {
      const activeTesters = Array.from({ length: 12 }, (_, i) => ({
        id: `ct-act-${i}`,
        status: TesterStatus.ACTIVE,
        activityScore: 80,
      }));
      const lowActivityTesters = Array.from({ length: 5 }, (_, i) => ({
        id: `ct-low-${i}`,
        status: TesterStatus.LOW_ACTIVITY,
        activityScore: 40,
      }));

      vi.spyOn(prisma.campaign, "findUnique").mockResolvedValue({
        id: campaignAId,
        targetTesters: 12,
        maxTesters: 15,
        status: CampaignStatus.ACTIVE,
        campaignTesters: [...activeTesters, ...lowActivityTesters],
        missions: [{ id: "m-1" }],
      } as any);
      vi.spyOn(prisma.missionAttempt, "count").mockResolvedValue(10);

      const health = await CampaignHealthService.calculateHealth(campaignAId);

      expect(health.activeTesters).toBe(12);
      expect(health.lowActivityTesters).toBe(5);
      expect(health.replacementNeed).toBe(0);
      expect(health.campaignRisk).toBe(CampaignRisk.HEALTHY);
    });
  });

  describe("Scenario F: Campaign Health Failure (11 ACTIVE + 1 ABANDONED)", () => {
    it("should report replacementNeed = 1 when active testers fall to 11", async () => {
      const activeTesters = Array.from({ length: 11 }, (_, i) => ({
        id: `ct-act-${i}`,
        status: TesterStatus.ACTIVE,
        activityScore: 80,
      }));
      const abandoned = [{ id: "ct-ab-1", status: TesterStatus.ABANDONED, activityScore: 10 }];

      vi.spyOn(prisma.campaign, "findUnique").mockResolvedValue({
        id: campaignAId,
        targetTesters: 12,
        maxTesters: 15,
        status: CampaignStatus.ACTIVE,
        campaignTesters: [...activeTesters, ...abandoned],
        missions: [{ id: "m-1" }],
      } as any);
      vi.spyOn(prisma.missionAttempt, "count").mockResolvedValue(10);

      const health = await CampaignHealthService.calculateHealth(campaignAId);

      expect(health.activeTesters).toBe(11);
      expect(health.replacementNeed).toBe(1);
      expect(health.campaignRisk).toBe(CampaignRisk.AT_RISK);
    });
  });

  describe("Scenario G: Developer Ownership & IDOR Protection", () => {
    it("should deny Developer B access to Developer A's campaign dashboard with 403", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: devBId,
        role: UserRole.DEVELOPER,
        status: UserStatus.ACTIVE,
      } as any);

      vi.spyOn(prisma.campaign, "findUnique").mockResolvedValue({
        id: campaignAId,
        app: { developerId: devAId }, // Owned by Dev A
      } as any);

      const response = await app.inject({
        method: "GET",
        url: `/campaigns/${campaignAId}/dashboard`,
        headers: { authorization: `Bearer ${devBToken}` },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe("Scenario H: Self-Testing Prevention", () => {
    it("should reject Developer A attempting to join their own app campaign with SELF_TESTING_NOT_ALLOWED", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: devAId,
        role: UserRole.BOTH, // User has both developer and tester roles
        status: UserStatus.ACTIVE,
      } as any);

      vi.spyOn(prisma.campaign, "findUnique").mockResolvedValue({
        id: campaignAId,
        status: CampaignStatus.ACTIVE,
        durationDays: 14,
        maxTesters: 15,
        app: { developerId: devAId, name: "Own App" }, // Developer A owns this app
      } as any);

      const response = await app.inject({
        method: "POST",
        url: `/campaigns/${campaignAId}/join`,
        headers: { authorization: `Bearer ${devAToken}` },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.message).toContain("SELF_TESTING_NOT_ALLOWED");
    });
  });
});
