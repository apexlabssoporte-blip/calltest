export interface MetricsSnapshot {
  http: {
    requestsTotal: number;
    errorsTotal: number;
    durationMsTotal: number;
    averageDurationMs: number;
  };
  auth: {
    loginSuccess: number;
    loginFailure: number;
    refreshSuccess: number;
    refreshReuseDetected: number;
  };
  campaigns: {
    campaignsActive: number;
    activeTesters: number;
    replacementRequests: number;
    campaignsCompleted: number;
  };
  matching: {
    matchingAttempts: number;
    assignmentsSuccess: number;
    assignmentsRejected: number;
    matchingDurationMsTotal: number;
  };
  missions: {
    missionsStarted: number;
    missionsCompleted: number;
    missionsRejected: number;
  };
  evidence: {
    evidenceUploaded: number;
    evidencePending: number;
    evidenceApproved: number;
    evidenceRejected: number;
  };
  rewards: {
    rewardsCreated: number;
    rewardsApproved: number;
    rewardsRejected: number;
    duplicateRewardAttempts: number;
  };
  fraud: {
    fraudFlags: number;
    fraudRestrictions: number;
    fraudSuspensions: number;
  };
  reports: {
    reportsSubmitted: number;
    reportsValidated: number;
    reportsRejected: number;
    reportsEscalated: number;
    reportClustersCreated: number;
    reportClustersMerged: number;
  };
  aiReviews: {
    aiReviewsRequested: number;
    aiReviewsCompleted: number;
    aiReviewsFailed: number;
    aiReviewsSkipped: number;
    aiReviewsRateLimited: number;
    aiBudgetExhausted: number;
    aiLatencyMsTotal: number;
    averageAiLatencyMs: number;
    aiEscalationTotal: number;
    aiEscalationHumanReview: number;
    aiEscalationCollectMoreEvidence: number;
    aiEscalationCandidate: number;
    aiEscalationExecuted: number;
    aiRequestsDeduplicated: number;
    aiRequestsCooldown: number;
    aiRequestsTimeout: number;
  };
}

/**
 * Common abstraction for metrics collection providers (In-Memory, Prometheus, OpenTelemetry).
 */
export interface IMetricsProvider {
  recordHttpRequest(durationMs: number, isError?: boolean): void;
  recordAuthEvent(type: "login_success" | "login_failure" | "refresh_success" | "refresh_reuse_detected"): void;
  recordCampaignEvent(type: "created" | "completed" | "tester_joined" | "replacement_requested"): void;
  recordMatchingAttempt(durationMs: number, successCount: number, rejectedCount: number): void;
  recordMissionEvent(type: "started" | "completed" | "rejected"): void;
  recordEvidenceEvent(type: "uploaded" | "approved" | "rejected"): void;
  recordRewardEvent(type: "created" | "approved" | "rejected" | "duplicate_prevented"): void;
  recordFraudEvent(type: "flag_created" | "user_restricted" | "user_suspended"): void;
  recordReportEvent(type: "submitted" | "validated" | "rejected" | "escalated" | "cluster_created" | "cluster_merged"): void;
  recordAiReviewEvent(type: "requested" | "completed" | "failed" | "skipped" | "rate_limited" | "budget_exhausted" | "timeout" | "deduplicated" | "cooldown" | "sanitization_rejected", latencyMs?: number): void;
  recordAiEscalation(decision: "human_review" | "collect_more_evidence" | "candidate" | "executed"): void;
  getSnapshot(): MetricsSnapshot;
  reset(): void;
}
