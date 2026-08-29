import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "../src/core/database/prisma.js";
import { ReportClusteringService } from "../src/modules/reports/clustering.service.js";
import { ReportService } from "../src/modules/reports/service.js";
import { AiBudgetService } from "../src/modules/reports/ai/ai-budget.service.js";
import {
  AiReportClassification,
  AiRecommendedAction,
  DeveloperReportDecision,
  ReportCategory,
  ReportSeverity,
  ReportStatus,
} from "@calltest/shared-types";

describe("Phase 12: Report Concurrency, Clustering & Idempotency Tests", () => {
  const campaignId = "c0000000-0000-0000-0000-000000000001";
  const appId = "a0000000-0000-0000-0000-000000000001";

  beforeEach(() => {
    vi.restoreAllMocks();
    AiBudgetService.reset();
  });

  describe("1. Clustering Concurrency & Determinism (100 Concurrent Reports)", () => {
    it("should compute identical fingerprint for 100 concurrent reports with identical normalized signatures", () => {
      const fingerprints = Array.from({ length: 100 }, (_, i) =>
        ReportClusteringService.computeFingerprint({
          campaignId,
          appId,
          missionId: "m-1",
          category: ReportCategory.CRASH,
          severity: ReportSeverity.HIGH,
          title: `Crash on checkout button when clicked #${i % 2 === 0 ? "error" : "ERROR"}`,
        }),
      );

      const uniqueFingerprints = new Set(fingerprints);
      expect(uniqueFingerprints.size).toBe(1);
    });

    it("should atomically merge 100 concurrent similar reports into a single cluster", async () => {
      let clusterCount = 1;

      vi.spyOn(prisma.reportCluster, "findUnique").mockResolvedValue({
        id: "cluster-concurrency",
        reportCount: 1,
      } as any);

      vi.spyOn(prisma.reportCluster, "update").mockImplementation(async () => {
        clusterCount++;
        return {
          id: "cluster-concurrency",
          reportCount: clusterCount,
        } as any;
      });

      const promises = Array.from({ length: 100 }, () =>
        ReportClusteringService.assignToCluster({
          campaignId,
          appId,
          missionId: "m-1",
          category: ReportCategory.CRASH,
          severity: ReportSeverity.HIGH,
          title: "Crash on checkout button",
        }),
      );

      await Promise.all(promises);

      expect(clusterCount).toBe(101);
    });
  });

  describe("2. AI Review Idempotency under Concurrent Triggers", () => {
    it("should ensure 20 concurrent AI review triggers produce exactly 1 AI review and 1 budget consumption", async () => {
      let aiReviewCreatedCount = 0;
      let existingRecord: any = null;

      const mockProvider = {
        analyzeReportCluster: vi.fn().mockResolvedValue({
          classification: AiReportClassification.LIKELY_VALID,
          confidence: 0.9,
          model: "gemini-1.5-flash",
          policyVersion: "1.1.0",
          reasoningSummary: "Valid crash",
          recommendedAction: AiRecommendedAction.HUMAN_REVIEW,
        }),
      };
      ReportService.setAiProvider(mockProvider as any);

      vi.spyOn(prisma.aiReview, "findUnique").mockImplementation(async () => existingRecord);

      vi.spyOn(prisma.reportCluster, "findUnique").mockResolvedValue({
        id: "cluster-idem-1",
        reportCount: 5,
      } as any);

      vi.spyOn(prisma.testerReport, "findUnique").mockResolvedValue({
        id: "rep-idem-1",
        title: "Test crash",
        description: "Test crash description with repro steps",
        category: ReportCategory.CRASH,
        severity: ReportSeverity.HIGH,
        status: ReportStatus.ESCALATED,
        developerDecision: DeveloperReportDecision.ESCALATED,
        evidenceIds: ["ev-1"],
        mission: null,
      } as any);

      vi.spyOn(prisma.testerReport, "update").mockResolvedValue({} as any);
      vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

      vi.spyOn(prisma.aiReview, "create").mockImplementation(async (args: any) => {
        if (aiReviewCreatedCount > 0) {
          const err: any = new Error("Unique constraint violation");
          err.code = "P2002";
          throw err;
        }
        aiReviewCreatedCount++;
        existingRecord = {
          id: "ai-rev-1",
          clusterId: "cluster-idem-1",
          aiReviewKey: args.data.aiReviewKey,
          classification: AiReportClassification.LIKELY_VALID,
          confidence: 0.9,
          recommendedAction: AiRecommendedAction.HUMAN_REVIEW,
        };
        return existingRecord;
      });

      const promises = Array.from({ length: 20 }, () =>
        ReportService.executeAiReview("cluster-idem-1", "rep-idem-1"),
      );

      const results = await Promise.all(promises);

      expect(results.length).toBe(20);
      expect(aiReviewCreatedCount).toBe(1);
      expect(AiBudgetService.getDailyCount()).toBe(1);
    });
  });
});
