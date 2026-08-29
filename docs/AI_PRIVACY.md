# CallTest V1 — AI Privacy & Zero-PII Protocols (Phase 12.1)

## 1. Zero-PII Guarantee

`AiReportSanitizer` enforces automated redaction before any string is included in Gemini request payloads.

## 2. Redacted Information

| Category | Filter Pattern | Replacement |
|---|---|---|
| **Email Addresses** | Standard RFC 5322 regex | `[REDACTED_EMAIL]` |
| **IP Addresses** | IPv4 & IPv6 regex | `[REDACTED_IP]` |
| **Phone Numbers** | International formats | `[REDACTED_PHONE]` |
| **JWT Tokens** | Base64 header.payload.sig | `[REDACTED_JWT]` |
| **Bearer & Secret Tokens** | Token identifiers, secrets | `[REDACTED_TOKEN]` |
| **Passwords & API Keys** | `password: ...`, `api_key: ...` | `[REDACTED_SECRET]` |
| **Cookies** | `cookie: ...`, `set-cookie: ...` | `[REDACTED_COOKIE]` |
| **Financial & Card Numbers** | 16-digit credit cards | `[REDACTED_FINANCIAL]` |
| **Reward & Trust Balances** | XP / Gold / Trust / Fraud | `[REDACTED_INTERNAL]` |

## 3. UI Privacy Isolation

- **Developer Dashboard**: Receives structured cluster metrics (report count, affected testers, AI score, reasons, advisory verdict). Never receives fraud heuristics or tester PII.
- **Tester View**: Only receives high-level public statuses (`RECEIVED`, `UNDER_REVIEW`, `MORE_EVIDENCE_REQUIRED`, `VALIDATED`, `NOT_REPRODUCED`, `RESOLVED`). Never sees AI scores, prompts, or developer deliberations.
