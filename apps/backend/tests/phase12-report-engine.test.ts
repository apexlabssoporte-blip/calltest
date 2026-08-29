import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/core/database/prisma.js";
import {
  UserRole,
  UserStatus,
  ReportCategory,
  ReportSeverity,
  ReportStatus,
  DeveloperReportDecision,
} from "@calltest/shared-types";
import { ReportService } from "../src/modules/reports/service.js";

describe("Phase 12: Report Engine & Lifecycle Tests", () => {
  const app = buildApp();

  const campaignId = "c0000000-0000-0000-0000-000000000001";
  const appId = "a0000000-0000-0000-0000-000000000001";
  const testerId = "10000000-0000-0000-0000-000000000001";
  const nonParticipantId = "10000000-0000-0000-0000-000000000002";
  const developerId = "20000000-0000-0000-0000-000000000001";
  const otherDevId = "20000000-0000-0000-0000-000000000002";
  const adminId = "30000000-0000-0000-0000-000000000001";
  const reportId = "90000000-0000-0000-0000-000000000001";

  let testerToken: string;
  let nonParticipantToken: string;
  let devToken: string;
  let otherDevToken: string;
  let adminToken: string;

  beforeAll(async () => {
    await app.ready();
    testerToken = app.jwt.sign({ sub: testerId, email: "tester@calltest.com", role: UserRole.TESTER });
    nonParticipantToken = app.jwt.sign({ sub: nonParticipantId, email: "nonpart@calltest.com", role: UserRole.TESTER });
    devToken = app.jwt.sign({ sub: developerId, email: "dev@calltest.com", role: UserRole.DEVELOPER });
    otherDevToken = app.jwt.sign({ sub: otherDevId, email: "otherdev@calltest.com", role: UserRole.DEVELOPER });
    adminToken = app.jwt.sign({ sub: adminId, email: "admin@calltest.com", role: UserRole.ADMIN });
  });

  beforeEach(() => {
    vi.restoreAllMocks();

    vi.spyOn(prisma.user, "findUnique").mockImplementation(async (args: any) => {
      const id = args.where.id;
      if (id === testerId) return { id: testerId, role: UserRole.TESTER, status: UserStatus.ACTIVE } as any;
      if (id === nonParticipantId) return { id: nonParticipantId, role: UserRole.TESTER, status: UserStatus.ACTIVE } as any;
      if (id === developerId) return { id: developerId, role: UserRole.DEVELOPER, status: UserStatus.ACTIVE } as any;
      if (id === otherDevId) return { id: otherDevId, role: UserRole.DEVELOPER, status: UserStatus.ACTIVE } as any;
      if (id === adminId) return { id: adminId, role: UserRole.ADMIN, status: UserStatus.ACTIVE } as any;
      return null;
    });
  });

  describe("1. Report Submission & Participation Verification", () => {
    it("should allow active enrolled tester to submit a bug report", async () => {
      vi.spyOn(prisma.campaignTester, "findFirst").mockResolvedValue({
        id: "ct-1",
        campaignId,
        testerId,
        status: "ACTIVE",
      } as any);

      vi.spyOn(prisma.campaign, "findUnique").mockResolvedValue({
        id: campaignId,
        appId,
        app: { id: appId, developerId },
      } as any);

      vi.spyOn(prisma.reportCluster, "findUnique").mockResolvedValue(null);
      vi.spyOn(prisma.reportCluster, "create").mockResolvedValue({
        id: "cluster-1",
        campaignId,
        appId,
        fingerprint: "fingerprint-1",
        reportCount: 1,
      } as any);

      vi.spyOn(prisma.testerReport, "create").mockResolvedValue({
        id: reportId,
        campaignId,
        appId,
        testerId,
        missionId: null,
        clusterId: "cluster-1",
        title: "Crash on checkout button",
        description: "Clicking checkout immediately crashes the application with a null pointer exception.",
        category: ReportCategory.CRASH,
        severity: ReportSeverity.HIGH,
        status: ReportStatus.SUBMITTED,
        developerDecision: null,
        developerDecisionReason: null,
        developerId: null,
        evidenceIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        resolvedAt: null,
      } as any);

      vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

      const response = await app.inject({
        method: "POST",
        url: `/campaigns/${campaignId}/reports`,
        headers: { authorization: `Bearer ${testerToken}` },
        payload: {
          title: "Crash on checkout button",
          description: "Clicking checkout immediately crashes the application with a null pointer exception.",
          category: "CRASH",
          severity: "HIGH",
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.id).toBe(reportId);
      expect(body.status).toBe(ReportStatus.SUBMITTED);
    });

    it("should reject report submission from non-participating tester (403 Forbidden)", async () => {
      vi.spyOn(prisma.campaignTester, "findFirst").mockResolvedValue(null);

      const response = await app.inject({
        method: "POST",
        url: `/campaigns/${campaignId}/reports`,
        headers: { authorization: `Bearer ${nonParticipantToken}` },
        payload: {
          title: "Unauthorized report",
          description: "This should be blocked because user is not enrolled in the campaign.",
          category: "UI",
          severity: "LOW",
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe("2. Developer Review Flow", () => {
    it("should allow app developer to review and validate a report", async () => {
      vi.spyOn(prisma.testerReport, "findUnique").mockResolvedValue({
        id: reportId,
        campaignId,
        appId,
        status: ReportStatus.SUBMITTED,
        app: { id: appId, developerId },
      } as any);

      vi.spyOn(prisma.testerReport, "update").mockResolvedValue({
        id: reportId,
        campaignId,
        appId,
        testerId,
        missionId: null,
        clusterId: "cluster-1",
        title: "Crash on checkout button",
        description: "Clicking checkout immediately crashes the application with a null pointer exception.",
        category: ReportCategory.CRASH,
        severity: ReportSeverity.HIGH,
        status: ReportStatus.VALID,
        developerDecision: DeveloperReportDecision.VALID,
        developerDecisionReason: "Confirmed reproduced on Pixel 7",
        developerId,
        evidenceIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        resolvedAt: new Date(),
      } as any);

      vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

      const response = await app.inject({
        method: "POST",
        url: `/reports/${reportId}/developer-review`,
        headers: { authorization: `Bearer ${devToken}` },
        payload: {
          decision: "VALID",
          reason: "Confirmed reproduced on Pixel 7",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe(ReportStatus.VALID);
    });

    it("should reject review from unauthorized developer (403 Forbidden)", async () => {
      vi.spyOn(prisma.testerReport, "findUnique").mockResolvedValue({
        id: reportId,
        campaignId,
        appId,
        status: ReportStatus.SUBMITTED,
        app: { id: appId, developerId }, // Owned by developerId, not otherDevId
      } as any);

      const response = await app.inject({
        method: "POST",
        url: `/reports/${reportId}/developer-review`,
        headers: { authorization: `Bearer ${otherDevToken}` },
        payload: {
          decision: "VALID",
          reason: "Attempt by unauthorized developer",
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe("3. Escalation & Admin Finalization", () => {
    it("should allow developer to escalate a report to human review", async () => {
      vi.spyOn(prisma.testerReport, "findUnique").mockResolvedValue({
        id: reportId,
        campaignId,
        appId,
        status: ReportStatus.SUBMITTED,
        app: { id: appId, developerId },
      } as any);

      vi.spyOn(prisma.testerReport, "update").mockResolvedValue({
        id: reportId,
        campaignId,
        appId,
        testerId,
        missionId: null,
        clusterId: "cluster-1",
        title: "Crash on checkout button",
        description: "Clicking checkout immediately crashes the application with a null pointer exception.",
        category: ReportCategory.CRASH,
        severity: ReportSeverity.HIGH,
        status: ReportStatus.ESCALATED,
        developerDecision: DeveloperReportDecision.ESCALATED,
        developerDecisionReason: "Complex multi-user concurrency issue needs second opinion",
        developerId,
        evidenceIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        resolvedAt: null,
      } as any);

      vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);
      vi.spyOn(ReportService, "executeAiReview").mockResolvedValue({} as any);

      const response = await app.inject({
        method: "POST",
        url: `/reports/${reportId}/escalate`,
        headers: { authorization: `Bearer ${devToken}` },
        payload: {
          reason: "Complex multi-user concurrency issue needs second opinion",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe(ReportStatus.ESCALATED);
    });

    it("should allow admin to finalize human review (CONFIRMED)", async () => {
      vi.spyOn(prisma.testerReport, "findUnique").mockResolvedValue({
        id: reportId,
        campaignId,
        status: ReportStatus.HUMAN_REVIEW,
      } as any);

      vi.spyOn(prisma.testerReport, "update").mockResolvedValue({
        id: reportId,
        campaignId,
        appId,
        testerId,
        missionId: null,
        clusterId: "cluster-1",
        title: "Crash on checkout button",
        description: "Clicking checkout immediately crashes the application with a null pointer exception.",
        category: ReportCategory.CRASH,
        severity: ReportSeverity.HIGH,
        status: ReportStatus.CONFIRMED,
        developerDecision: null,
        developerDecisionReason: null,
        developerId: null,
        evidenceIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        resolvedAt: new Date(),
      } as any);

      vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

      const response = await app.inject({
        method: "POST",
        url: `/admin/reports/${reportId}/finalize`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          decision: "CONFIRMED",
          reason: "Confirmed valid critical bug following second opinion analysis",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe(ReportStatus.CONFIRMED);
    });
  });
});
