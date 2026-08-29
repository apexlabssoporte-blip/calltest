# CallTest V1 — XP (Experience Points) System

## 1. Overview & Purpose

**XP** represents tester progression, dedication, and platform engagement within CallTest V1.

XP is strictly separate from Trust Score:
- **Trust Score (0–100)**: Behavioral reliability, anti-fraud posture, and absence of anomalies.
- **XP**: Accumulated progression volume earned by completing quality testing actions.

---

## 2. Default XP Earning Rates (Configurable via `env`)

| Source Event | Default XP | Description |
| :--- | :---: | :--- |
| `MISSION_VALIDATED` | **+10 XP** | Awarded when a mission attempt passes validation. |
| `FEEDBACK_SUBMITTED` | **+5 XP** | Awarded for submitting useful qualitative mission feedback. |
| `CAMPAIGN_PARTICIPATION_COMPLETED` | **+25 XP** | Awarded when 14-day closed testing cycle completes. |
| `CAMPAIGN_COMPLETED` | **+25 XP** | Awarded to active testers upon successful campaign completion. |
| `EXCELLENT_REPLACEMENT` | **+25 XP** | Awarded to replacement testers completing valid participation. |

---

## 3. What Does NOT Grant XP

- `INSTALL_CLAIMED` / `INSTALL_DETECTED`: Installation alone does not grant XP.
- Repeated or failed mission attempts.
- Spam feedback comments.
- Banned or suspended user activities.
