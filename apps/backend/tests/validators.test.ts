import { describe, it, expect } from "vitest";
import { isValidAndroidPackageName } from "../src/modules/apps/validators.js";
import { loadEnv } from "../src/core/config/env.js";

describe("isValidAndroidPackageName", () => {
  it("should accept valid standard Android package names", () => {
    expect(isValidAndroidPackageName("com.example.app")).toBe(true);
    expect(isValidAndroidPackageName("com.calltest.tester")).toBe(true);
    expect(isValidAndroidPackageName("org.company.sub_module.app123")).toBe(true);
    expect(isValidAndroidPackageName("a.b")).toBe(true);
  });

  it("should reject invalid Android package names", () => {
    expect(isValidAndroidPackageName("")).toBe(false);
    expect(isValidAndroidPackageName("singlepart")).toBe(false);
    expect(isValidAndroidPackageName("123.com.example")).toBe(false); // starts with digit
    expect(isValidAndroidPackageName("com.example..app")).toBe(false); // double dot
    expect(isValidAndroidPackageName("com.example.app.")).toBe(false); // ends with dot
    expect(isValidAndroidPackageName(".com.example.app")).toBe(false); // starts with dot
    expect(isValidAndroidPackageName("com.example.app-name")).toBe(false); // contains hyphen
    expect(isValidAndroidPackageName("com.example.app$name")).toBe(false); // invalid symbol
  });
});

describe("Env Configuration Validation", () => {
  it("should pass with valid default domain configs", () => {
    const config = loadEnv();
    expect(config.CAMPAIGN_TARGET_TESTERS).toBe(12);
    expect(config.CAMPAIGN_MAX_TESTERS).toBe(15);
    expect(config.CAMPAIGN_DURATION_DAYS).toBe(14);
    expect(config.CAMPAIGN_MAX_TESTERS).toBeGreaterThanOrEqual(config.CAMPAIGN_TARGET_TESTERS);
  });

  it("should throw error if MAX < TARGET", () => {
    process.env.CAMPAIGN_TARGET_TESTERS = "20";
    process.env.CAMPAIGN_MAX_TESTERS = "10";

    expect(() => loadEnv()).toThrow("CAMPAIGN_MAX_TESTERS (10) must be greater than or equal to CAMPAIGN_TARGET_TESTERS (20)");

    delete process.env.CAMPAIGN_TARGET_TESTERS;
    delete process.env.CAMPAIGN_MAX_TESTERS;
  });

  it("should throw error if TARGET <= 0", () => {
    process.env.CAMPAIGN_TARGET_TESTERS = "0";

    expect(() => loadEnv()).toThrow("CAMPAIGN_TARGET_TESTERS (0) must be greater than 0");

    delete process.env.CAMPAIGN_TARGET_TESTERS;
  });
});
