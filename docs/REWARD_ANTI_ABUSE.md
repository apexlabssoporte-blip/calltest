# CallTest V1 — Reward Anti-Abuse & Idempotency Architecture

## 1. Executive Summary

To prevent farming, double-claims, and automated exploit vectors, CallTest V1 implements multi-layered protections across data integrity, transaction isolation, and event deduplication.

---

## 2. Anti-Abuse Guardrails

### A. Strict Idempotency via Database Constraints
- Unique compound key `(userId, sourceType, sourceId)` on the `rewards` table.
- Deterministic `idempotencyKey = "rew_{userId}_{sourceType}_{sourceId}"`.
- Redundant event deliveries or duplicate API invocations return the existing record without incrementing user balance.

### B. User Status Invariants
- `SUSPENDED` and `BANNED` testers cannot receive rewards.
- Any attempt to reward a non-active user triggers `ForbiddenError`.

### C. Installation Exploitation Mitigation
- `INSTALL_CLAIMED` and `INSTALL_DETECTED` **NEVER** award Gold or XP.
- Installing dozens of apps without completing missions awards zero rewards.

### D. 2-Day Replacement Fairness
- Replacement testers who participate for 2 days before global campaign completion receive their full valid participation rewards without penalty.

### E. Privacy & IDOR Protections
- Developers cannot access tester private reward balances, transaction histories, or total Gold/XP.
