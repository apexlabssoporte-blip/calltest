import {
  ReportAiProvider,
  AiReportSanitizedInput,
  AiReportAnalysisOutput,
} from "./ai-provider.interface.js";
import {
  AiReportClassification,
  AiRecommendedAction,
  ReportSeverity,
} from "@calltest/shared-types";
import { env } from "../../../core/config/env.js";

export class GeminiReportAiProvider implements ReportAiProvider {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly policyVersion = "1.1.0";

  constructor(apiKey?: string, model?: string, timeoutMs?: number) {
    this.apiKey = apiKey || env.GEMINI_API_KEY || "";
    this.model = model || env.GEMINI_MODEL || "gemini-1.5-flash";
    this.timeoutMs = timeoutMs || env.REPORT_AI_TIMEOUT_MS || 5000;
  }

  public async analyzeReportCluster(
    input: AiReportSanitizedInput,
  ): Promise<AiReportAnalysisOutput> {
    if (!this.apiKey) {
      return {
        classification: AiReportClassification.INCONCLUSIVE,
        confidence: 0.5,
        severityAssessment: input.severity,
        reasoningSummary: "Gemini API key is not configured. Falling back to human review.",
        recommendedAction: AiRecommendedAction.HUMAN_REVIEW,
        model: this.model,
        policyVersion: this.policyVersion,
        likelySameIssue: false,
        likelyValid: null,
        evidenceQuality: 0,
        missingEvidence: [],
        recommendation: "HUMAN_REVIEW",
      };
    }

    const systemPrompt = `You are the REPORT_ANALYSIS_ASSISTANT for CallTest.
Your role is to analyze software bug reports submitted by testers and provide structured evaluation.
Rules:
1. You are providing a SECOND OPINION only. You have no administrative authority.
2. You CANNOT execute sanctions, modify balances, change user status, or reward users.
3. Return strictly valid JSON adhering to the following structure:
{
  "likelySameIssue": boolean,
  "likelyValid": boolean | null,
  "confidence": number between 0 and 100,
  "evidenceQuality": number between 0 and 100,
  "missingEvidence": string[],
  "reasoningSummary": string summary,
  "recommendation": "PROBABLE_VALID" | "PROBABLE_INVALID" | "NEEDS_MORE_EVIDENCE" | "HUMAN_REVIEW"
}`;

    const promptPayload = {
      contents: [
        {
          role: "user",
          parts: [
            { text: systemPrompt },
            {
              text: `Evaluate this sanitized bug report context:\n${JSON.stringify(input, null, 2)}`,
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    };

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(promptPayload),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        throw new Error(`Gemini API HTTP Error: ${response.status} ${response.statusText}`);
      }

      const json: any = await response.json();
      const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw new Error("Empty response from Gemini API");
      }

      const parsed = JSON.parse(rawText);
      return this.validateAndNormalizeOutput(parsed, input);
    } catch (err: any) {
      clearTimeout(timer);
      return {
        classification: AiReportClassification.INCONCLUSIVE,
        confidence: 0.5,
        severityAssessment: input.severity,
        reasoningSummary: `Gemini evaluation failed or timed out: ${err.message}. Routing to Human Review.`,
        recommendedAction: AiRecommendedAction.HUMAN_REVIEW,
        model: this.model,
        policyVersion: this.policyVersion,
        likelySameIssue: false,
        likelyValid: null,
        evidenceQuality: 0,
        missingEvidence: [],
        recommendation: "HUMAN_REVIEW",
      };
    }
  }

  public validateAndNormalizeOutput(
    raw: any,
    fallbackInput: AiReportSanitizedInput,
  ): AiReportAnalysisOutput {
    if (!raw || typeof raw !== "object") {
      return {
        classification: AiReportClassification.INCONCLUSIVE,
        confidence: 0.5,
        severityAssessment: fallbackInput.severity,
        reasoningSummary: "Invalid non-object response from Gemini API. Routing to Human Review.",
        recommendedAction: AiRecommendedAction.HUMAN_REVIEW,
        model: this.model,
        policyVersion: this.policyVersion,
        likelySameIssue: false,
        likelyValid: null,
        evidenceQuality: 0,
        missingEvidence: [],
        recommendation: "HUMAN_REVIEW",
      };
    }

    // 1. Recommendation
    let recommendation = "HUMAN_REVIEW";
    if (["PROBABLE_VALID", "PROBABLE_INVALID", "NEEDS_MORE_EVIDENCE", "HUMAN_REVIEW"].includes(raw.recommendation)) {
      recommendation = raw.recommendation;
    }

    // 2. Map Recommendation and Action
    let classification = AiReportClassification.INCONCLUSIVE;
    if (raw.classification && Object.values(AiReportClassification).includes(raw.classification)) {
      classification = raw.classification;
    } else if (recommendation === "PROBABLE_VALID" || raw.likelyValid === true) {
      classification = AiReportClassification.LIKELY_VALID;
    } else if (recommendation === "PROBABLE_INVALID" || raw.likelyValid === false) {
      classification = AiReportClassification.LIKELY_INVALID;
    }

    let recommendedAction = AiRecommendedAction.HUMAN_REVIEW;
    if (raw.recommendedAction && Object.values(AiRecommendedAction).includes(raw.recommendedAction)) {
      recommendedAction = raw.recommendedAction;
    } else if (recommendation === "PROBABLE_VALID" || classification === AiReportClassification.LIKELY_VALID) {
      recommendedAction = AiRecommendedAction.NO_ACTION;
    } else if (recommendation === "NEEDS_MORE_EVIDENCE") {
      recommendedAction = AiRecommendedAction.REQUEST_MORE_EVIDENCE;
    }

    // 3. Confidence (0.0 - 1.0)
    let confidence = 0.5;
    if (typeof raw.confidence === "number") {
      let val = raw.confidence;
      if (val > 1.0 && val <= 100 && Number.isInteger(val)) {
        val = val / 100;
      }
      confidence = Math.max(0, Math.min(1.0, val));
    }

    // 4. Evidence Quality (0 - 100)
    let evidenceQuality = 50;
    if (typeof raw.evidenceQuality === "number") {
      evidenceQuality = Math.max(0, Math.min(100, raw.evidenceQuality));
    }

    // 5. Likely Same Issue & Likely Valid
    const likelySameIssue = typeof raw.likelySameIssue === "boolean" ? raw.likelySameIssue : true;
    const likelyValid = typeof raw.likelyValid === "boolean" ? raw.likelyValid : (classification === AiReportClassification.LIKELY_VALID ? true : (classification === AiReportClassification.LIKELY_INVALID ? false : null));

    // 6. Missing Evidence Array
    const missingEvidence = Array.isArray(raw.missingEvidence)
      ? raw.missingEvidence.filter((item: any) => typeof item === "string").slice(0, 10)
      : [];

    // 7. Reasoning Summary
    const reasoningSummary = typeof raw.reasoningSummary === "string" ? raw.reasoningSummary.slice(0, 1000) : "Analysis completed.";

    // 8. Severity Assessment
    let severityAssessment = fallbackInput.severity;
    if (raw.severityAssessment && Object.values(ReportSeverity).includes(raw.severityAssessment)) {
      severityAssessment = raw.severityAssessment;
    }

    return {
      classification,
      confidence,
      severityAssessment,
      evidenceConsistency: typeof raw.evidenceConsistency === "string" ? raw.evidenceConsistency.slice(0, 200) : undefined,
      duplicateLikelihood: typeof raw.duplicateLikelihood === "number" ? Math.max(0, Math.min(1, raw.duplicateLikelihood)) : undefined,
      reasoningSummary,
      recommendedAction,
      model: this.model,
      policyVersion: this.policyVersion,
      likelySameIssue,
      likelyValid,
      evidenceQuality,
      missingEvidence,
      recommendation,
    };
  }
}
