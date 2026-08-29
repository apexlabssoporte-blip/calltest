# CallTest V1 — AI Escalation Engine & Score Model

## 1. Core Principle

Google Gemini is strictly an **optional second-opinion provider**. CallTest functions completely and securely with `AI_ENABLED=false` or without API keys. Gemini has zero authority over Trust Score, Fraud Score, Reputation, XP, Gold, campaign lifecycle, tester assignments, or user penalties.

## 2. Escalation Scoring Model (0–100)

The escalation score is computed deterministically in `ReportAiEscalationService` from independent signals:

| Signal | Score Increment | Rationale |
|---|---|---|
| **2+ Similar Reports in Cluster** | `+25` | Validates multi-tester reproducibility |
| **3+ Similar Reports in Cluster** | `+20` | Strong consensus across testers |
| **Valid Attached Evidence** | `+15` | Concrete logs, screenshots, or videos |
| **Consistent Reproduction** | `+20` | Clear reproducible failure steps |
| **Developer Explicit `ESCALATED`** | `+20` | Developer triage priority boost |
| **Contradictory Dispute Signals** | `+15` | Conflicting reports requiring human triage |
| **Critical Mission Path Affected** | `+10` | High severity business impact |
| **Multiple Distinct Devices / OS** | `+10` | Device-independent system defect |

**Bounds**: `0 <= aiEscalationScore <= 100`

## 3. Decision Tiers

```text
Score:  0 ────────── 39 ────────── 59 ────────── 79 ────────── 100
Tier:   [ HUMAN_REVIEW ] [ COLLECT_EVID ] [ AI_CANDIDATE ] [ AI_ESCALATION ]
Gemini:     NO                NO          Conditional      Conditional
```

- **`0–39` (`HUMAN_REVIEW`)**: Solitary reports or low-signal issues. No Gemini execution.
- **`40–59` (`COLLECT_MORE_EVIDENCE`)**: Potential issue requiring additional evidence before automated review. No Gemini execution.
- **`60–79` (`AI_CANDIDATE`)**: Meets threshold for Gemini second opinion only if daily/monthly budgets, developer rate limits, and cluster cooldown allow.
- **`80–100` (`AI_ESCALATION`)**: High consensus candidate for Gemini advisory evaluation.

**Fallback Rule**: If quota is exhausted, Gemini times out (`5000ms`), or `AI_ENABLED=false`, the case immediately falls back to `HUMAN_REVIEW` with 0 impact on user progress.
