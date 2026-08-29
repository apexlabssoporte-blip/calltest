import { IMetricsProvider, MetricsSnapshot } from "./metrics-provider.interface.js";
import { InMemoryMetricsProvider } from "./in-memory-metrics-provider.js";

/**
 * Service facade for telemetry and observability metrics.
 * Delegates to the configured IMetricsProvider (InMemoryMetricsProvider by default).
 */
export class MetricsService {
  private static provider: IMetricsProvider = new InMemoryMetricsProvider();

  public static setProvider(provider: IMetricsProvider): void {
    this.provider = provider;
  }

  public static getProvider(): IMetricsProvider {
    return this.provider;
  }

  public static recordHttpRequest(durationMs: number, isError = false): void {
    this.provider.recordHttpRequest(durationMs, isError);
  }

  public static recordAuthEvent(type: "login_success" | "login_failure" | "refresh_success" | "refresh_reuse_detected"): void {
    this.provider.recordAuthEvent(type);
  }

  public static recordCampaignEvent(type: "created" | "completed" | "tester_joined" | "replacement_requested"): void {
    this.provider.recordCampaignEvent(type);
  }

  public static recordMatchingAttempt(durationMs: number, successCount: number, rejectedCount: number): void {
    this.provider.recordMatchingAttempt(durationMs, successCount, rejectedCount);
  }

  public static recordMissionEvent(type: "started" | "completed" | "rejected"): void {
    this.provider.recordMissionEvent(type);
  }

  public static recordEvidenceEvent(type: "uploaded" | "approved" | "rejected"): void {
    this.provider.recordEvidenceEvent(type);
  }

  public static recordRewardEvent(type: "created" | "approved" | "rejected" | "duplicate_prevented"): void {
    this.provider.recordRewardEvent(type);
  }

  public static recordFraudEvent(type: "flag_created" | "user_restricted" | "user_suspended"): void {
    this.provider.recordFraudEvent(type);
  }

  public static recordReportEvent(type: "submitted" | "validated" | "rejected" | "escalated" | "cluster_created" | "cluster_merged"): void {
    this.provider.recordReportEvent(type);
  }

  public static recordAiReviewEvent(type: "requested" | "completed" | "failed" | "skipped" | "rate_limited" | "budget_exhausted" | "timeout" | "deduplicated" | "cooldown" | "sanitization_rejected", latencyMs = 0): void {
    this.provider.recordAiReviewEvent(type, latencyMs);
  }

  public static recordAiEscalation(decision: "human_review" | "collect_more_evidence" | "candidate" | "executed"): void {
    this.provider.recordAiEscalation(decision);
  }

  public static getSnapshot(): MetricsSnapshot {
    return this.provider.getSnapshot();
  }

  public static reset(): void {
    this.provider.reset();
  }
}
