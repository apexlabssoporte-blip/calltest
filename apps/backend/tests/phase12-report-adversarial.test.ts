import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/core/database/prisma.js";
import { UserRole, UserStatus, ReportStatus } from "@calltest/shared-types";
import { ReportService } from "../src/modules/reports/service.js";
import { ReportStateMachine } from "../src/modules/reports/state-machine.js";

describe("Phase 12: Report Adversarial & IDOR Security Tests", () => {
  const app = buildApp();

  const campaignId = "c0000000-0000-0000-0000-000000000001";
  const appId = "a0000000-0000-0000-0000-000000000001";
  const tester1Id = "10000000-0000-0000-0000-000000000001";
  const tester2Id = "10000000-0000-0000-0000-000000000002";
  const developerId = "20000000-0000-0000-0000-000000000001";
  const unauthorizedDevId = "20000000-0000-0000-0000-000000000002";
  const report1Id = "90000000-0000-0000-0000-000000000001";

  let tester2Token: string;
  let unauthorizedDevToken: string;

  beforeAll(async () => {
    await app.ready();
    tester2Token = app.jwt.sign({ sub: tester2Id, email: "tester2@calltest.com", role: UserRole.TESTER });
    unauthorizedDevToken = app.jwt.sign({ sub: unauthorizedDevId, email: "unauthdev@calltest.com", role: UserRole.DEVELOPER });
  });

  beforeEach(() => {
    vi.restoreAllMocks();

    vi.spyOn(prisma.user, "findUnique").mockImplementation(async (args: any) => {
      const id = args.where.id;
      if (id === tester1Id) return { id: tester1Id, role: UserRole.TESTER, status: UserStatus.ACTIVE } as any;
      if (id === tester2Id) return { id: tester2Id, role: UserRole.TESTER, status: UserStatus.ACTIVE } as any;
      if (id === developerId) return { id: developerId, role: UserRole.DEVELOPER, status: UserStatus.ACTIVE } as any;
      if (id === unauthorizedDevId) return { id: unauthorizedDevId, role: UserRole.DEVELOPER, status: UserStatus.ACTIVE } as any;
      return null;
    });
  });

  describe("1. IDOR Prevention", () => {
    it("should prevent Tester 2 from viewing Tester 1's report (403 Forbidden)", async () => {
      vi.spyOn(prisma.testerReport, "findUnique").mockResolvedValue({
        id: report1Id,
        campaignId,
        appId,
        testerId: tester1Id, // Owned by Tester 1
        app: { id: appId, developerId },
      } as any);

      const response = await app.inject({
        method: "GET",
        url: `/reports/${report1Id}`,
        headers: { authorization: `Bearer ${tester2Token}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it("should prevent unauthorized Developer from listing reports of another developer's campaign", async () => {
      vi.spyOn(prisma.campaign, "findUnique").mockResolvedValue({
        id: campaignId,
        appId,
        app: { id: appId, developerId }, // Owned by developerId, not unauthorizedDevId
      } as any);

      const response = await app.inject({
        method: "GET",
        url: `/campaigns/${campaignId}/reports`,
        headers: { authorization: `Bearer ${unauthorizedDevToken}` },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe("2. State Machine Illegal Transition Prevention", () => {
    it("should reject illegal state jump from SUBMITTED directly to CONFIRMED", () => {
      expect(() => {
        ReportStateMachine.validateTransition(ReportStatus.SUBMITTED, ReportStatus.CONFIRMED);
      }).toThrow(/Invalid report transition/i);
    });

    it("should reject illegal state jump from INVALID to CONFIRMED", () => {
      expect(() => {
        ReportStateMachine.validateTransition(ReportStatus.INVALID, ReportStatus.CONFIRMED);
      }).toThrow(/Invalid report transition/i);
    });
  });

  describe("3. Mission Validation Boundary", () => {
    it("should reject report referencing a mission from a different campaign", async () => {
      vi.spyOn(prisma.campaignTester, "findFirst").mockResolvedValue({
        id: "ct-1",
        campaignId,
        testerId: tester1Id,
        status: "ACTIVE",
      } as any);

      vi.spyOn(prisma.campaign, "findUnique").mockResolvedValue({
        id: campaignId,
        appId,
        app: { id: appId, developerId },
      } as any);

      vi.spyOn(prisma.mission, "findFirst").mockResolvedValue(null); // Mission not found in this campaign

      await expect(
        ReportService.createReport(tester1Id, campaignId, {
          title: "Bug in foreign mission",
          description: "Attempting to attach wrong mission ID",
          category: "FUNCTIONAL" as any,
          severity: "MEDIUM" as any,
          missionId: "00000000-0000-0000-0000-000000000099",
        }),
      ).rejects.toThrow(/does not belong to this campaign/i);
    });
  });
});
