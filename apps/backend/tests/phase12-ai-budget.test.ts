import { describe, it, expect, vi, beforeEach } from "vitest";
import { AiBudgetService } from "../src/modules/reports/ai/ai-budget.service.js";
import { ReportService } from "../src/modules/reports/service.js";
import { prisma } from "../src/core/database/prisma.js";
import { env } from "../src/core/config/env.js";
import { ReportCategory, ReportSeverity, ReportStatus } from "@calltest/shared-types";

describe("Phase 12: AI Budget & Cost Control Tests", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    AiBudgetService.reset();
  });

  describe("1. Budget Consumption Limits", () => {
    it("should allow consumption up to daily limit and block further consumption", () => {
      const dailyLimit = env.REPORT_AI_MAX_DAILY_REVIEWS;

      // Consume up to limit
      for (let i = 0; i < dailyLimit; i++) {
        expect(AiBudgetService.canConsume()).toBe(true);
        expect(AiBudgetService.consume()).toBe(true);
      }

      // Further attempts must be rejected
      expect(AiBudgetService.canConsume()).toBe(false);
      expect(AiBudgetService.consume()).toBe(false);
      expect(AiBudgetService.getRemainingDaily()).toBe(0);
    });

    it("should accurately track remaining daily and monthly quota", () => {
      AiBudgetService.consume();
      AiBudgetService.consume();

      expect(AiBudgetService.getDailyCount()).toBe(2);
      expect(AiBudgetService.getMonthlyCount()).toBe(2);
      expect(AiBudgetService.getRemainingDaily()).toBe(env.REPORT_AI_MAX_DAILY_REVIEWS - 2);
      expect(AiBudgetService.getRemainingMonthly()).toBe(env.REPORT_AI_MAX_MONTHLY_REVIEWS - 2);
    });
  });

  describe("2. Fallback to Human Review on Budget Exhaustion", () => {
    it("should route report directly to HUMAN_REVIEW when budget is exhausted", async () => {
      // Exhaust budget
      for (let i = 0; i < env.REPORT_AI_MAX_DAILY_REVIEWS; i++) {
        AiBudgetService.consume();
      }

      vi.spyOn(prisma.aiReview, "findUnique").mockResolvedValue(null);
      vi.spyOn(prisma.reportCluster, "findUnique").mockResolvedValue({
        id: "cluster-exhausted",
        reportCount: 3,
      } as any);

      vi.spyOn(prisma.testerReport, "findUnique").mockResolvedValue({
        id: "rep-exhausted",
        title: "Test bug",
        description: "Test description",
        category: ReportCategory.UI,
        severity: ReportSeverity.MEDIUM,
        status: ReportStatus.ESCALATED,
        evidenceIds: [],
        mission: null,
      } as any);

      const updateSpy = vi.spyOn(prisma.testerReport, "update").mockResolvedValue({} as any);
      const auditSpy = vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

      const result = await ReportService.executeAiReview("cluster-exhausted", "rep-exhausted");

      expect(result).toBeNull(); // AI skipped
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "rep-exhausted" },
          data: { status: ReportStatus.HUMAN_REVIEW },
        }),
      );
      expect(auditSpy).toHaveBeenCalled();
    });
  });
});
