# CallTest V1 — Admin Operations Guide

## 1. Overview & Authentication

All administrative operations reside under `/admin/*` and require:
- A valid JWT token with `role: "ADMIN"`.
- Audit logging (`audit_logs` table) for all mutating operations.
- Domain event dispatching for downstream notification and telemetry.

---

## 2. Admin User Management

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/admin/users` | Search and filter users by `status`, `role`, and query string. |
| `GET` | `/admin/users/:id` | Retrieve comprehensive user profile, trust rank, active campaigns count, and recent audit logs. |
| `POST` | `/admin/users/:id/suspend` | Suspend user account with mandatory reason. |
| `POST` | `/admin/users/:id/unsuspend` | Unsuspend user and restore to `ACTIVE` status. |
| `POST` | `/admin/users/:id/ban` | Permanently ban user account with mandatory reason. |
| `POST` | `/admin/users/:id/unban` | Unban user account and restore to `ACTIVE` status. |

---

## 3. Admin Evidence Review

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/admin/evidence/pending` | List all evidence submissions across campaigns in `PENDING_REVIEW` status. |
| `POST` | `/admin/evidence/:id/approve` | Approve mission screenshot with elevated admin privileges. |
| `POST` | `/admin/evidence/:id/reject` | Reject mission screenshot with mandatory reason and optional developer comment. |

---

## 4. Operational Dispute Reviews

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/admin/reviews` | Create operational dispute ticket (`OPEN`). |
| `GET` | `/admin/reviews/:id` | Get dispute details and status history. |
| `PATCH` | `/admin/reviews/:id` | Transition dispute to `UNDER_REVIEW`, `RESOLVED`, or `REJECTED` with resolution note. |
