import { describe, it, expect } from "vitest";
import { AiReportSanitizer } from "../src/modules/reports/ai/ai-sanitizer.js";
import { ReportCategory, ReportSeverity } from "@calltest/shared-types";

describe("Phase 12: AI Sanitization & Privacy Tests", () => {
  describe("PII & Credential Stripping", () => {
    it("should completely redact emails, IP addresses, phone numbers, and tokens", () => {
      const dirtyText =
        "User john.doe@calltest.io reported a bug from 192.168.1.50 with phone (555) 123-4567. " +
        "Captured auth token: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotLeakThisSecret";

      const sanitized = AiReportSanitizer.stripPii(dirtyText);

      expect(sanitized).not.toContain("john.doe@calltest.io");
      expect(sanitized).not.toContain("192.168.1.50");
      expect(sanitized).not.toContain("555) 123-4567");
      expect(sanitized).not.toContain("eyJhbGciOiJIUzI1Ni");
      expect(sanitized).not.toContain("doNotLeakThisSecret");

      expect(sanitized).toContain("[REDACTED_EMAIL]");
      expect(sanitized).toContain("[REDACTED_IP]");
      expect(sanitized).toContain("[REDACTED_PHONE]");
      expect(sanitized).toContain("[REDACTED_JWT]");
    });

    it("should sanitize full report context before AI dispatch", () => {
      const sanitizedPayload = AiReportSanitizer.sanitize({
        report: {
          title: "Crash on user email tester@test.com",
          description: "My token is secret_token_123456789012345678901234567890 and phone is +1-800-555-0199",
          category: ReportCategory.CRASH,
          severity: ReportSeverity.CRITICAL,
        },
        mission: {
          title: "Complete checkout mission",
          description: "Contact support@store.com if failure occurs at 10.0.0.1",
        },
        evidenceCount: 2,
        cluster: {
          reportCount: 5,
          category: ReportCategory.CRASH,
        },
      });

      expect(sanitizedPayload.report.title).not.toContain("tester@test.com");
      expect(sanitizedPayload.report.description).not.toContain("secret_token");
      expect(sanitizedPayload.report.description).not.toContain("+1-800-555-0199");
      if (sanitizedPayload.mission?.description) {
        expect(sanitizedPayload.mission.description).not.toContain("support@store.com");
        expect(sanitizedPayload.mission.description).not.toContain("10.0.0.1");
      }

      expect(sanitizedPayload.evidenceSummary?.count).toBe(2);
      expect(sanitizedPayload.cluster.reportCount).toBe(5);
    });
  });
});
