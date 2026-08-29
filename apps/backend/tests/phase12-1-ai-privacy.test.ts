import { describe, it, expect } from "vitest";
import { AiReportSanitizer } from "../src/modules/reports/ai/ai-sanitizer.js";
import { ReportCategory, ReportSeverity } from "@calltest/shared-types";

describe("Phase 12.1: AI Privacy & Zero-PII Sanitization Protocols", () => {
  it("1. should redact emails, IPv4, IPv6, and phone numbers", () => {
    const rawText = "Contact me at alice.dev@company.com or call +1 (555) 019-2834. IP: 192.168.1.50 and 2001:0db8:85a3:0000:0000:8a2e:0370:7334";
    const cleaned = AiReportSanitizer.stripPii(rawText);

    expect(cleaned).not.toContain("alice.dev@company.com");
    expect(cleaned).not.toContain("192.168.1.50");
    expect(cleaned).not.toContain("2001:0db8:85a3:0000:0000:8a2e:0370:7334");
    expect(cleaned).not.toContain("555");
    expect(cleaned).toContain("[REDACTED_EMAIL]");
    expect(cleaned).toContain("[REDACTED_IP]");
    expect(cleaned).toContain("[REDACTED_PHONE]");
  });

  it("2. should redact JWT, bearer tokens, passwords, cookies, and device tokens", () => {
    const rawText = "Auth error with Bearer ya29.a0AfH6SM... and eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgN_b_xQ. Cookie: session=abcd1234efgh. password: SuperSecretPassword123! fcm_token: exp_device_token_xyz987";
    const cleaned = AiReportSanitizer.stripPii(rawText);

    expect(cleaned).not.toContain("SuperSecretPassword123!");
    expect(cleaned).not.toContain("ya29.");
    expect(cleaned).not.toContain("eyJhbGci");
    expect(cleaned).not.toContain("session=abcd1234efgh");
    expect(cleaned).not.toContain("exp_device_token_xyz987");
  });

  it("3. should redact credit cards and internal reward balances", () => {
    const rawText = "Payment failed on card 4111-2222-3333-4444. User has 50 xp and 10 gold and 95 trust.";
    const cleaned = AiReportSanitizer.stripPii(rawText);

    expect(cleaned).not.toContain("4111-2222-3333-4444");
    expect(cleaned).not.toContain("50 xp");
    expect(cleaned).not.toContain("10 gold");
  });

  it("4. should enforce context window limits (max 10 reports and max 5 evidence items)", () => {
    const sanitized = AiReportSanitizer.sanitize({
      report: {
        title: "Test report title",
        description: "Test report description",
        category: ReportCategory.FUNCTIONAL,
        severity: ReportSeverity.MEDIUM,
      },
      evidenceCount: 15, // Excessive evidence items
      cluster: {
        reportCount: 50, // Massive cluster
        category: ReportCategory.FUNCTIONAL,
      },
    });

    expect(sanitized.evidenceSummary?.count).toBe(5); // Capped at 5
    expect(sanitized.cluster.reportCount).toBe(10); // Capped at 10
  });
});
