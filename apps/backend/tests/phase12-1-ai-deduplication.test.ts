import { describe, it, expect, vi, beforeEach } from "vitest";
import { ReportService } from "../src/modules/reports/service.js";
import { prisma } from "../src/core/database/prisma.js";
import { ReportCategory, ReportSeverity, ReportStatus, DeveloperReportDecision, AiReportClassification, AiRecommendedAction } from "@calltest/shared-types";
import { AiBudgetService } from "../src/modules/reports/ai/ai-budget.service.js";

describe("Phase 12.1: AI Deterministic Deduplication & Cache Hardening", () => {
  const clusterId = "c1000000-0000-0000-0000-000000000001";
  const reportId = "r1000000-0000-0000-0000-000000000001";
  const developerId = "d1000000-0000-0000-0000-000000000001";

  beforeEach(() => {
    vi.restoreAllMocks();
    AiBudgetService.reset();
  });

  it("1. should return existing analysis without calling Gemini provider if identical aiAnalysisKey exists", async () => {
    const mockProvider = {
      analyzeReportCluster: vi.fn(),
    };
    ReportService.setAiProvider(mockProvider as any);

    vi.spyOn(prisma.reportCluster, "findUnique").mockResolvedValue({
      id: clusterId,
      reportCount: 3, // Meets escalation score >= 80
      category: ReportCategory.CRASH,
    } as any);

    vi.spyOn(prisma.testerReport, "findUnique").mockResolvedValue({
      id: reportId,
      clusterId,
      title: "Crash on startup",
      description: "App crashes when tapping login button",
      category: ReportCategory.CRASH,
      severity: ReportSeverity.CRITICAL,
      status: ReportStatus.ESCALATED,
      developerDecision: DeveloperReportDecision.ESCALATED,
      evidenceIds: ["ev-1"],
      app: { developerId },
    } as any);

    // Mock existing aiReview in DB
    vi.spyOn(prisma.aiReview, "findUnique").mockResolvedValue({
      id: "ai-rev-cached",
      clusterId,
      reportId,
      confidence: 90,
      classification: AiReportClassification.LIKELY_VALID,
      recommendedAction: AiRecommendedAction.NO_ACTION,
    } as any);

    vi.spyOn(prisma.testerReport, "update").mockResolvedValue({} as any);

    const result = await ReportService.executeAiReview(clusterId, reportId);

    expect(result).toBeDefined();
    expect(result?.id).toBe("ai-rev-cached");
    // Gemini provider should NOT have been invoked
    expect(mockProvider.analyzeReportCluster).not.toHaveBeenCalled();
    // Budget should NOT have been consumed
    expect(AiBudgetService.getDailyCount()).toBe(0);
  });

  it("2. should allow a new review when evidence changes (generating new sanitized content hash)", async () => {
    const mockProvider = {
      analyzeReportCluster: vi.fn().mockResolvedValue({
        classification: AiReportClassification.LIKELY_VALID,
        confidence: 95,
        model: "gemini-1.5-flash",
        policyVersion: "1.1.0",
        reasoningSummary: "Verified with new logs and screenshots",
        recommendedAction: AiRecommendedAction.NO_ACTION,
      }),
    };
    ReportService.setAiProvider(mockProvider as any);

    vi.spyOn(prisma.reportCluster, "findUnique").mockResolvedValue({
      id: clusterId,
      reportCount: 3,
      category: ReportCategory.CRASH,
    } as any);

    vi.spyOn(prisma.testerReport, "findUnique").mockResolvedValue({
      id: reportId,
      clusterId,
      title: "Crash on startup",
      description: "App crashes with updated stacktrace and memory dump", // New content
      category: ReportCategory.CRASH,
      severity: ReportSeverity.CRITICAL,
      status: ReportStatus.ESCALATED,
      developerDecision: DeveloperReportDecision.ESCALATED,
      evidenceIds: ["ev-1", "ev-2"], // Additional evidence
      app: { developerId },
    } as any);

    // Not found in cache with new hash
    vi.spyOn(prisma.aiReview, "findUnique").mockResolvedValue(null);
    vi.spyOn(prisma.aiReview, "create").mockResolvedValue({
      id: "ai-rev-new",
      clusterId,
      reportId,
      confidence: 95,
      classification: AiReportClassification.LIKELY_VALID,
    } as any);
    vi.spyOn(prisma.testerReport, "update").mockResolvedValue({} as any);

    const result = await ReportService.executeAiReview(clusterId, reportId);

    expect(result).toBeDefined();
    expect(result?.id).toBe("ai-rev-new");
    expect(mockProvider.analyzeReportCluster).toHaveBeenCalledTimes(1);
    expect(AiBudgetService.getDailyCount()).toBe(1);
  });
});
