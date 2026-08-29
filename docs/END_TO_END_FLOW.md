# CallTest V1 — End-to-End Flow & Lifecycle Architecture

## 1. Executive Summary

CallTest V1 orchestrates 14-day closed testing cycles required by Google Play Store guidelines. The backend acts as the single source of truth across tester eligibility, verification methods (CallTest SDK vs Manual Evidence), mission attempts, activity scores, health evaluations, and graceful campaign completion.

---

## 2. Global Lifecycle State Machine

```
   DEVELOPER APP CREATION & CONFIGURATION
                     │
                     ▼
             [App Registration]
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
    ⭐ CallTest SDK            NO_SDK
  (Automated signals)   (Evidence required)
         └───────────┬───────────┘
                     ▼
             [Create Campaign]
   - targetTesters: 12, maxTesters: 15
   - durationDays: 14
                     │
                     ▼
             [Links Validation]
   - Play Store closed track URL
   - Google Group membership URL
                     │
                     ▼
         [Transition to ACTIVE]
                     │
   ──────────────────┼──────────────────
                     ▼
           TESTER PARTICIPATION
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
    [Discovery]             [Matching]
  GET /campaigns/available   Automated Slot Filling
         └───────────┬───────────┘
                     ▼
              [Join Campaign]
   - Self-Testing Protection (Checked)
   - joinedAt = now()
   - expectedEndAt = joinedAt + 14d
                     │
                     ▼
       [Installation Verification]
         ┌───────────┴───────────┐
         ▼                       ▼
    ⭐ CallTest SDK            NO_SDK
   INSTALL_DETECTED       INSTALL_CLAIMED
          +                      +
      FIRST_OPEN           Evidence Review
         └───────────┬───────────┘
                     ▼
            [Mission Engine]
   - Step Execution & Validation
   - Difficulty Feedback (Easy/Med/Hard)
                     │
                     ▼
            [Activity Engine]
   - Sessions & Events Recording
   - Status: ACTIVE / LOW_ACTIVITY
                     │
   ──────────────────┼──────────────────
                     ▼
          CAMPAIGN HEALTH & REPLACEMENT
                     │
         [CampaignHealthService]
   - 12 ACTIVE → HEALTHY (replacementNeed = 0)
   - 12 ACTIVE + 5 LOW_ACTIVITY → HEALTHY (replacementNeed = 0)
   - 11 ACTIVE + 1 ABANDONED → AT_RISK (replacementNeed = 1)
                     │
                     ▼
            [Replacement Flow]
   - Replacement Tester enters as isReplacement=true
   - expectedEndAt = replacement.joinedAt + 14d
                     │
   ──────────────────┼──────────────────
                     ▼
          CAMPAIGN COMPLETION
                     │
       [CampaignCompletionService]
   - All active testers marked COMPLETED
   - 2-Day Replacement Rule: Validated without penalty
   - Domain Event: tester.participation_completed
   - Dispatch Notification: CAMPAIGN_PARTICIPATION_THANK_YOU
                     │
                     ▼
          [Public Availability]
   - Independent Play Store Validation
   - COMPLETED → PUBLIC
```

---

## 3. Core Invariants & Rules

1. **Rule of 12 / 15**:
   - Primary target: 12 concurrent active testers.
   - Hard cap: 15 active testers.
   - `LOW_ACTIVITY` participants do not degrade the canonical `ACTIVE` count.
2. **Individual Timeline Calculation**:
   - `expectedEndAt = joinedAt + campaign.durationDays * 24h` for each individual tester.
   - Never locked to global `campaign.startsAt`.
3. **Replacement 2-Day Completion Rule**:
   - If a replacement tester enters on Day 12 and actively tests for 2 days before the campaign finishes on Day 14, their participation is classified as `VALID` and `COMPLETED`.
   - No abandonment penalty or Trust reduction is applied.
4. **Self-Testing Prevention**:
   - Developers cannot join campaigns for apps they own (`SELF_TESTING_NOT_ALLOWED`).
5. **Independent Public Verification**:
   - A campaign transitions from `COMPLETED` to `PUBLIC` only when real Play Store HTTP checks confirm public availability.
