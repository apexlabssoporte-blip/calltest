import { IMetricsProvider, MetricsSnapshot } from "./metrics-provider.interface.js";

/**
 * In-memory metrics provider for local development, integration tests, and single-node setups.
 * Note: In-memory metrics are suitable for development/testing and single-instance operation,
 * but are not durable distributed production telemetry.
 */
export class InMemoryMetricsProvider implements IMetricsProvider {
  private counters = {
    http: {
      requestsTotal: 0,
      errorsTotal: 0,
      durationMsTotal: 0,
    },
    auth: {
      loginSuccess: 0,
      loginFailure: 0,
      refreshSuccess: 0,
      refreshReuseDetected: 0,
    },
    campaigns: {
      campaignsActive: 0,
      activeTesters: 0,
      replacementRequests: 0,
      campaignsCompleted: 0,
    },
    matching: {
      matchingAttempts: 0,
      assignmentsSuccess: 0,
      assignmentsRejected: 0,
      matchingDurationMsTotal: 0,
    },
    missions: {
      missionsStarted: 0,
      missionsCompleted: 0,
      missionsRejected: 0,
    },
    evidence: {
      evidenceUploaded: 0,
      evidencePending: 0,
      evidenceApproved: 0,
      evidenceRejected: 0,
    },
    rewards: {
      rewardsCreated: 0,
      rewardsApproved: 0,
      rewardsRejected: 0,
      duplicateRewardAttempts: 0,
    },
    fraud: {
      fraudFlags: 0,
      fraudRestrictions: 0,
      fraudSuspensions: 0,
    },
    reports: {
      reportsSubmitted: 0,
      reportsValidated: 0,
      reportsRejected: 0,
      reportsEscalated: 0,
      reportClustersCreated: 0,
      reportClustersMerged: 0,
    },
    aiReviews: {
      aiReviewsRequested: 0,
      aiReviewsCompleted: 0,
      aiReviewsFailed: 0,
      aiReviewsSkipped: 0,
      aiReviewsRateLimited: 0,
      aiBudgetExhausted: 0,
      aiLatencyMsTotal: 0,
      aiEscalationTotal: 0,
      aiEscalationHumanReview: 0,
      aiEscalationCollectMoreEvidence: 0,
      aiEscalationCandidate: 0,
      aiEscalationExecuted: 0,
      aiRequestsDeduplicated: 0,
      aiRequestsCooldown: 0,
      aiRequestsTimeout: 0,
    },
  };

  public recordHttpRequest(durationMs: number, isError = false): void {
    this.counters.http.requestsTotal++;
    this.counters.http.durationMsTotal += durationMs;
    if (isError) {
      this.counters.http.errorsTotal++;
    }
  }

  public recordAuthEvent(type: "login_success" | "login_failure" | "refresh_success" | "refresh_reuse_detected"): void {
    switch (type) {
      case "login_success":
        this.counters.auth.loginSuccess++;
        break;
      case "login_failure":
        this.counters.auth.loginFailure++;
        break;
      case "refresh_success":
        this.counters.auth.refreshSuccess++;
        break;
      case "refresh_reuse_detected":
        this.counters.auth.refreshReuseDetected++;
        break;
    }
  }

  public recordCampaignEvent(type: "created" | "completed" | "tester_joined" | "replacement_requested"): void {
    switch (type) {
      case "created":
        this.counters.campaigns.campaignsActive++;
        break;
      case "completed":
        this.counters.campaigns.campaignsCompleted++;
        if (this.counters.campaigns.campaignsActive > 0) {
          this.counters.campaigns.campaignsActive--;
        }
        break;
      case "tester_joined":
        this.counters.campaigns.activeTesters++;
        break;
      case "replacement_requested":
        this.counters.campaigns.replacementRequests++;
        break;
    }
  }

  public recordMatchingAttempt(durationMs: number, successCount: number, rejectedCount: number): void {
    this.counters.matching.matchingAttempts++;
    this.counters.matching.matchingDurationMsTotal += durationMs;
    this.counters.matching.assignmentsSuccess += successCount;
    this.counters.matching.assignmentsRejected += rejectedCount;
  }

