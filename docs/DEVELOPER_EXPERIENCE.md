# CallTest V1 — Developer Experience & Dashboard Architecture

## 1. Overview

The Developer Experience provides application developers with clear transparency, actionable metrics, and full control over their 14-day closed testing campaigns.

---

## 2. Key Developer Flows

```
[Register Application]
         │
         ▼
[SDK Recommendation UX]
  ○ ⭐ CallTest SDK (Automated installation detection & telemetry)
  ○ Continuar sin SDK (Evidence screenshot reviews)
         │
         ▼
[Configure Store & Group Links]
  ○ Play Store opt-in URL
  ○ Google Groups membership URL
         │
         ▼
[Create & Launch Campaign]
  ○ Target: 12 Active Testers
  ○ Duration: 14 Days
  ○ Capacity Cap: 15 Testers
         │
         ▼
[Real-Time Operations Dashboard]
  ○ Active Testers (12/12)
  ○ Low Activity Testers
  ○ Replacement Need (0)
  ○ Health Risk: HEALTHY
  ○ Activity Rate (%)
  ○ Mission Completion Rate (%)
         │
         ▼
[Evidence Management (NO_SDK Apps)]
  ○ Review submitted screenshot proof
  ○ Approve or Reject with constructive reasons
         │
         ▼
[Campaign Completion & Verification]
  ○ Graceful end of 14-day window
  ○ Independent Play Store check for Public release
```

---

## 3. Privacy & Security Invariants

1. **IDOR Protection**:
   - Developers cannot access campaigns, evidence, or dashboards of other developers (`403 Forbidden`).
2. **Tester Privacy Protection**:
   - Developer views never expose tester IP addresses, raw hardware serials/IMEIs, or internal fraud scores.
3. **No Penalty for NO_SDK**:
   - Applications without SDK run with 100% feature completeness through evidence-based workflows.
