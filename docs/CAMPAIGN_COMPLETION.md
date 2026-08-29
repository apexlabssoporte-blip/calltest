# CallTest V1 — Campaign Completion & Fair Replacement Recognition

## 1. Completion Workflow

```text
Campaign Active Testing (14 Days)
       ↓
Duration Reached / Developer Action
       ↓
CampaignCompletionService
       ↓
1. Validate store publication status via AppPublicationStatusService
2. Set Campaign.status = 'COMPLETED' (or 'PUBLIC' if verified)
3. Set CampaignTester.status = 'COMPLETED' for Active & Low Activity testers
4. Record AuditLog (action: CAMPAIGN_COMPLETED_OPERATIONS)
5. Emit Domain Events: 'campaign.completed', 'tester.participation_completed'
6. Dispatch In-App & Push Notifications to Developer and Testers
```

---

## 2. Fair Recognition for Replacement Testers

- **Proportionate Evaluation**: Replacement testers who joined midway through the campaign (e.g. Day 6 of 14) are evaluated strictly from their `joinedAt` timestamp onwards.
- **Zero Penalty for Pre-Join Period**: Replacement testers are **never penalized** for days elapsed prior to their assignment.
- **Participation Reward**: Upon successful completion, replacement testers receive full XP/Gold rewards and trust points proportionate to their completed missions.

---

## 3. Explicit Non-Goals in V1

- Do NOT implement "Recién lanzadas" marketplace in V1.
- Do NOT implement public app test reward systems in V1.
- Do NOT implement post-launch bounty testing in V1.
