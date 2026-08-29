import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/core/database/prisma.js";
import {
  AttemptStatus,
  CampaignStatus,
  TesterAssignmentType,
  UserRole,
  UserStatus,
} from "@calltest/shared-types";
import { CampaignStateMachine } from "../src/modules/campaigns/state-machine.js";
import { CampaignTesterService } from "../src/modules/campaign-testers/service.js";
import { EvidenceService } from "../src/modules/evidence/service.js";
import { LocalEvidenceStorage } from "../src/core/storage/local-evidence-storage.js";
import { MatchingEngine } from "../src/modules/matching/service.js";
import { CampaignHealthService } from "../src/modules/campaign-health/service.js";

describe("Phase 9.5: Comprehensive Adversarial, Security & Concurrency Audit", () => {
  const app = buildApp();

  const devAId = "d0000000-0000-0000-0000-000000000001";
  const tester1Id = "10000000-0000-0000-0000-000000000001";
  const tester2Id = "20000000-0000-0000-0000-000000000002";

  const appAId = "a0000000-0000-0000-0000-000000000001";
  const campaignAId = "c0000000-0000-0000-0000-000000000001";
  const attempt1Id = "a1111111-0000-0000-0000-000000000001";

  let devAToken: string;

  beforeAll(async () => {
    await app.ready();
    devAToken = app.jwt.sign({ sub: devAId, email: "deva@calltest.com", role: UserRole.DEVELOPER });
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("1. Concurrency & 12/15 Rule Invariant Under Contention", () => {
    it("should atomically block exceeding 15 active testers when capacity is reached", async () => {
      vi.spyOn(prisma.campaign, "findUnique").mockResolvedValue({
        id: campaignAId,
        maxTesters: 15,
        targetTesters: 12,
        status: CampaignStatus.ACTIVE,
        durationDays: 14,
        app: { developerId: devAId },
      } as any);

      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: tester1Id,
        status: UserStatus.ACTIVE,
        role: UserRole.TESTER,
      } as any);

      vi.spyOn(prisma.campaignTester, "findFirst").mockResolvedValue(null);

      // Simulate transaction checking count = 15 inside tx
      vi.spyOn(prisma, "$transaction").mockImplementation(async (cb: any) => {
        return cb({
          campaignTester: {
            count: vi.fn().mockResolvedValue(15), // Already at max 15
            create: vi.fn(),
          },
        });
      });

      await expect(
        CampaignTesterService.joinCampaign(campaignAId, tester1Id, UserRole.TESTER),
      ).rejects.toThrow(/maximum tester capacity/i);
    });

    it("should prevent MatchingEngine from exceeding max allowed testers during concurrent assignments", async () => {
      vi.spyOn(prisma.campaign, "findUnique").mockResolvedValue({
        id: campaignAId,
        maxTesters: 15,
        targetTesters: 12,
        status: CampaignStatus.ACTIVE,
        app: { developerId: devAId },
      } as any);

      vi.spyOn(prisma, "$transaction").mockImplementation(async (cb: any) => {
        return cb({
          campaignTester: {
            count: vi.fn().mockResolvedValue(14), // Capacity remaining is only 1!
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue({
              id: "ct-new",
              testerId: "10000000-0000-0000-0000-000000000001",
              joinedAt: new Date(),
              expectedEndAt: new Date(),
              isReplacement: true,
            }),
          },
          installationRecord: {
            upsert: vi.fn().mockResolvedValue({}),
          },
        });
      });

      vi.spyOn(CampaignHealthService, "calculateHealth").mockResolvedValue({
        campaignId: campaignAId,
        activeTesters: 11,
        lowActivityTesters: 0,
        abandonedTesters: 1,
        targetTesters: 12,
        maxTesters: 15,
        replacementNeed: 1,
        campaignRisk: "AT_RISK" as any,
        activityRate: 80,
        missionCompletionRate: 80,
        evaluatedAt: new Date(),
      });

      vi.spyOn(MatchingEngine as any, "strategy", "get").mockReturnValue({
        rankCandidates: vi.fn().mockResolvedValue([
          { testerId: "10000000-0000-0000-0000-000000000001", score: 90, isReplacement: true },
        ]),
      });

      // Matching engine assigns at most 1 candidate to avoid reaching 16
      const result = await MatchingEngine.evaluateAndAssignReplacements(
        campaignAId,
        devAId,
        UserRole.DEVELOPER,
      );

      expect(result.assignedCount).toBeLessThanOrEqual(1);
    });
  });

  describe("2. Self-Testing Prevention for Both Developer & Administrative Assignments", () => {
    it("should reject Developer A attempting to self-join their own app (POST /join)", async () => {
      vi.spyOn(prisma.campaign, "findUnique").mockResolvedValue({
        id: campaignAId,
        app: { developerId: devAId },
      } as any);

      await expect(
        CampaignTesterService.joinCampaign(campaignAId, devAId, UserRole.BOTH),
      ).rejects.toThrow("SELF_TESTING_NOT_ALLOWED");
    });

    it("should reject Developer A attempting to administratively add themselves as tester to their own app", async () => {
      vi.spyOn(prisma.campaign, "findUnique").mockResolvedValue({
        id: campaignAId,
        appId: appAId,
        app: { developerId: devAId },
      } as any);

      await expect(
        CampaignTesterService.addTesterToCampaign(
          campaignAId,
          devAId,
          UserRole.DEVELOPER,
          { testerId: devAId, assignmentType: TesterAssignmentType.PRIMARY },
        ),
      ).rejects.toThrow("SELF_TESTING_NOT_ALLOWED");
    });
  });

  describe("3. Double Submission & Idempotency", () => {
    it("should reject submitting evidence for an already validated mission attempt", async () => {
      vi.spyOn(prisma.missionAttempt, "findUnique").mockResolvedValue({
        id: attempt1Id,
        testerId: tester1Id,
        status: AttemptStatus.VALIDATED, // Already validated!
      } as any);

      const base64Data = Buffer.from("test").toString("base64");

      await expect(
        EvidenceService.submitEvidence(
          attempt1Id,
          tester1Id,
          base64Data,
          "test.png",
          "image/png",
        ),
      ).rejects.toThrow(/already been validated/i);
    });
  });

  describe("4. State Machine Invariants & Illegal Transitions", () => {
    it("should reject illegal state transitions", () => {
      // PUBLIC -> ACTIVE
      expect(() =>
        CampaignStateMachine.validateTransition(
          CampaignStatus.PUBLIC,
          CampaignStatus.ACTIVE,
          UserRole.DEVELOPER,
        ),
      ).toThrow(/Invalid campaign state transition/);

      // COMPLETED -> TESTING
      expect(() =>
        CampaignStateMachine.validateTransition(
          CampaignStatus.COMPLETED,
          CampaignStatus.TESTING,
          UserRole.DEVELOPER,
        ),
      ).toThrow(/Invalid campaign state transition/);

      // CANCELLED -> ACTIVE
      expect(() =>
        CampaignStateMachine.validateTransition(
          CampaignStatus.CANCELLED,
          CampaignStatus.ACTIVE,
          UserRole.DEVELOPER,
        ),
      ).toThrow(/Invalid campaign state transition/);

      // SUSPENDED -> ACTIVE by non-admin
      expect(() =>
        CampaignStateMachine.validateTransition(
          CampaignStatus.SUSPENDED,
          CampaignStatus.ACTIVE,
          UserRole.DEVELOPER,
        ),
      ).toThrow(/Only an administrator can reactivate/);
    });
  });

  describe("5. Evidence Storage Security & Path Traversal / MIME Protections", () => {
    it("should reject files exceeding 10MB", async () => {
      const storage = new LocalEvidenceStorage();
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB

      await expect(
        storage.save(largeBuffer, "large.png", "image/png"),
      ).rejects.toThrow(/exceeds maximum allowed size/i);
    });

    it("should reject invalid/executable MIME types (e.g. application/pdf, text/html)", async () => {
      const storage = new LocalEvidenceStorage();
      const buffer = Buffer.from("not-an-image");

      await expect(
        storage.save(buffer, "file.pdf", "application/pdf"),
      ).rejects.toThrow(/Unsupported MIME type/i);
    });
  });

  describe("6. Suspended and Banned User Protection", () => {
    it("should reject suspended users attempting to join campaigns", async () => {
      vi.spyOn(prisma.campaign, "findUnique").mockResolvedValue({
        id: campaignAId,
        status: CampaignStatus.ACTIVE,
        app: { developerId: devAId },
      } as any);

      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: tester2Id,
        status: UserStatus.SUSPENDED,
        role: UserRole.TESTER,
      } as any);

      await expect(
        CampaignTesterService.joinCampaign(campaignAId, tester2Id, UserRole.TESTER),
      ).rejects.toThrow(/not active/i);
    });
  });

  describe("7. Privacy Guard: Developer View Sanitization", () => {
    it("should return sanitized trust rank and completed counts without leaking raw internal signals", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: devAId,
        role: UserRole.DEVELOPER,
        status: UserStatus.ACTIVE,
      } as any);

      vi.spyOn(prisma.trustProfile, "findUnique").mockResolvedValue({
        userId: tester1Id,
        trustRank: "TRUSTED",
        reputationStatus: "NORMAL",
        completedCampaignsCount: 5,
        trustScore: 88, // Internal raw score
      } as any);

      const response = await app.inject({
        method: "GET",
        url: `/users/${tester1Id}/trust`,
        headers: { authorization: `Bearer ${devAToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.trustRank).toBe("TRUSTED");
      expect(body.reputationStatus).toBe("NORMAL");
      // Raw score must not be exposed to developer
      expect(body.trustScore).toBeUndefined();
      expect(body.history).toBeUndefined();
    });
  });
});
