# CallTest V1 — AI Verification Engine (Google Gemini Integration)

## 1. Role & Boundaries

The AI Verification Engine runs Google Gemini models (`gemini-1.5-flash`) to generate structured secondary assessments of software issues.

### Strict Operational Principles
1. **Advisory Only**: AI has zero mutation privileges over database records, user trust scores, fraud flags, or monetary rewards.
2. **Schema Invariant**: AI output is strictly parsed and filtered. Any unauthorized recommendations (such as user penalties or direct closures) are discarded.
3. **Graceful Degradation**: If the Gemini API key is missing, network requests timeout (`REPORT_AI_TIMEOUT_MS = 5000`), or rate limits are reached, the system smoothly falls back to `HUMAN_REVIEW` without blocking users.

## 2. Gemini Prompt & Contract

Gemini is strictly instructed via system prompt:
```json
{
  "classification": "LIKELY_VALID" | "LIKELY_INVALID" | "INCONCLUSIVE",
  "confidence": 0.0 - 1.0,
  "severityAssessment": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "evidenceConsistency": "...",
  "duplicateLikelihood": 0.0 - 1.0,
  "reasoningSummary": "...",
  "recommendedAction": "HUMAN_REVIEW" | "REQUEST_MORE_EVIDENCE" | "NO_ACTION"
}
```

## 3. Idempotency Compound Key

To guarantee that duplicate evaluation requests do not consume unnecessary API tokens, AI reviews are indexed by:
`aiReviewKey = "${clusterId}:${policyVersion}:${evidenceVersion}"`

If an analysis already exists for this key, it is immediately served without re-invoking the remote API.
