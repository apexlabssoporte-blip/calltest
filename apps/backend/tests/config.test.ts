import { describe, it, expect } from "vitest";
import { loadEnv } from "../src/core/config/env.js";

describe("Core Config / Env", () => {
  it("should load default configuration values correctly", () => {
    const config = loadEnv();
    expect(config.CAMPAIGN_TARGET_TESTERS).toBe(12);
    expect(config.CAMPAIGN_MAX_TESTERS).toBe(15);
    expect(config.CAMPAIGN_DURATION_DAYS).toBe(14);
    expect(config.PORT).toBeGreaterThan(0);
    expect(config.JWT_SECRET).toBeDefined();
  });

  it("should respect environment variable overrides", () => {
    process.env.CAMPAIGN_TARGET_TESTERS = "10";
    process.env.CAMPAIGN_MAX_TESTERS = "20";
    const config = loadEnv();
    expect(config.CAMPAIGN_TARGET_TESTERS).toBe(10);
    expect(config.CAMPAIGN_MAX_TESTERS).toBe(20);

    // Reset
    delete process.env.CAMPAIGN_TARGET_TESTERS;
    delete process.env.CAMPAIGN_MAX_TESTERS;
  });
});