  public recordMissionEvent(type: "started" | "completed" | "rejected"): void {
    switch (type) {
      case "started":
        this.counters.missions.missionsStarted++;
        break;
      case "completed":
        this.counters.missions.missionsCompleted++;
        break;
      case "rejected":
        this.counters.missions.missionsRejected++;
        break;
    }
  }

  public recordEvidenceEvent(type: "uploaded" | "approved" | "rejected"): void {
    switch (type) {
      case "uploaded":
        this.counters.evidence.evidenceUploaded++;
        this.counters.evidence.evidencePending++;
        break;
      case "approved":
        this.counters.evidence.evidenceApproved++;
        if (this.counters.evidence.evidencePending > 0) {
          this.counters.evidence.evidencePending--;
        }
        break;
      case "rejected":
        this.counters.evidence.evidenceRejected++;
        if (this.counters.evidence.evidencePending > 0) {
          this.counters.evidence.evidencePending--;
        }
        break;
    }
  }

  public recordRewardEvent(type: "created" | "approved" | "rejected" | "duplicate_prevented"): void {
    switch (type) {
      case "created":
        this.counters.rewards.rewardsCreated++;
        break;
      case "approved":
        this.counters.rewards.rewardsApproved++;
        break;
      case "rejected":
        this.counters.rewards.rewardsRejected++;
        break;
      case "duplicate_prevented":
        this.counters.rewards.duplicateRewardAttempts++;
        break;
    }
  }

  public recordFraudEvent(type: "flag_created" | "user_restricted" | "user_suspended"): void {
    switch (type) {
      case "flag_created":
        this.counters.fraud.fraudFlags++;
        break;
      case "user_restricted":
        this.counters.fraud.fraudRestrictions++;
        break;
      case "user_suspended":
        this.counters.fraud.fraudSuspensions++;
        break;
    }
  }

  public recordReportEvent(type: "submitted" | "validated" | "rejected" | "escalated" | "cluster_created" | "cluster_merged"): void {
    switch (type) {
      case "submitted":
        this.counters.reports.reportsSubmitted++;
        break;
      case "validated":
        this.counters.reports.reportsValidated++;
        break;
      case "rejected":
        this.counters.reports.reportsRejected++;
        break;
      case "escalated":
        this.counters.reports.reportsEscalated++;
        break;
      case "cluster_created":
        this.counters.reports.reportClustersCreated++;
        break;
      case "cluster_merged":
        this.counters.reports.reportClustersMerged++;
        break;
    }
  }

  public recordAiReviewEvent(type: "requested" | "completed" | "failed" | "skipped" | "rate_limited" | "budget_exhausted" | "timeout" | "deduplicated" | "cooldown" | "sanitization_rejected", latencyMs = 0): void {
    switch (type) {
      case "requested":
        this.counters.aiReviews.aiReviewsRequested++;
        break;
      case "completed":
        this.counters.aiReviews.aiReviewsCompleted++;
        this.counters.aiReviews.aiLatencyMsTotal += latencyMs;
        break;
      case "failed":
        this.counters.aiReviews.aiReviewsFailed++;
        break;
      case "skipped":
        this.counters.aiReviews.aiReviewsSkipped++;
        break;
      case "rate_limited":
        this.counters.aiReviews.aiReviewsRateLimited++;
        break;
      case "budget_exhausted":
        this.counters.aiReviews.aiBudgetExhausted++;
        break;
      case "timeout":
        this.counters.aiReviews.aiRequestsTimeout++;
        break;
      case "deduplicated":
        this.counters.aiReviews.aiRequestsDeduplicated++;
        break;
      case "cooldown":
        this.counters.aiReviews.aiRequestsCooldown++;
        break;
    }
  }

