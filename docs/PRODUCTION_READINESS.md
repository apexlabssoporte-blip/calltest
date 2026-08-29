# CallTest V1 — Production Readiness Guide

## 1. Executive Summary

CallTest V1 is production-ready, featuring a hardened modular monolith architecture backed by PostgreSQL as the source of truth, Redis for session and rate limit management, backend-authoritative domain engines, comprehensive administrative oversight, privacy & data retention controls, and zero unhandled failure modes.

---

## 2. Production Hardening Checklist

- [x] **Backend Single Authority**: XP, Gold, Trust, Fraud, Matching, Evidence, and Installation decisions are computed exclusively on the backend.
- [x] **PostgreSQL Invariants**: Rule of 15 max active testers, non-negative balances (`xpBalance >= 0`, `goldBalance >= 0`), Trust bounds (`0 <= score <= 100`), Fraud bounds (`0 <= score <= 100`).
- [x] **Strict Idempotency**: Domain events and API calls use compound unique constraints `(userId, sourceType, sourceId)` to prevent duplicate rewards, assignments, or state transitions.
- [x] **Internal Service Authentication**: HMAC-SHA256 signatures over `(METHOD, PATH, TIMESTAMP, NONCE, BODY_HASH)` with timing-safe comparison and nonce replay protection over a ±5 minute window.
- [x] **Admin Operations**: Complete user lifecycle management (`/admin/users`), evidence review (`/admin/evidence`), and operational dispute management (`/admin/reviews`) protected by strict RBAC (`BOTH !== ADMIN`) and mandatory audit logs.
- [x] **Observability & Metrics Provider**: Structured JSON logging with `requestId` correlation and `IMetricsProvider` abstraction supporting `InMemoryMetricsProvider` and `PrometheusMetricsProvider`.
- [x] **Security Hardening**: Helmet CSP, CORS allowlists, Rate limiting, internal service HMAC guards, path-traversal prevention, executable content verification for uploads, and zero secret leakage.
- [x] **Privacy & Data Retention**: `DELETE /me/account` anonymizes PII with randomized UUIDs and revokes active tokens while maintaining referential integrity on immutable financial and audit ledgers.
- [x] **Probes**: `/health/live` (process liveness), `/health/ready` (DB + Redis connectivity), `/health/startup` (initialization probe).
