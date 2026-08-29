import {
  AiReportClassification,
  AiRecommendedAction,
  ReportCategory,
  ReportSeverity,
} from "@calltest/shared-types";

export interface AiReportSanitizedInput {
  category: ReportCategory;
  severity: ReportSeverity;
  report: {
    title: string;
    description: string;
  };
  mission?: {
    title: string;
    description?: string;
    steps?: string[];
  };
  evidenceSummary?: {
    count: number;
    mimeType?: string;
  };
  cluster: {
    reportCount: number;
    category: ReportCategory;
  };
}

export interface AiReportAnalysisOutput {
  classification: AiReportClassification;
  confidence: number;
  severityAssessment?: ReportSeverity;
  evidenceConsistency?: string;
  duplicateLikelihood?: number;
  reasoningSummary: string;
  recommendedAction: AiRecommendedAction;
  model: string;
  policyVersion: string;
  // Phase 12.1 structured response fields
  likelySameIssue?: boolean;
  likelyValid?: boolean | null;
  evidenceQuality?: number;
  missingEvidence?: string[];
  recommendation?: string;
}

export interface ReportAiProvider {
  analyzeReportCluster(input: AiReportSanitizedInput): Promise<AiReportAnalysisOutput>;
}
