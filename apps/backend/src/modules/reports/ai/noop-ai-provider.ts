import {
  ReportAiProvider,
  AiReportSanitizedInput,
  AiReportAnalysisOutput,
} from "./ai-provider.interface.js";
import {
  AiReportClassification,
  AiRecommendedAction,
} from "@calltest/shared-types";

export class NoopReportAiProvider implements ReportAiProvider {
  public async analyzeReportCluster(
    input: AiReportSanitizedInput,
  ): Promise<AiReportAnalysisOutput> {
    return {
      classification: AiReportClassification.INCONCLUSIVE,
      confidence: 0.5,
      severityAssessment: input.severity,
      evidenceConsistency: "UNVERIFIED_NOOP",
      duplicateLikelihood: 0.0,
      reasoningSummary: "AI analysis skipped or performed by Noop provider. Human review recommended.",
      recommendedAction: AiRecommendedAction.HUMAN_REVIEW,
      model: "noop-provider",
      policyVersion: "1.0.0",
    };
  }
}
