# Installation Verification System — CallTest V1

## 1. Overview & Dual Modality Architecture

CallTest distinguishes between applications integrated with the official **CallTest SDK** (Modalidad A) and applications testing without SDK integration (Modalidad B).

```
                      +-----------------------------+
                      |   Tester Joins Campaign     |
                      +--------------+--------------+
                                     |
               +---------------------+---------------------+
               |                                           |
               v                                           v
    [Modalidad A: SDK App]                      [Modalidad B: No-SDK App]
   - Developer embeds CallTest SDK             - Play Store link flow only
   - Emits technical telemetry                 - Tester claims "Ya instalé"
               |                                           |
               v                                           v
   INSTALL_DETECTED / FIRST_OPEN               INSTALL_CLAIMED (Unverified)
   (Technical Verification)                    (Requires Evidence / Activity)
               |                                           |
               +---------------------+---------------------+
                                     |
                                     v
                        [Participation Verification]
```

---

## 2. Strict Domain Invariants

> [!IMPORTANT]
> 1. **CLAIMED $\neq$ VERIFIED**: `INSTALL_CLAIMED` is recorded when a tester confirms clicking the installation link, but **never** marks the installation as verified on its own.
> 2. **VERIFIED $\neq$ ACTIVE**: A technically verified installation (`FIRST_OPEN` or developer-approved screenshot evidence) does **not** make a tester automatically `ACTIVE`. Testers must still produce legitimate daily activity verified by the Activity Engine to count towards the 12 active tester threshold.

---

## 3. Installation Status Lifecycle

```
NOT_STARTED
    │
    ├── (Click link) ──────────────► INSTALL_ATTEMPTED
    │                                     │
    ├── (Modalidad B: User Confirm) ─────► INSTALL_CLAIMED
    │                                     │ (Evidence/Review)
    ├── (Modalidad A: SDK Telemetry) ────► INSTALL_DETECTED ──► FIRST_OPEN ──► ACTIVE
    │
    └── (Uninstall / Missing Session) ──► REMOVED / UNVERIFIED
```

---

## 4. Endpoints & Telemetry

| Endpoint | Method | Role | Description |
| :--- | :--- | :--- | :--- |
| `/campaigns/install/claim` | `POST` | `TESTER` | Tester declares manual installation (`INSTALL_CLAIMED`). |
| `/campaigns/install/sdk-event` | `POST` | `SDK / TESTER` | Ingests `INSTALL_DETECTED` and `FIRST_OPEN` telemetry. |
| `/campaigns/:campaignId/install/status` | `GET` | `TESTER` | Queries authenticated tester's installation status. |
