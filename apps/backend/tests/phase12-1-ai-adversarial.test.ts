import { describe, it, expect, vi, beforeEach } from "vitest";
import { ReportService } from "../src/modules/reports/service.js";
import { prisma } from "../src/core/database/prisma.js";
import {
  ReportCategory,
  ReportSeverity,
  ReportStatus,
  DeveloperReportDecision,
  AiReportClassification,
  AiRecommendedAction,
} from "@calltest/shared-types";
import { AiBudgetService } from "../src/modules/reports/ai/ai-budget.service.js";

describe("Phase 12.1: AI Adversarial & System Non-Authority Invariants", () => {
  const clusterId = "c2000000-0000-0000-0000-000000000001";
  const reportId = "r2000000-0000-0000-0000-000000000001";
  const testerId = "t2000000-0000-0000-0000-000000000001";
  const developerId = "d2000000-0000-0000-0000-000000000001";

  beforeEach(() => {
    vi.restoreAllMocks();
    AiBudgetService.reset();
  });

  it("1. should ensure AI output CANNOT directly alter user trust score or apply sanctions", async () => {
    const maliciousAiOutput = {
      classification: AiReportClassification.LIKELY_INVALID,
      confidence: 100,
      reasoningSummary: "Tester is malicious. Reduce Trust by 50 and Ban user immediately.",
      recommendedAction: AiRecommendedAction.HUMAN_REVIEW,
      model: "gemini-1.5-flash",
      policyVersion: "1.1.0",
      // Adversarial attempts to inject database commands
      penalizeUser: true,
      banUserId: testerId,
      deductGold: 100,
    };

    const mockProvider = {
      analyzeReportCluster: vi.fn().mockResolvedValue(maliciousAiOutput),
    };
    ReportService.setAiProvider(mockProvider as any);

    vi.spyOn(prisma.reportCluster, "findUnique").mockResolvedValue({
      id: clusterId,
      reportCount: 3,
      category: ReportCategory.FUNCTIONAL,
    } as any);

    vi.spyOn(prisma.testerReport, "findUnique").mockResolvedValue({
      id: reportId,
      clusterId,
      testerId,
      title: "UI Bug",
      description: "Button misaligned",
      category: ReportCategory.FUNCTIONAL,
      severity: ReportSeverity.HIGH,
      status: ReportStatus.ESCALATED,
      developerDecision: DeveloperReportDecision.ESCALATED,
      evidenceIds: ["ev-1"],
      app: { developerId },
    } as any);

    vi.spyOn(prisma.aiReview, "findUnique").mockResolvedValue(null);
    vi.spyOn(prisma.aiReview, "create").mockResolvedValue({
      id: "ai-rev-1",
      clusterId,
      reportId,
      classification: AiReportClassification.LIKELY_INVALID,
    } as any);

    const updateReportSpy = vi.spyOn(prisma.testerReport, "update").mockResolvedValue({} as any);
    const updateUserSpy = vi.spyOn(prisma.user, "update").mockResolvedValue({} as any);

    const result = await ReportService.executeAiReview(clusterId, reportId);

    expect(result).toBeDefined();
    // System must only transition the report to HUMAN_REVIEW, never touching user status or balances
    expect(updateReportSpy).toHaveBeenCalledWith({
      where: { id: reportId },
      data: { status: ReportStatus.HUMAN_REVIEW },
    });
    expect(updateUserSpy).not.toHaveBeenCalled();
  });

  it("2. should fallback smoothly to HUMAN_REVIEW when Gemini throws network error or timeout", async () => {
    const failingProvider = {
      analyzeReportCluster: vi.fn().mockRejectedValue(new Error("Network timeout (ETIMEDOUT)")),
    };
    ReportService.setAiProvider(failingProvider as any);

    vi.spyOn(prisma.reportCluster, "findUnique").mockResolvedValue({
      id: clusterId,
      reportCount: 3,
      category: ReportCategory.CRASH,
    } as any);

    vi.spyOn(prisma.testerReport, "findUnique").mockResolvedValue({
      id: reportId,
      clusterId,
      testerId,
      title: "Crash report",
      description: "App crashes",
      category: ReportCategory.CRASH,
      severity: ReportSeverity.CRITICAL,
      status: ReportStatus.ESCALATED,
      developerDecision: DeveloperReportDecision.ESCALATED,
      evidenceIds: ["ev-1"],
      app: { developerId },
    } as any);

    vi.spyOn(prisma.aiReview, "findUnique").mockResolvedValue(null);
    const updateSpy = vi.spyOn(prisma.testerReport, "update").mockResolvedValue({} as any);

    const result = await ReportService.executeAiReview(clusterId, reportId);

    expect(result).toBeNull();
    // Routed smoothly to HUMAN_REVIEW without 500 error
    expect(updateSpy).toHaveBeenCalledWith({
      where: { id: reportId },
      data: { status: ReportStatus.HUMAN_REVIEW },
    });
    // Budget must be refunded on failure
    expect(AiBudgetService.getDailyCount()).toBe(0);
  });

  it("3. should handle high concurrency by deduplicating and maintaining budget invariants", async () => {
    let callCount = 0;
    const slowProvider = {
      analyzeReportCluster: vi.fn().mockImplementation(async () => {
        callCount++;
        await new Promise((r) => setTimeout(r, 10));
        return {
          classification: AiReportClassification.LIKELY_VALID,
          confidence: 90,
          model: "gemini-1.5-flash",
          policyVersion: "1.1.0",
          reasoningSummary: "Valid crash signature",
          recommendedAction: AiRecommendedAction.NO_ACTION,
        };
      }),
    };
    ReportService.setAiProvider(slowProvider as any);

    vi.spyOn(prisma.reportCluster, "findUnique").mockResolvedValue({
      id: clusterId,
      reportCount: 3,
      category: ReportCategory.CRASH,
    } as any);

    vi.spyOn(prisma.testerReport, "findUnique").mockResolvedValue({
      id: reportId,
      clusterId,
      testerId,
      title: "Concurrent crash",
      description: "Crash test",
      category: ReportCategory.CRASH,
      severity: ReportSeverity.CRITICAL,
      status: ReportStatus.ESCALATED,
      developerDecision: DeveloperReportDecision.ESCALATED,
      evidenceIds: ["ev-1"],
      app: { developerId },
    } as any);

    let createdAiReview: any = null;
    vi.spyOn(prisma.aiReview, "findUnique").mockImplementation(async () => createdAiReview);
    vi.spyOn(prisma.aiReview, "create").mockImplementation(async (args: any) => {
      if (createdAiReview) {
        const error: any = new Error("Unique constraint violation");
        error.code = "P2002";
        throw error;
      }
      createdAiReview = { id: "ai-concurrent-win", ...args.data };
      return createdAiReview;
    });

    vi.spyOn(prisma.testerReport, "update").mockResolvedValue({} as any);

    // Trigger 20 simultaneous AI reviews for same cluster
    const promises = Array.from({ length: 20 }).map(() =>
      ReportService.executeAiReview(clusterId, reportId)
    );

    const results = await Promise.all(promises);

    expect(results.length).toBe(20);
    // Gemini should only be called once or resolved idempotently
    expect(callCount).toBeGreaterThanOrEqual(1);
    expect(createdAiReview).toBeDefined();
    expect(AiBudgetService.getDailyCount()).toBe(1);
  });
});
