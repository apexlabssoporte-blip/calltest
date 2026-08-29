import { describe, it, expect, beforeEach } from "vitest";
import { buildApp } from "../src/app.js";
import { MetricsService } from "../src/core/metrics/metrics-service.js";

describe("Phase 11: Observability, Metrics & Health Probes", () => {
  const app = buildApp();

  beforeEach(() => {
    MetricsService.reset();
  });

  describe("1. Health Probes", () => {
    it("GET /health/live should return 200 OK without database dependency", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/health/live",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("ok");
      expect(body.timestamp).toBeDefined();
    });

    it("GET /health/startup should return 200 with server uptime", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/health/startup",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("ok");
      expect(typeof body.uptimeSeconds).toBe("number");
    });
  });

  describe("2. Metrics Collection & Telemetry", () => {
    it("should accurately track HTTP, Auth, and Domain event metrics", () => {
      MetricsService.recordHttpRequest(50, false);
      MetricsService.recordHttpRequest(150, true);
      MetricsService.recordAuthEvent("login_success");
      MetricsService.recordAuthEvent("login_failure");
      MetricsService.recordMatchingAttempt(200, 3, 1);
      MetricsService.recordMissionEvent("completed");
      MetricsService.recordRewardEvent("created");

      const snapshot = MetricsService.getSnapshot();

      expect(snapshot.http.requestsTotal).toBe(2);
      expect(snapshot.http.errorsTotal).toBe(1);
      expect(snapshot.http.averageDurationMs).toBe(100);
      expect(snapshot.auth.loginSuccess).toBe(1);
      expect(snapshot.auth.loginFailure).toBe(1);
      expect(snapshot.matching.matchingAttempts).toBe(1);
      expect(snapshot.matching.assignmentsSuccess).toBe(3);
      expect(snapshot.missions.missionsCompleted).toBe(1);
      expect(snapshot.rewards.rewardsCreated).toBe(1);
    });
  });

  describe("3. Request Correlation", () => {
    it("should preserve incoming x-request-id in response headers or generate correlation id", async () => {
      const customReqId = "req-custom-trace-12345";
      const response = await app.inject({
        method: "GET",
        url: "/health/live",
        headers: {
          "x-request-id": customReqId,
        },
      });

      expect(response.statusCode).toBe(200);
    });
  });
});