  public recordAiEscalation(decision: "human_review" | "collect_more_evidence" | "candidate" | "executed"): void {
    this.counters.aiReviews.aiEscalationTotal++;
    switch (decision) {
      case "human_review":
        this.counters.aiReviews.aiEscalationHumanReview++;
        break;
      case "collect_more_evidence":
        this.counters.aiReviews.aiEscalationCollectMoreEvidence++;
        break;
      case "candidate":
        this.counters.aiReviews.aiEscalationCandidate++;
        break;
      case "executed":
        this.counters.aiReviews.aiEscalationExecuted++;
        break;
    }
  }

  public getSnapshot(): MetricsSnapshot {
    const avgDuration =
      this.counters.http.requestsTotal > 0
        ? this.counters.http.durationMsTotal / this.counters.http.requestsTotal
        : 0;

    const avgAiLatency =
      this.counters.aiReviews.aiReviewsCompleted > 0
        ? this.counters.aiReviews.aiLatencyMsTotal / this.counters.aiReviews.aiReviewsCompleted
        : 0;

    return {
      http: {
        requestsTotal: this.counters.http.requestsTotal,
        errorsTotal: this.counters.http.errorsTotal,
        durationMsTotal: this.counters.http.durationMsTotal,
        averageDurationMs: Math.round(avgDuration * 100) / 100,
      },
      auth: { ...this.counters.auth },
      campaigns: { ...this.counters.campaigns },
      matching: { ...this.counters.matching },
      missions: { ...this.counters.missions },
      evidence: { ...this.counters.evidence },
      rewards: { ...this.counters.rewards },
      fraud: { ...this.counters.fraud },
      reports: { ...this.counters.reports },
      aiReviews: {
        ...this.counters.aiReviews,
        averageAiLatencyMs: Math.round(avgAiLatency * 100) / 100,
      },
    };
  }

  public reset(): void {
    this.counters.http.requestsTotal = 0;
    this.counters.http.errorsTotal = 0;
    this.counters.http.durationMsTotal = 0;
    this.counters.auth.loginSuccess = 0;
    this.counters.auth.loginFailure = 0;
    this.counters.auth.refreshSuccess = 0;
    this.counters.auth.refreshReuseDetected = 0;
    this.counters.campaigns.campaignsActive = 0;
    this.counters.campaigns.activeTesters = 0;
    this.counters.campaigns.replacementRequests = 0;
    this.counters.campaigns.campaignsCompleted = 0;
    this.counters.matching.matchingAttempts = 0;
    this.counters.matching.assignmentsSuccess = 0;
    this.counters.matching.assignmentsRejected = 0;
    this.counters.matching.matchingDurationMsTotal = 0;
    this.counters.missions.missionsStarted = 0;
    this.counters.missions.missionsCompleted = 0;
    this.counters.missions.missionsRejected = 0;
    this.counters.evidence.evidenceUploaded = 0;
    this.counters.evidence.evidencePending = 0;
    this.counters.evidence.evidenceApproved = 0;
    this.counters.evidence.evidenceRejected = 0;
    this.counters.rewards.rewardsCreated = 0;
    this.counters.rewards.rewardsApproved = 0;
    this.counters.rewards.rewardsRejected = 0;
    this.counters.rewards.duplicateRewardAttempts = 0;
    this.counters.fraud.fraudFlags = 0;
    this.counters.fraud.fraudRestrictions = 0;
    this.counters.fraud.fraudSuspensions = 0;
    this.counters.reports.reportsSubmitted = 0;
    this.counters.reports.reportsValidated = 0;
    this.counters.reports.reportsRejected = 0;
    this.counters.reports.reportsEscalated = 0;
    this.counters.reports.reportClustersCreated = 0;
    this.counters.reports.reportClustersMerged = 0;
    this.counters.aiReviews.aiReviewsRequested = 0;
    this.counters.aiReviews.aiReviewsCompleted = 0;
    this.counters.aiReviews.aiReviewsFailed = 0;
    this.counters.aiReviews.aiReviewsSkipped = 0;
    this.counters.aiReviews.aiReviewsRateLimited = 0;
    this.counters.aiReviews.aiBudgetExhausted = 0;
    this.counters.aiReviews.aiLatencyMsTotal = 0;
  }
}
