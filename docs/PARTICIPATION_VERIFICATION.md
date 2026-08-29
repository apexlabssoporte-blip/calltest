# Participation Verification Engine — CallTest V1

## 1. Overview & Verification Matrix

The Participation Verification Engine aggregates multi-signal operational data across the installation lifecycle, mission completions, developer evidence reviews, and Activity Engine scoring.

```
+-------------------------------------------------------------------------------+
|                        PARTICIPATION STATUS EVALUATION                         |
+------------------------------------+------------------------------------------+
| Inputs                             | Resulting ParticipationStatus            |
+------------------------------------+------------------------------------------+
| CampaignTester: COMPLETED          | COMPLETED                                |
| CampaignTester: ABANDONED          | ABANDONED                                |
| CampaignTester: LOW_ACTIVITY       | LOW_ACTIVITY                             |
| SDK Verified / Approved Evidence + | ACTIVE (if activityScore meets active)   |
| Activity Score >= 70               | VERIFIED (if baseline activity met)      |
| INSTALL_CLAIMED only               | PARTIALLY_VERIFIED (never ACTIVE)        |
| No install signal & no missions    | UNVERIFIED                               |
+------------------------------------+------------------------------------------+
```

---

## 2. Integrity Rules & Active Tester Limits

- **Target Active Testers = 12 (Max 15)**:
  - Adding participation verification metrics provides transparency to developers without modifying the core matching and health algorithms.
  - Participation verified testers only count towards the 12 active tester threshold when evaluated as `ACTIVE` by the Activity Engine.
- **Developer Operational Dashboard Breakdown**:
  - `assignedTestersCount`: Total testers currently assigned.
  - `installationClaimedCount`: Testers who clicked/claimed installation.
  - `installationVerifiedCount`: Testers verified via SDK or approved screenshots.
  - `participationVerifiedCount`: Testers with verified install and completed mission activity.
  - `pendingVerificationCount`: Testers awaiting verification.
  - `missionsSummary`: Breakdown of completed, pending, and rejected mission attempts.
