import { describe, it, expect, beforeEach } from "vitest";
import { MetricsService } from "../src/core/metrics/metrics-service.js";
import { InMemoryMetricsProvider } from "../src/core/metrics/in-memory-metrics-provider.js";
import { PrometheusMetricsProvider } from "../src/core/metrics/prometheus-metrics-provider.js";

describe("Phase 11.1: Metrics Abstraction, Providers & Concurrency", () => {
  beforeEach(() => {
    MetricsService.setProvider(new InMemoryMetricsProvider());
    MetricsService.reset();
  });

  describe("1. Metric Provider Switching & Lifecycle", () => {
    it("should support switching to Prometheus provider seamlessly", () => {
      const promProvider = new PrometheusMetricsProvider();
      MetricsService.setProvider(promProvider);

      MetricsService.recordHttpRequest(45, false);
      MetricsService.recordAuthEvent("login_success");

      const snapshot = MetricsService.getSnapshot();
      expect(snapshot.http.requestsTotal).toBe(1);
      expect(snapshot.auth.loginSuccess).toBe(1);
    });

    it("should reset counters cleanly", () => {
      MetricsService.recordHttpRequest(100, true);
      MetricsService.recordRewardEvent("created");

      expect(MetricsService.getSnapshot().http.requestsTotal).toBe(1);
      MetricsService.reset();
      expect(MetricsService.getSnapshot().http.requestsTotal).toBe(0);
      expect(MetricsService.getSnapshot().rewards.rewardsCreated).toBe(0);
    });
  });

  describe("2. High Concurrency Metric Recording", () => {
    it("should accurately handle 1000 concurrent atomic increments", async () => {
      const incrementPromises = Array.from({ length: 1000 }, async () => {
        MetricsService.recordHttpRequest(10, false);
      });

      await Promise.all(incrementPromises);

      const snapshot = MetricsService.getSnapshot();
      expect(snapshot.http.requestsTotal).toBe(1000);
      expect(snapshot.http.durationMsTotal).toBe(10000);
      expect(snapshot.http.averageDurationMs).toBe(10);
    });

    it("should handle 100 concurrent multi-domain events deterministically", async () => {
      const promises = Array.from({ length: 100 }, async () => {
        MetricsService.recordCampaignEvent("created");
        MetricsService.recordCampaignEvent("tester_joined");
        MetricsService.recordMatchingAttempt(50, 2, 1);
        MetricsService.recordMissionEvent("completed");
        MetricsService.recordEvidenceEvent("uploaded");
        MetricsService.recordRewardEvent("approved");
        MetricsService.recordFraudEvent("flag_created");
      });

      await Promise.all(promises);

      const snapshot = MetricsService.getSnapshot();
      expect(snapshot.campaigns.campaignsActive).toBe(100);
      expect(snapshot.campaigns.activeTesters).toBe(100);
      expect(snapshot.matching.matchingAttempts).toBe(100);
      expect(snapshot.matching.assignmentsSuccess).toBe(200);
      expect(snapshot.matching.assignmentsRejected).toBe(100);
      expect(snapshot.missions.missionsCompleted).toBe(100);
      expect(snapshot.evidence.evidenceUploaded).toBe(100);
      expect(snapshot.rewards.rewardsApproved).toBe(100);
      expect(snapshot.fraud.fraudFlags).toBe(100);
    });
  });

  describe("3. Data Hygiene & Security Validation", () => {
    it("should never expose PII, tokens, passwords, or secrets in metrics snapshot", () => {
      MetricsService.recordHttpRequest(20, false);
      MetricsService.recordAuthEvent("login_failure");

      const snapshot = MetricsService.getSnapshot();
      const serialized = JSON.stringify(snapshot).toLowerCase();

      expect(serialized).not.toContain("password");
      expect(serialized).not.toContain("token");
      expect(serialized).not.toContain("secret");
      expect(serialized).not.toContain("email");
      expect(serialized).not.toContain("bearer");
    });
  });
});
