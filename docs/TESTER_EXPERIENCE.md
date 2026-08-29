# CallTest V1 — Tester Experience & Client Architecture

## 1. Overview

The Tester Experience in CallTest V1 gives Android closed-track testers a friction-free, motivating workflow while keeping the backend as the ultimate authority for trust, reputation, fraud prevention, and validation.

---

## 2. Key Screen Flow & Endpoints

### A. Tester Home & Discovery
- **Endpoint**: `GET /campaigns/available`
  - Returns campaigns eligible for enrollment based on Exposure Profile, Trust rank, and capacity limits.
  - Automatically filters out apps owned by the user (`SELF_TESTING_NOT_ALLOWED`).
- **Endpoint**: `GET /me/campaigns`
  - Displays all active, pending, and completed testing campaigns.
  - Computes `dayOfParticipation` (e.g. Day 3 of 14) based on individual `joinedAt`.

### B. Joining a Campaign
- **Endpoint**: `POST /campaigns/:campaignId/join`
  - Validates eligibility and capacity (< 15 active testers).
  - Calculates `expectedEndAt = joinedAt + durationDays`.
  - Initializes `InstallationRecord` (`NOT_STARTED`).
  - Emits `campaign.tester.assigned` event.

### C. Campaign Participation Detail
- **Endpoint**: `GET /me/campaigns/:campaignId`
  - Overview: App name, Developer display name, Verification method (`CallTest SDK` vs `Evidencias`).
  - Participation timeline: `dayOfParticipation`, `expectedEndAt`.
  - Mission Breakdown: List of missions, status (`PENDING`, `IN_PROGRESS`, `SUBMITTED`, `VALIDATED`, `REJECTED`).
  - Activity Summary: Sessions count, validated missions count, feedback count.

### D. Mission Feedback & Ratings
- Post-mission completion prompt:
  - Difficulty rating: `EASY`, `MEDIUM`, `HARD`.
  - Optional qualitative feedback comment.
  - Stored uniquely per user/mission to avoid duplication.

### E. Campaign Completion
- When a campaign completes:
  - Tester receives `CAMPAIGN_PARTICIPATION_THANK_YOU` notification:
    *"¡Gracias por participar! La prueba de {appName} ha finalizado. Tu participación fue registrada correctamente. Ahora puedes participar en otra campaña disponible."*
  - Tester is eligible to discover and enroll in their next campaign based on Exposure load.
