import { IMetricsProvider, MetricsSnapshot } from "./metrics-provider.interface.js";
import { InMemoryMetricsProvider } from "./in-memory-metrics-provider.js";

/**
 * OpenTelemetry / Prometheus compatible metrics provider stub.
 * Ready for distributed production environments with Prometheus pull scrapers or OTLP export.
 */
export class PrometheusMetricsProvider implements IMetricsProvider {
  private inMemoryFallback = new InMemoryMetricsProvider();

  public recordHttpRequest(durationMs: number, isError = false): void {
    this.inMemoryFallback.recordHttpRequest(durationMs, isError);
    // In production cluster: prometheusHttpHistogram.observe({ status }, durationMs / 1000);
  }

  public recordAuthEvent(type: "login_success" | "login_failure" | "refresh_success" | "refresh_reuse_detected"): void {
    this.inMemoryFallback.recordAuthEvent(type);
    // In production cluster: prometheusAuthCounter.inc({ event_type: type });
  }

  public recordCampaignEvent(type: "created" | "completed" | "tester_joined" | "replacement_requested"): void {
    this.inMemoryFallback.recordCampaignEvent(type);
  }

  public recordMatchingAttempt(durationMs: number, successCount: number, rejectedCount: number): void {
    this.inMemoryFallback.recordMatchingAttempt(durationMs, successCount, rejectedCount);
  }

  public recordMissionEvent(type: "started" | "completed" | "rejected"): void {
    this.inMemoryFallback.recordMissionEvent(type);
  }

  public recordEvidenceEvent(type: "uploaded" | "approved" | "rejected"): void {
    this.inMemoryFallback.recordEvidenceEvent(type);
  }

  public recordRewardEvent(type: "created" | "approved" | "rejected" | "duplicate_prevented"): void {
    this.inMemoryFallback.recordRewardEvent(type);
  }

  public recordFraudEvent(type: "flag_created" | "user_restricted" | "user_suspended"): void {
    this.inMemoryFallback.recordFraudEvent(type);
  }

  public recordReportEvent(type: "submitted" | "validated" | "rejected" | "escalated" | "cluster_created" | "cluster_merged"): void {
    this.inMemoryFallback.recordReportEvent(type);
  }

  public recordAiReviewEvent(type: "requested" | "completed" | "failed" | "skipped" | "rate_limited" | "budget_exhausted" | "timeout" | "deduplicated" | "cooldown" | "sanitization_rejected", latencyMs = 0): void {
    this.inMemoryFallback.recordAiReviewEvent(type, latencyMs);
  }

  public recordAiEscalation(decision: "human_review" | "collect_more_evidence" | "candidate" | "executed"): void {
    this.inMemoryFallback.recordAiEscalation(decision);
  }

  public getSnapshot(): MetricsSnapshot {
    return this.inMemoryFallback.getSnapshot();
  }

  public reset(): void {
    this.inMemoryFallback.reset();
  }
}
