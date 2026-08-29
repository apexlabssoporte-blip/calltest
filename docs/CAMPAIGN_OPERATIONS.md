# CallTest V1 — Campaign Operations Architecture & Developer Dashboard

## 1. Overview

The Campaign Operations module powers the Developer and Admin real-time control center for testing campaigns. It centralizes testing metrics, health score, tester distribution, days elapsed/remaining, and mission completion rates without exposing sensitive telemetry or internal fraud scores.

---

## 2. Core Metrics & Definitions

| Field | Source / Derivation | Description |
|---|---|---|
| `status` | `campaign.status` | State machine status (`DRAFT`, `READY`, `ACTIVE`, `TESTING`, `COMPLETED`, `PUBLIC`, `PAUSED`, `CANCELLED`, `SUSPENDED`). |
| `targetActiveTesters` | Fixed / Configured (12) | Target active tester cohort required for statistically valid feedback and closed testing compliance. |
| `activeTestersCount` | `campaign_testers.status = 'ACTIVE'` | Count of testers currently active and performing daily missions. |
| `lowActivityTestersCount` | `campaign_testers.status = 'LOW_ACTIVITY'` | Count of testers flagged for dropping below the 60% activity threshold. |
| `abandonedTestersCount` | `campaign_testers.status = 'ABANDONED'` | Count of testers disqualified due to prolonged absence. |
| `completedTestersCount` | `campaign_testers.status = 'COMPLETED'` | Count of testers who completed their assigned duration. |
| `replacementCount` | `campaign_testers.isReplacement = true` | Total replacement testers onboarded. |
| `daysElapsed` | `now - campaign.startsAt` | Calendar days since campaign launch (capped at `durationDays`). |
| `daysRemaining` | `durationDays - daysElapsed` | Calendar days until planned completion. |
| `missionProgress` | Aggregation across attempts | `{ totalMissions, totalAttempts, completedAttempts, completionRate }`. |
| `health` | `CampaignHealthService.calculateHealth` | Canonical campaign risk (`HEALTHY`, `WARNING`, `AT_RISK`, `CRITICAL`), score, and controlled replacement needs. |

---

## 3. Privacy & Security Guardrails

1. **Strict IDOR Ownership Control**:
   - Only the Developer who owns the application (or an `ADMIN`) can access `GET /campaigns/:id/dashboard`.
   - Access attempts by other developers return `403 Forbidden`.
   - Access attempts by standard testers return `403 Forbidden`.
2. **Confidential Internal Telemetry Protection**:
   - `fraudScore`, internal fraud events, device fingerprint telemetry, IP addresses, and cross-campaign reputation history are **strictly excluded** from developer dashboard responses.
3. **Tester Overview Sanitization**:
   - `GET /campaigns/:campaignId/testers/:testerId/overview` returns only safe operational data: `displayName`, `status`, `joinedAt`, `daysParticipating`, `completedMissionsCount`, and `activityScore`.

---

## 4. Endpoints

* `GET /campaigns/:id/dashboard`: Operational real-time dashboard.
* `GET /campaigns/:id/readiness`: Campaign pre-flight checklist.
* `POST /campaigns/:id/validate-links`: Store and group automated validation.
* `POST /campaigns/:id/confirm-links-test`: Developer confirmation of real phone link test.
* `POST /campaigns/:id/complete`: Controlled completion of campaign testing.
