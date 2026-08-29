import { describe, it, expect } from "vitest";
import { ReportAiEscalationService } from "../src/modules/reports/ai/ReportAiEscalationService.js";
import { AiEscalationDecision } from "@calltest/shared-types";

describe("Phase 12.1: AI Escalation Scoring & Decision Tiers", () => {
  it("1. Single report without other signals produces score 0 and routes to HUMAN_REVIEW (no Gemini)", () => {
    const evaluation = ReportAiEscalationService.calculateEscalationScore({
      reportCount: 1,
    });

    expect(evaluation.score).toBe(0);
    expect(evaluation.decision).toBe(AiEscalationDecision.HUMAN_REVIEW);
  });

  it("2. Two similar reports in cluster add +15 to score", () => {
    const evaluation = ReportAiEscalationService.calculateEscalationScore({
      reportCount: 2,
    });

    expect(evaluation.score).toBe(15);
    expect(evaluation.decision).toBe(AiEscalationDecision.HUMAN_REVIEW);
    expect(evaluation.reasons).toContain("2 similar independent reports in cluster");
  });

  it("3. Three or more reports add +25 without duplicate double-counting", () => {
    const evaluation = ReportAiEscalationService.calculateEscalationScore({
      reportCount: 3,
    });

    expect(evaluation.score).toBe(25);
    expect(evaluation.decision).toBe(AiEscalationDecision.HUMAN_REVIEW);
    expect(evaluation.reasons).toContain("3 or more similar independent reports in cluster");
  });

  it("4. Three reports (+25) with developer escalation (+20) yields score 45 -> COLLECT_MORE_EVIDENCE", () => {
    const evaluation = ReportAiEscalationService.calculateEscalationScore({
      reportCount: 3, // +25
      developerEscalated: true, // +20
    });

    expect(evaluation.score).toBe(45);
    expect(evaluation.decision).toBe(AiEscalationDecision.COLLECT_MORE_EVIDENCE);
  });

  it("5. Developer ESCALATED (+20) with 3 reports (+25), valid evidence (+15), and reproduction (+20) escalates to AI_ESCALATION (80)", () => {
    const evaluation = ReportAiEscalationService.calculateEscalationScore({
      reportCount: 3, // +25
      developerEscalated: true, // +20
      hasValidEvidence: true, // +15
      consistentReproduction: true, // +20
    });

    // 25 + 20 + 15 + 20 = 80 -> AI_ESCALATION
    expect(evaluation.score).toBe(80);
    expect(evaluation.decision).toBe(AiEscalationDecision.AI_ESCALATION);
  });

  it("6. Multiple signals sum up and are clamped strictly to <= 100", () => {
    const evaluation = ReportAiEscalationService.calculateEscalationScore({
      reportCount: 5, // +25
      developerEscalated: true, // +20
      hasValidEvidence: true, // +15
      consistentReproduction: true, // +20
      contradictoryReports: true, // +10
      criticalMissionAffected: true, // +10
      multipleDevicesOrOs: true, // +10
    });

    // 25 + 20 + 15 + 20 + 10 + 10 + 10 = 110 -> Clamped to 100
    expect(evaluation.score).toBe(100);
    expect(evaluation.decision).toBe(AiEscalationDecision.AI_ESCALATION);
  });
});
