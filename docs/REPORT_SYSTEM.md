# CallTest V1 — Tester Report System & Architecture

## 1. Overview

The **Tester Report System** allows active testers in CallTest campaigns to submit structured bug reports and feedback. The system connects testers, developers, automated clustering, Google Gemini AI second opinion verification, and administrative human reviews in an immutable, audited lifecycle.

## 2. Core Authority & Invariants

1. **Backend Authoritative Rule**: The backend is the sole authority on Trust Score, Reputation, Fraud Score, suspensions, bans, XP, Gold, missions, campaign state, tester participation, rewards, and the Rule of 12/15.
2. **AI Non-Authoritative Principle**: Google Gemini acts exclusively as a **Second Opinion / Assistant**. AI **NEVER** directly applies sanctions, modifies balances, adjusts Trust/Reputation/Fraud, or closes cases.
3. **Developer Review First**: Developers have the primary responsibility to review, confirm (`VALID`), reject (`INVALID`), ask for more proof (`NEEDS_MORE_EVIDENCE`), or escalate (`ESCALATED`) reports.
4. **Zero Rewards for Submissions**: To prevent spam and farming, `REPORT_SUBMITTED = 0 XP / 0 Gold` and `REPORT_VALIDATED = 0 XP / 0 Gold`.

## 3. Data Models

### `TesterReport`
- `id`: UUID
- `campaignId`: UUID (foreign key to `Campaign`)
- `appId`: UUID (foreign key to `App`)
- `testerId`: UUID (foreign key to `User`)
- `missionId`: Optional UUID (associated mission)
- `clusterId`: Optional UUID (deterministic group)
- `title`: String (3-150 chars)
- `description`: String (10-3000 chars)
- `category`: `FUNCTIONAL | UI | PERFORMANCE | CRASH | INSTALLATION | ACCESSIBILITY | SECURITY | OTHER`
- `severity`: `LOW | MEDIUM | HIGH | CRITICAL`
- `status`: `SUBMITTED | DEVELOPER_REVIEW | VALID | INVALID | NEEDS_MORE_EVIDENCE | ESCALATED | AI_REVIEW_PENDING | AI_REVIEWED | HUMAN_REVIEW | CONFIRMED | REJECTED`
- `developerDecision`: `VALID | INVALID | NEEDS_MORE_EVIDENCE | ESCALATED`
- `developerDecisionReason`: String
- `evidenceIds`: String[] (associated evidence objects)
- `createdAt`, `updatedAt`, `resolvedAt`: Timestamps

### `ReportCluster`
- `id`: UUID
- `campaignId`, `appId`: UUIDs
- `fingerprint`: SHA-256 hash `(campaignId + appId + missionId + category + severity + normalizedTitle)`
- `status`: `OPEN | ESCALATED | RESOLVED | CLOSED`
- `reportCount`: Integer
- `firstReportedAt`, `lastReportedAt`: Timestamps

### `AiReview`
- `id`: UUID
- `clusterId`: UUID (foreign key to `ReportCluster`)
- `reportId`: Optional UUID
- `aiReviewKey`: Unique Compound Key `(clusterId + policyVersion + evidenceVersion)`
- `provider`: String (`google-gemini`)
- `model`: String (`gemini-1.5-flash`)
- `policyVersion`: String (`1.0.0`)
- `classification`: `LIKELY_VALID | LIKELY_INVALID | INCONCLUSIVE`
- `confidence`: Float (`0.0 - 1.0`)
- `severityAssessment`: `LOW | MEDIUM | HIGH | CRITICAL`
- `evidenceConsistency`: String summary
- `duplicateLikelihood`: Float (`0.0 - 1.0`)
- `reasoningSummary`: String
- `recommendedAction`: `HUMAN_REVIEW | REQUEST_MORE_EVIDENCE | NO_ACTION`
- `latencyMs`: Integer
- `success`: Boolean
