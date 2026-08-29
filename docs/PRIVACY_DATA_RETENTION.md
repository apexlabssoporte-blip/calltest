# CallTest V1 — Privacy & Data Retention Controls

## 1. Principles & Architectural Controls

CallTest V1 implements strict **Privacy & Data Retention Controls** designed to protect user personal data, prevent unauthorized data exposure, and preserve immutable audit and financial ledger integrity.

---

## 2. Account Deletion Workflow (`DELETE /me/account`)

When a user triggers account deletion:
1. **Randomized Anonymization**: `email` is replaced with `deleted_<random-uuid>@calltest.anonymized` (avoiding dictionary-reversible hashes), `displayName` is replaced with `"Deleted User"`, `name` is cleared, and `passwordHash` is overwritten with `"ANONYMIZED_DELETED_ACCOUNT"`.
2. **Status Mutation**: `User.status` is set to `DELETED`.
3. **Session & Refresh Token Revocation**: All active refresh tokens are immediately revoked (`revokedAt = now`).
4. **Push Token Cleansing**: Push tokens in `device_push_tokens` are deleted.
5. **Re-authentication Block**: Subsequent login attempts and token refresh requests are rejected (`401 Unauthorized` / `403 Forbidden`).
6. **Ledger Referential Integrity**: Records in `rewards`, `audit_logs`, `trust_histories`, and `fraud_events` are preserved to guarantee virtual currency accounting and security auditability without retaining personal identifiable information.

---

## 3. Data Retention Periods

| Category | Retention Period | Justification |
| :--- | :--- | :--- |
| Personal Identifiers (PII) | Active account lifetime | Authentication and direct service notifications. |
| Audit Logs | 7 years | Security investigations and regulatory auditing. |
| Reward Ledgers | 7 years | Virtual currency accounting and fraud reconciliation. |
| Evidence Screenshots | Campaign lifetime + 90 days | Verification and dispute review. |
| Session & Refresh Tokens | 7 days | Ephemeral token lifecycle. |
