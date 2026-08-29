# CallTest V1 — Rewards Engine Architecture

## 1. Executive Summary

The **Reward Engine** is the backend authority responsible for calculating, granting, and tracking progression XP and internal Gold rewards in CallTest V1. It enforces strict idempotency, anti-abuse checks, atomic ledger operations, and privacy isolation.

---

## 2. Core Architectural Principles

```
  DOMAINS EVENTS
  - mission.validated
  - mission.feedback_submitted
  - tester.participation_completed
  - campaign.completed
               │
               ▼
   [RewardEventSubscribers]
               │
               ▼
        [RewardService]
   - Verify User Status (Reject SUSPENDED / BANNED)
   - Check Idempotency: (userId, sourceType, sourceId)
   - Compute Configured XP / Gold
               │
               ▼
    [Database Transaction]
   - Create Ledger Entry (rewards table)
   - Atomic Increment (User.xpBalance, User.goldBalance)
               │
               ▼
     [Audit Log & Event]
   - REWARD_GRANTED / REWARD_PENDING
   - Domain Event: reward.granted
```

---

## 3. Reward Sources and Statuses

### A. Supported Event Sources
- `MISSION_VALIDATED`: Awarded once per validated mission attempt.
- `FEEDBACK_SUBMITTED`: Awarded once per actionable qualitative mission feedback.
- `CAMPAIGN_PARTICIPATION_COMPLETED`: Awarded once when a tester finishes their 14-day cycle.
- `CAMPAIGN_COMPLETED`: Awarded once when the campaign finishes successfully.
- `EXCELLENT_REPLACEMENT`: Awarded to replacement testers who complete valid participation without penalty.

### B. Reward Statuses
- `APPROVED`: Balance incremented immediately.
- `PENDING`: Held in escrow until human approval (e.g. manual evidence review).
- `REJECTED`: No balance incremented.

---

## 4. REST API

- `GET /me/rewards`: Returns user's total XP, total Gold, completed missions count, completed campaigns count, and 5 recent rewards.
- `GET /me/rewards/history`: Paginated list of ledger entries with optional source filter.
