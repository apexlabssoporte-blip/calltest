# CallTest V1 — Disaster Recovery & Backup Plan

## 1. Overview & Service Objectives

- **RPO (Recovery Point Objective)**: <= 1 hour for relational database records.
- **RTO (Recovery Time Objective)**: <= 30 minutes for full platform restoration.

---

## 2. PostgreSQL Backup & Restore

### Backup Schedule
- **Daily Full Snapshot**: Executed daily at 02:00 UTC via `pg_dump`.
- **Continuous WAL Archiving**: Point-in-time recovery (PITR) to cloud object storage.

### Backup Command
```bash
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME -F c -b -v -f /backups/calltest_$(date +%Y%m%d_%H%M%S).dump
```

### Restore Command
```bash
pg_restore -h $DB_HOST -U $DB_USER -d $DB_NAME -v -c /backups/calltest_TARGET.dump
```

---

## 3. Redis Disaster Recovery

Redis operates as an ephemeral cache and session tracking layer:
- In the event of total Redis loss, PostgreSQL remains the persistent source of truth.
- Rate limiting and cache counters reset without corrupting user balances or domain records.

---

## 4. Evidence Storage Recovery

Evidence files stored locally or in S3-compatible object storage maintain deterministic content addressing via SHA-256 hashes recorded in the `mission_evidences` table.
