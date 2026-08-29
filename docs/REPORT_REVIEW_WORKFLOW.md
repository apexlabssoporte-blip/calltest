# CallTest V1 — Report Review & Escalation Workflow (Phase 12.1)

## 1. End-to-End Report Lifecycle

```text
TESTER SUBMITS REPORT (0 XP / 0 Gold)
        ↓
DEVELOPER REVIEW
        ↓
DETERMINISTIC CLUSTERING (SHA-256 fingerprint)
        ↓
CALCULATE AI ESCALATION SCORE (0–100)
        ↓
 ┌─────────────────────────────┐
 │  0–39  → HUMAN_REVIEW       │  (No Gemini)
 │  40–59 → COLLECT_MORE_EVID  │  (No Gemini)
 │  60–79 → AI_CANDIDATE       │  (Conditional on budget/cooldown)
 │  80–100→ AI_ESCALATION      │  (Conditional on budget/cooldown)
 └─────────────────────────────┘
                ↓
       COST / PRIVACY CHECK
                ↓
          GEMINI AVAILABLE?
           /             \
         NO               YES
         ↓                 ↓
 HUMAN_REVIEW       GEMINI REVIEW
                           ↓
                    ADVISORY_RESULT
                           ↓
                     HUMAN REVIEW
                           ↓
                    FINAL DECISION (Admin / Developer)
```

## 2. Zero Reward Incentive Invariant

- `REPORT_SUBMITTED = 0 XP / 0 Gold`
- `REPORT_VALIDATED = 0 XP / 0 Gold`
- `REPORT_REJECTED = 0 XP / 0 Gold`

Reporting is designed for app quality feedback and is strictly non-monetized to prevent spam farming.
