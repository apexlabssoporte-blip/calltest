import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/core/database/prisma.js";
import {
  UserRole,
  UserStatus,
  TrustRank,
  ReputationStatus,
  FraudEventType,
  FraudSeverity,
  TrustEventType,
} from "@calltest/shared-types";
import { TrustProfileService } from "../src/modules/trust/trust-profile-service.js";
import { ReputationService } from "../src/modules/trust/reputation-service.js";
import { FraudScoreService } from "../src/modules/fraud/fraud-score-service.js";

describe("Phase 5 API End-to-End Integration", () => {
  const app = buildApp();
  let devToken: string;
  let testerToken: string;
  let adminToken: string;

  const devUserId = "a0000000-0000-0000-0000-000000000001";
  const testerUserId = "a0000000-0000-0000-0000-000000000002";
  const adminUserId = "a0000000-0000-0000-0000-000000000003";

  beforeAll(async () => {
    await app.ready();
    devToken = app.jwt.sign({ sub: devUserId, email: "dev@calltest.com", role: UserRole.DEVELOPER });
    testerToken = app.jwt.sign({ sub: testerUserId, email: "tester@calltest.com", role: UserRole.TESTER });
    adminToken = app.jwt.sign({ sub: adminUserId, email: "admin@calltest.com", role: UserRole.ADMIN });
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Tester Self Endpoints", () => {
    it("GET /me/trust should return user trust profile and history", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: testerUserId,
        role: UserRole.TESTER,
        status: UserStatus.ACTIVE,
      } as any);

      vi.spyOn(TrustProfileService, "getOrCreateProfile").mockResolvedValue({
        userId: testerUserId,
        trustScore: 78,
        trustRank: TrustRank.RELIABLE,
        reputationStatus: ReputationStatus.NORMAL,
        completedCampaignsCount: 3,
        abandonedCampaignsCount: 0,
      } as any);

      vi.spyOn(prisma.trustHistory, "findMany").mockResolvedValue([
        {
          id: "hist-1",
          previousScore: 70,
          newScore: 78,
          previousRank: TrustRank.TRUSTED,
          newRank: TrustRank.RELIABLE,
          eventType: TrustEventType.CAMPAIGN_COMPLETED,
          reason: "Successfully completed campaign",
          createdAt: new Date(),
        },
      ] as any);

      const response = await app.inject({
        method: "GET",
        url: "/me/trust",
        headers: { authorization: `Bearer ${testerToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.trustScore).toBe(78);
      expect(body.trustRank).toBe(TrustRank.RELIABLE);
      expect(body.history.length).toBe(1);
    });

    it("GET /me/reputation should return reputation status and active restrictions", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: testerUserId,
        role: UserRole.TESTER,
        status: UserStatus.ACTIVE,
      } as any);

      vi.spyOn(ReputationService, "getReputation").mockResolvedValue({
        userId: testerUserId,
        reputationStatus: ReputationStatus.WATCH,
        trustRank: TrustRank.TRUSTED,
        trustScore: 65,
        activeRestrictions: ["MONITORED_MATCHING"],
      });

      const response = await app.inject({
        method: "GET",
        url: "/me/reputation",
        headers: { authorization: `Bearer ${testerToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.reputationStatus).toBe(ReputationStatus.WATCH);
      expect(body.activeRestrictions).toContain("MONITORED_MATCHING");
    });
  });

  describe("Privacy & Developer View", () => {
    it("GET /users/:userId/trust: Developer should receive sanitized trust metrics without fraud internals", async () => {
      vi.spyOn(prisma.user, "findUnique").mockImplementation(async (args: any) => {
        if (args.where.id === devUserId) {
          return { id: devUserId, role: UserRole.DEVELOPER, status: UserStatus.ACTIVE } as any;
        }
        if (args.where.id === testerUserId) {
          return { id: testerUserId, role: UserRole.TESTER, status: UserStatus.ACTIVE } as any;
        }
        return null;
      });

      vi.spyOn(TrustProfileService, "getOrCreateProfile").mockResolvedValue({
        userId: testerUserId,
        trustScore: 85,
        trustRank: TrustRank.RELIABLE,
        reputationStatus: ReputationStatus.NORMAL,
        completedCampaignsCount: 4,
      } as any);

      const response = await app.inject({
        method: "GET",
        url: `/users/${testerUserId}/trust`,
        headers: { authorization: `Bearer ${devToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.trustRank).toBe(TrustRank.RELIABLE);
      expect(body.completedCampaignsCount).toBe(4);

      // PRIVACY VERIFICATION: Internal fraud details must NOT exist in the developer payload
      expect(body.fraudScore).toBeUndefined();
      expect(body.fraudEvents).toBeUndefined();
      expect(body.ipAddress).toBeUndefined();
      expect(body.deviceFingerprint).toBeUndefined();
    });
  });

  describe("Administrative Fraud Report & RBAC", () => {
    it("GET /users/:userId/fraud: Should reject Developer with 403 Forbidden", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: devUserId,
        role: UserRole.DEVELOPER,
        status: UserStatus.ACTIVE,
      } as any);

      const response = await app.inject({
        method: "GET",
        url: `/users/${testerUserId}/fraud`,
        headers: { authorization: `Bearer ${devToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it("GET /users/:userId/fraud: Should allow Admin and return confidential fraud report", async () => {
      vi.spyOn(prisma.user, "findUnique").mockImplementation(async (args: any) => {
        if (args.where.id === adminUserId) {
          return { id: adminUserId, role: UserRole.ADMIN, status: UserStatus.ACTIVE } as any;
        }
        if (args.where.id === testerUserId) {
          return { id: testerUserId, role: UserRole.TESTER, status: UserStatus.ACTIVE } as any;
        }
        return null;
      });

      vi.spyOn(FraudScoreService, "calculateFraudScore").mockResolvedValue({
        userId: testerUserId,
        fraudScore: 35,
        unresolvedEventsCount: 2,
        criticalEventsCount: 0,
        highestSeverity: FraudSeverity.MEDIUM,
        recommendedStatus: ReputationStatus.WATCH,
      });

      vi.spyOn(prisma.fraudEvent, "findMany").mockResolvedValue([
        {
          id: "fe-1",
          type: FraudEventType.DUPLICATE_EVENT,
          severity: FraudSeverity.LOW,
          scoreImpact: 5,
          reason: "Duplicate event ingestion",
          sourceId: "src-1",
          createdAt: new Date(),
        },
      ] as any);

      const response = await app.inject({
        method: "GET",
        url: `/users/${testerUserId}/fraud`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.fraudScore).toBe(35);
      expect(body.events.length).toBe(1);
      expect(body.events[0].type).toBe(FraudEventType.DUPLICATE_EVENT);
    });
  });
});
