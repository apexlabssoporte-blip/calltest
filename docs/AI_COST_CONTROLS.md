# CallTest V1 — AI Cost Controls & Rate Limiting (Phase 12.1)

## 1. Multi-Tier Cost & Rate Limits

CallTest enforces granular controls in `AiBudgetService` to minimize LLM token consumption and prevent denial-of-service abuse:

1. **System Daily Limit (`AI_DAILY_LIMIT`)**: Default `100` reviews/day across the entire platform.
2. **System Monthly Limit (`AI_MONTHLY_LIMIT`)**: Default `2000` reviews/month.
3. **Developer Daily Rate Limit (`AI_MAX_REQUESTS_PER_DEVELOPER_PER_DAY`)**: Default `20` requests/developer/day to prevent abuse by a single tenant.
4. **Cluster Cooldown Window (`AI_CLUSTER_COOLDOWN_HOURS`)**: Default `24` hours cooldown per cluster to prevent duplicate calls.
5. **Context Window Capping**:
   - Max `10` relevant reports per cluster.
   - Max `5` evidence items per review.
   - Max `1000` characters for prompt reasoning payloads.

## 2. Deterministic Deduplication (`aiAnalysisKey`)

Before invoking Gemini, `ReportService` computes a SHA-256 fingerprint:
`aiAnalysisKey = SHA256(clusterId + ":" + clusterAlgorithmVersion + ":" + promptVersion + ":" + modelVersion + ":" + sanitizedContentHash)`

- If an identical `aiAnalysisKey` exists in the database, the cached `AiReview` is returned immediately.
- Gemini is never invoked twice for unchanged cluster content.
- If evidence or description updates significantly, a new `sanitizedContentHash` is generated, enabling an updated review.

## 3. Reservation & Refund Lifecycle

```text
Check Limits (System, Developer, Cooldown, Cache)
         │
         ├─── Not Allowed ──► Route to HUMAN_REVIEW (0 cost)
         ▼
Reserve 1 Budget Slot
         │
         ▼
Execute Gemini (5000ms timeout)
         │
         ├─── Failure / Timeout / Error ──► Refund Budget Slot ──► Route to HUMAN_REVIEW
         ▼
Persist Review & Record Cooldown Window
```
