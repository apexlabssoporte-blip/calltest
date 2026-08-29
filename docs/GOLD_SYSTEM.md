# CallTest V1 — Gold Currency System

## 1. Overview & Purpose

**Gold** is the internal currency of CallTest V1. It is scarce, non-inflationary, and strictly audited.

In V1:
- Gold is an **internal virtual currency**.
- No external conversions, Marketplace, PayPal, Stripe, crypto, or peer-to-peer transfers are implemented in V1.

---

## 2. Default Gold Earning Rates (Configurable via `env`)

| Source Event | Default Gold | Description |
| :--- | :---: | :--- |
| `MISSION_VALIDATED` | **+2 Gold** | Granted per successfully validated mission. |
| `FEEDBACK_SUBMITTED` | **+1 Gold** | Granted for verified qualitative feedback. |
| `CAMPAIGN_PARTICIPATION_COMPLETED` | **+5 Gold** | Granted upon completing individual testing cycle. |
| `CAMPAIGN_COMPLETED` | **+5 Gold** | Granted upon successful global campaign completion. |
| `EXCELLENT_REPLACEMENT` | **+5 Gold** | Granted to valid replacement testers without penalty. |

---

## 3. Storage & Ledger Invariants

- User gold balance is stored on `User.goldBalance` (and ledger entries in `Reward`).
- Gold balance is non-negative (`gold >= 0`).
- Atomic database increments (`goldBalance: { increment: amount }`) prevent lost updates under concurrency.
