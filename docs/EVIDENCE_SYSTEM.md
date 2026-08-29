# Evidence & Human Review System — CallTest V1

## 1. Overview

The Evidence Engine provides a secure, auditable mechanism for testers to submit visual screenshot proof for missions, especially for applications tested without SDK integration (Modalidad B).

Validation is anchored on **Human Review by the Developer**, avoiding brittle full-automatic AI image scoring for critical tester validation in V1.

---

## 2. Evidence Architecture & Storage

```
[Tester Client / Android]
       │
       ▼ (Base64 Image Upload: PNG/JPEG/WEBP <= 10MB)
[POST /mission-attempts/:attemptId/evidence]
       │
       ├── 1. Storage Abstraction (LocalEvidenceStorage)
       │      - Validates MIME & Max size
       │      - Path traversal protection
       │      - Computes SHA-256 hash
       │
       ├── 2. Hash Deduplication & Fraud Detection
       │      - If identical SHA-256 exists in other campaign/user
       │      - Emits REPEATED_EVIDENCE_HASH fraud signal (no auto-ban)
       │
       ├── 3. Persistence (MissionEvidence in PENDING_REVIEW)
       │      - Records AuditLog (EVIDENCE_SUBMITTED)
       │      - Emits Domain Event: evidence.submitted
       │
       ▼
[Developer Review Workflow]
       ├── GET /campaigns/:campaignId/evidence
       ├── POST /evidence/:id/approve ──► Marks Mission Attempt VALIDATED
       └── POST /evidence/:id/reject  ──► Mandatory Reason (WRONG_SCREEN, BLURRY, etc.)
```

---

## 3. Human Review Rules & RBAC

1. **Mandatory Rejection Reason**:
   - `POST /evidence/:id/reject` requires a valid `EvidenceRejectionReason` (`NOT_VISIBLE`, `WRONG_SCREEN`, `DOES_NOT_MATCH_MISSION`, `BLURRY`, `INCOMPLETE`, `DUPLICATE`, `OTHER`).
   - Rejections without reason throw `400 Bad Request`.
2. **Strict RBAC & IDOR Protection**:
   - Only the application's owner developer (or platform `ADMIN`) can approve or reject evidence.
   - Testers can only view and upload evidence for their own assigned missions.
3. **Audit Trail**:
   - Every submission, approval, and rejection is permanently recorded in `AuditLog` with actor ID, timestamp, and metadata.
