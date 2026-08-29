import { describe, it, expect, beforeEach } from "vitest";
import { AiBudgetService } from "../src/modules/reports/ai/ai-budget.service.js";

describe("Phase 12.1: AI Budget, Cooldown, and Developer Rate Limiting", () => {
  beforeEach(() => {
    AiBudgetService.reset();
  });

  it("1. should allow consumption when within daily and monthly limits", () => {
    expect(AiBudgetService.checkConsumption().allowed).toBe(true);
    expect(AiBudgetService.canConsume()).toBe(true);
    expect(AiBudgetService.reserve("dev-1", "cluster-1")).toBe(true);
    expect(AiBudgetService.getDailyCount()).toBe(1);
    expect(AiBudgetService.getDeveloperDailyCount("dev-1")).toBe(1);
  });

  it("2. should block developer when developer daily limit is reached (20 requests/day)", () => {
    const devId = "dev-heavy-user";
    for (let i = 0; i < 20; i++) {
      expect(AiBudgetService.reserve(devId, `cluster-${i}`)).toBe(true);
    }

    const check = AiBudgetService.checkConsumption(devId, "cluster-21");
    expect(check.allowed).toBe(false);
    expect(check.reason).toBe("DEVELOPER_DAILY_LIMIT_EXCEEDED");
    expect(AiBudgetService.canConsume(devId, "cluster-21")).toBe(false);
    expect(AiBudgetService.reserve(devId, "cluster-21")).toBe(false);

    // Another developer should still be allowed
    expect(AiBudgetService.checkConsumption("dev-other", "cluster-21").allowed).toBe(true);
  });

  it("3. should enforce cluster cooldown (24h) preventing duplicate reviews", () => {
    const clusterId = "cluster-cooldown-test";
    expect(AiBudgetService.isClusterInCooldown(clusterId)).toBe(false);

    AiBudgetService.recordClusterReview(clusterId);
    expect(AiBudgetService.isClusterInCooldown(clusterId)).toBe(true);

    const check = AiBudgetService.checkConsumption("dev-1", clusterId);
    expect(check.allowed).toBe(false);
    expect(check.reason).toBe("CLUSTER_IN_COOLDOWN");
    expect(AiBudgetService.canConsume("dev-1", clusterId)).toBe(false);
  });

  it("4. should refund budget slot upon review failure or collision", () => {
    const devId = "dev-refund";
    expect(AiBudgetService.reserve(devId, "cluster-x")).toBe(true);
    expect(AiBudgetService.getDailyCount()).toBe(1);
    expect(AiBudgetService.getDeveloperDailyCount(devId)).toBe(1);

    AiBudgetService.refund(devId);
    expect(AiBudgetService.getDailyCount()).toBe(0);
    expect(AiBudgetService.getDeveloperDailyCount(devId)).toBe(0);
  });

  it("5. should block when daily limit is exhausted", () => {
    for (let i = 0; i < 100; i++) {
      expect(AiBudgetService.reserve(`dev-${i}`, `cluster-${i}`)).toBe(true);
    }

    const check = AiBudgetService.checkConsumption("dev-new", "cluster-new");
    expect(check.allowed).toBe(false);
    expect(check.reason).toBe("SYSTEM_DAILY_LIMIT_EXCEEDED");
    expect(AiBudgetService.canConsume("dev-new", "cluster-new")).toBe(false);
  });
});
