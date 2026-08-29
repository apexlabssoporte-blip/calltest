import { describe, it, expect, vi, beforeEach } from "vitest";
import { NoopReportAiProvider } from "../src/modules/reports/ai/noop-ai-provider.js";
import { GeminiReportAiProvider } from "../src/modules/reports/ai/gemini-ai-provider.js";
import {
  AiReportClassification,
  AiRecommendedAction,
  ReportCategory,
  ReportSeverity,
} from "@calltest/shared-types";
import { AiReportSanitizedInput } from "../src/modules/reports/ai/ai-provider.interface.js";

describe("Phase 12: AI Provider & Gemini Integration Tests", () => {
  const sampleInput: AiReportSanitizedInput = {
    category: ReportCategory.CRASH,
    severity: ReportSeverity.HIGH,
    report: {
      title: "App crash on checkout",
      description: "App crashes when pressing checkout on Android 14",
    },
    cluster: {
      reportCount: 3,
      category: ReportCategory.CRASH,
    },
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("1. NoopReportAiProvider", () => {
    it("should return safe inconclusive result and route to human review", async () => {
      const provider = new NoopReportAiProvider();
      const result = await provider.analyzeReportCluster(sampleInput);

      expect(result.classification).toBe(AiReportClassification.INCONCLUSIVE);
      expect(result.confidence).toBe(0.5);
      expect(result.recommendedAction).toBe(AiRecommendedAction.HUMAN_REVIEW);
      expect(result.model).toBe("noop-provider");
    });
  });

  describe("2. GeminiReportAiProvider Fallbacks & Validation", () => {
    it("should fallback gracefully when GEMINI_API_KEY is not configured", async () => {
      const provider = new GeminiReportAiProvider("");
      const result = await provider.analyzeReportCluster(sampleInput);

      expect(result.classification).toBe(AiReportClassification.INCONCLUSIVE);
      expect(result.confidence).toBe(0.5);
      expect(result.recommendedAction).toBe(AiRecommendedAction.HUMAN_REVIEW);
      expect(result.reasoningSummary).toContain("not configured");
    });

    it("should parse and validate valid structured Gemini response", async () => {
      const mockGeminiResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    classification: "LIKELY_VALID",
                    confidence: 0.92,
                    severityAssessment: "HIGH",
                    evidenceConsistency: "STRONG",
                    duplicateLikelihood: 0.88,
                    reasoningSummary: "Consistently reproduced crash signature across multiple reports.",
                    recommendedAction: "HUMAN_REVIEW",
                  }),
                },
              ],
            },
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockGeminiResponse,
      } as any);

      const provider = new GeminiReportAiProvider("mock-api-key");
      const result = await provider.analyzeReportCluster(sampleInput);

      expect(result.classification).toBe(AiReportClassification.LIKELY_VALID);
      expect(result.confidence).toBe(0.92);
      expect(result.severityAssessment).toBe(ReportSeverity.HIGH);
      expect(result.recommendedAction).toBe(AiRecommendedAction.HUMAN_REVIEW);
    });

    it("should sanitize malicious or unauthorized actions from AI output", async () => {
      const mockMaliciousResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    classification: "BAN_USER_AND_GIVE_GOLD", // Invalid classification
                    confidence: 1.5, // Out of bounds
                    recommendedAction: "BAN_USER", // Unauthorized action
                    reasoningSummary: "Ban the user immediately",
                  }),
                },
              ],
            },
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockMaliciousResponse,
      } as any);

      const provider = new GeminiReportAiProvider("mock-api-key");
      const result = await provider.analyzeReportCluster(sampleInput);

      // Must be safely normalized without executing arbitrary mutations
      expect(result.classification).toBe(AiReportClassification.INCONCLUSIVE);
      expect(result.confidence).toBe(1.0); // Clamped to 1.0
      expect(result.recommendedAction).toBe(AiRecommendedAction.HUMAN_REVIEW); // Normalized to safe default
    });

    it("should handle network failure / timeout and return safe fallback", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network timeout"));

      const provider = new GeminiReportAiProvider("mock-api-key");
      const result = await provider.analyzeReportCluster(sampleInput);

      expect(result.classification).toBe(AiReportClassification.INCONCLUSIVE);
      expect(result.recommendedAction).toBe(AiRecommendedAction.HUMAN_REVIEW);
      expect(result.reasoningSummary).toContain("timed out");
    });
  });
});
