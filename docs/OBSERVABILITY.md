# CallTest V1 — Observability, Structured Logging & Metrics

## 1. Structured Logging

Every incoming HTTP request is assigned a unique `requestId` (correlated via incoming `x-request-id` header or generated server-side).

Logs are emitted in structured JSON format containing:
- `reqId`: Correlation ID.
- `req.method`: HTTP method.
- `req.url`: Request URL path.
- `res.statusCode`: HTTP response status code.
- `responseTime`: Request latency in milliseconds.
- *Redaction*: Passwords, JWT secrets, refresh tokens, and PII are strictly excluded from logs.

---

## 2. Telemetry & Metrics Provider Abstraction

The telemetry subsystem uses the `IMetricsProvider` abstraction, decoupling business domain engines from underlying telemetry storage engines.

> **Operational Note**: In-memory metrics are suitable for development/testing and single-instance operation, but are not durable distributed production telemetry.

### Provider Implementations:
1. **`InMemoryMetricsProvider`**: Atomic, zero-dependency, in-memory counter and histogram tracker for development, local operation, and isolated test suites.
2. **`PrometheusMetricsProvider`**: OpenTelemetry / Prometheus compatible interface stub prepared for multi-node Kubernetes deployments with Prometheus pull scrapers or OTLP push exporters.

### Core Metrics Tracked:
1. **HTTP**: `requestsTotal`, `errorsTotal`, `durationMsTotal`, `averageDurationMs`.
2. **Auth**: `loginSuccess`, `loginFailure`, `refreshSuccess`, `refreshReuseDetected`.
3. **Campaigns**: `campaignsActive`, `activeTesters`, `replacementRequests`, `campaignsCompleted`.
4. **Matching**: `matchingAttempts`, `assignmentsSuccess`, `assignmentsRejected`, `matchingDurationMsTotal`.
5. **Missions**: `missionsStarted`, `missionsCompleted`, `missionsRejected`.
6. **Evidence**: `evidenceUploaded`, `evidencePending`, `evidenceApproved`, `evidenceRejected`.
7. **Rewards**: `rewardsCreated`, `rewardsApproved`, `rewardsRejected`, `duplicateRewardAttempts`.
8. **Fraud**: `fraudFlags`, `fraudRestrictions`, `fraudSuspensions`.

---

## 3. Health & Startup Probes

- `/health/live`: Lightweight process health check for container orchestrators (Kubernetes / Docker).
- `/health/ready`: Validates active PostgreSQL and Redis connection pings.
- `/health/startup`: Verifies completion of application bootstrap and returns server uptime.
