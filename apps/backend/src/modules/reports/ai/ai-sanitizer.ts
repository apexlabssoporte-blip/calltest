import { AiReportSanitizedInput } from "./ai-provider.interface.js";
import { ReportCategory, ReportSeverity } from "@calltest/shared-types";

export class AiReportSanitizer {
  private static readonly EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  private static readonly IPV4_REGEX = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
  private static readonly IPV6_REGEX = /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/g;
  private static readonly PHONE_REGEX = /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
  private static readonly TOKEN_REGEX = /\b(?:bearer\s+[A-Za-z0-9._~+/-]+=*|secret_token[A-Za-z0-9_]*|[A-Za-z0-9_]{24,})\b/gi;
  private static readonly JWT_REGEX = /\beyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\b/g;
  private static readonly CREDIT_CARD_REGEX = /\b(?:\d{4}[-\s]?){3}\d{4}\b/g;
  private static readonly SECRET_KEY_VAL_REGEX = /\b(?:password|passwd|pwd|api_?key|refresh_?token|device_?token|push_?token|fcm_?token|secret|access_?token)\s*[:=]\s*[^\s,;]+/gi;
  private static readonly COOKIE_REGEX = /\b(?:cookie|set-cookie)\s*:\s*[^\s,;]+/gi;
  private static readonly BALANCE_REGEX = /\b\d+\s*(?:xp|gold|trust|fraud)\b/gi;

  /**
   * Sanitizes report and cluster payload before sending to Google Gemini.
   * Strips all PII, emails, IPs, phone numbers, auth tokens, device tokens, and internal security scores.
   */
  public static sanitize(params: {
    report: {
      title: string;
      description: string;
      category: ReportCategory;
      severity: ReportSeverity;
    };
    mission?: {
      title: string;
      description?: string | null;
      instructions?: string | null;
    } | null;
    evidenceCount?: number;
    cluster: {
      reportCount: number;
      category: ReportCategory;
    };
  }): AiReportSanitizedInput {
    const cleanTitle = this.stripPii(params.report.title);
    const cleanDescription = this.stripPii(params.report.description);

    let sanitizedMission: { title: string; description?: string } | undefined;
    if (params.mission) {
      sanitizedMission = {
        title: this.stripPii(params.mission.title),
        description: params.mission.description ? this.stripPii(params.mission.description) : undefined,
      };
    }

    return {
      category: params.report.category,
      severity: params.report.severity,
      report: {
        title: cleanTitle,
        description: cleanDescription,
      },
      mission: sanitizedMission,
      evidenceSummary: {
        count: Math.min(params.evidenceCount || 0, 5), // Cap at max 5 evidence items
      },
      cluster: {
        reportCount: Math.min(Math.max(1, params.cluster.reportCount), 10), // Cap at max 10 reports
        category: params.cluster.category,
      },
    };
  }

  /**
   * Redacts sensitive patterns (emails, IPs, phone numbers, tokens, passwords, cookies, financial) from text.
   */
  public static stripPii(text: string): string {
    if (!text || typeof text !== "string") return "";

    return text
      .replace(this.JWT_REGEX, "[REDACTED_JWT]")
      .replace(this.SECRET_KEY_VAL_REGEX, "[REDACTED_SECRET]")
      .replace(this.COOKIE_REGEX, "[REDACTED_COOKIE]")
      .replace(this.EMAIL_REGEX, "[REDACTED_EMAIL]")
      .replace(this.IPV4_REGEX, "[REDACTED_IP]")
      .replace(this.IPV6_REGEX, "[REDACTED_IP]")
      .replace(this.PHONE_REGEX, "[REDACTED_PHONE]")
      .replace(this.CREDIT_CARD_REGEX, "[REDACTED_FINANCIAL]")
      .replace(this.BALANCE_REGEX, "[REDACTED_INTERNAL]")
      .replace(this.TOKEN_REGEX, "[REDACTED_TOKEN]");
  }
}
