# CallTest V1 — Rewards Anti-Abuse & Security Deep Audit

---

## 1. Methodology & Scope

This audit evaluates the **Phase 10 — Rewards Engine, XP, Gold, and Anti-Abuse** architecture across the following attack vectors:
- **Backend Authority**: Verification that Android never computes, alters, or authorizes XP/Gold balances.
- **Double Reward Risk**: Analysis of `MISSION_VALIDATED`, `FEEDBACK_SUBMITTED`, `CAMPAIGN_PARTICIPATION_COMPLETED`, and `CAMPAIGN_COMPLETED`.
- **Adversarial Idempotency**: Sequential (10x) and simultaneous concurrent requests for the same domain event.
- **Balance Atomicity & Escrow Lifecycle**: Verification that `PENDING` rewards do not disburse until explicitly approved, and that failures rollback ledger and balance mutations atomically.
- **State Machine Integrity**: Strict guards preventing unauthorized transitions (`APPROVED -> REJECTED`, `REJECTED -> APPROVED`, etc.).
- **Farming Mitigation**: Verification of zero-reward policies on installation signals, feedback deduplication, and replacement fairness.
- **Access Control & Privacy (IDOR)**: Ensuring private ledger isolation between testers and developers.

---

## 2. Invariants Verified

1. **Backend Authority**: Balances and rewards are mutated exclusively via authenticated backend services within transactional boundaries.
2. **Canonical Idempotency**: Compound unique constraint `(userId, sourceType, sourceId)` guarantees that duplicate event submissions never produce redundant ledger entries or balance increments.
3. **Zero Installation Rewards**: `INSTALL_CLAIMED`, `INSTALL_DETECTED`, and `FIRST_OPEN` grant strictly `0 XP` and `0 Gold`.
4. **Non-Negative Balances**: `User.xpBalance >= 0` and `User.goldBalance >= 0` always.
5. **State Transition Validity**:
   - `PENDING -> APPROVED`: Increments balance atomically.
   - `PENDING -> REJECTED`: Transitions without balance disbursement (`xpAmount = 0`, `goldAmount = 0`).
   - `APPROVED -> APPROVED`: Idempotent no-op.
   - `REJECTED -> APPROVED` / `APPROVED -> REJECTED`: Prohibited (`BadRequestError`).
6. **2-Day Replacement Fairness**: Replacement testers completing valid participation earn full rewards without late-entry penalties.
7. **Suspension/Ban Lockout**: Users in `SUSPENDED` or `BANNED` state cannot receive rewards (`ForbiddenError`).

---

## 3. Findings & Resolution

### Finding 1: `P1_REWARD_DOUBLE_COUNT_RISK` (Resolved)
- **Severity**: `P1`
- **File**: [`apps/backend/src/modules/rewards/subscribers/reward-event-subscribers.ts`](file:///c:/Users/manue/calltest/apps/backend/src/modules/rewards/subscribers/reward-event-subscribers.ts)
- **Causa**: Original subscribers utilized transient `attemptId` and `feedbackId` as source identifiers, which could hypothetically allow multiple validated attempts on the same mission to receive multiple rewards.
- **Impacto**: Risk of duplicate XP/Gold if multiple attempts were validated for a single mission.
- **Corrección**: Enforced canonical domain identifiers:
  - `MISSION_VALIDATED` uses canonical `sourceId = payload.missionId`.
  - `FEEDBACK_SUBMITTED` uses canonical `sourceId = payload.missionId`.
  - `CAMPAIGN_PARTICIPATION_COMPLETED` uses canonical `sourceId = payload.campaignId`.
  - The database compound unique key `(userId, sourceType, sourceId)` strictly rejects any subsequent reward for that mission or campaign.

### Finding 2: `P2_CONCURRENT_P2002_RACE_HANDLING` (Resolved)
- **Severity**: `P2`
- **File**: [`apps/backend/src/modules/rewards/service.ts`](file:///c:/Users/manue/calltest/apps/backend/src/modules/rewards/service.ts)
- **Causa**: High-concurrency simultaneous requests arriving at the database before an in-flight transaction completes could raise a `P2002` unique constraint violation rather than returning the existing record cleanly.
- **Impacto**: Unhandled 500 error in high-concurrency race conditions.
- **Corrección**: Added automatic P2002 error interceptor in `RewardService.processReward` that fetches and returns the existing canonical reward cleanly and idempotently.

---

## 4. Adversarial Test Matrix

| Adversarial Vector | Expected Behavior | Result |
| :--- | :--- | :---: |
| 10x Duplicate Mission Validated Event | Exactly 1 reward and 1 balance increment (+10 XP, +2 Gold) | **PASS** |
| Concurrent 5x Simultaneous Requests | Atomic execution, 1 reward record created, 0 race duplicates | **PASS** |
| Repeated Feedback Submissions | Exactly 1 feedback reward per mission (+5 XP, +1 Gold) | **PASS** |
| Repeated Participation Completed | Exactly 1 completion reward per campaign (+25 XP, +5 Gold) | **PASS** |
| `PENDING -> APPROVED` Repeated Twice | Balance incremented on first approval only; second call is idempotent no-op | **PASS** |
| `REJECTED -> APPROVED` Illegal Transition | Rejected with `BadRequestError` | **PASS** |
| `PENDING -> REJECTED` | Zero balance increment (`xp = 0`, `gold = 0`) | **PASS** |
| Suspended / Banned Tester Reward Attempt | Blocked with `ForbiddenError` | **PASS** |
| Installation Signals (`INSTALL_CLAIMED`) | Zero reward events emitted, 0 balance increment | **PASS** |
| IDOR Isolation | Developers/Testers cannot access private external reward balances | **PASS** |

---

## 5. Audit Conclusion

The rewards engine is robust, completely authoritative on the backend, resistant to concurrency races and duplicate event deliveries, and enforces all domain and privacy invariants.

Status: **`REWARDS_AUDIT_PASS`**
