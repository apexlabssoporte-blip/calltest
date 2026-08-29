# CallTest V1 — Failure Modes & Graceful Degradation

## 1. Summary of Failure Modes & Mitigations

| Component | Failure Scenario | Degradation & Resiliency Behavior |
| :--- | :--- | :--- |
| **PostgreSQL** | Connection timeout / unavailable | API returns `503 Service Unavailable` on `/health/ready`. In-flight transactions rollback cleanly. `/health/live` remains responsive. |
| **Redis** | Redis crash / network partition | Rate limiter fails open gracefully or falls back to in-memory window. Database integrity remains unaffected. |
| **Push Provider (FCM/APNs)** | Third-party timeout | Background notification publisher catches and logs error; domain operations and database commitments proceed normally. |
| **Evidence Storage** | Disk full / S3 timeout | Evidence upload rejected with clean 500/503 error; mission attempt remains in `STARTED` state allowing tester to retry. |
| **Event Bus** | Subscriber handler throws error | `DomainEventBus` logs error and isolates handler, preventing failure from propagating to the triggering domain transaction. |
| **Internal Replay Attack** | Duplicate nonce or expired timestamp | `requireInternalServiceAuth` rejects with `403 Forbidden`, logs `AuditLog` security incident, and drops request immediately. |
| **Concurrent Duplicate Claims** | 100+ simultaneous requests | Compound unique constraints and atomic increments guarantee 1 single reward and 0 balance duplicates. |
| **Path Traversal Attack** | `../`, `..\`, `%2e%2e/` in uploads | `LocalEvidenceStorage` sanitizes paths, verifies base directory containment, and rejects with `400 Bad Request`. |
| **Executable Masquerading** | PE MZ or Linux ELF disguised as `.jpg`/`.png` | Content inspection checks magic bytes and immediately rejects upload with `400 Bad Request`. |
