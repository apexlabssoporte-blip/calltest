import { describe, it, expect } from "vitest";
import { GoogleGroupValidationService } from "../src/modules/campaigns/validation/google-group-validation.service.js";
import { PlayStoreValidationService } from "../src/modules/campaigns/validation/play-store-validation.service.js";
import {
  GoogleGroupValidationStatus,
  PlayStoreValidationStatus,
} from "@calltest/shared-types";
import { SsrfGuard } from "../src/core/security/ssrf-guard.js";

describe("Store & Group Validation Services with SSRF Protections", () => {
  describe("SSRF Guard Utility", () => {
    it("should block loopback and localhost addresses", () => {
      expect(SsrfGuard.isSafeUrl("http://localhost:3000/api").isSafe).toBe(false);
      expect(SsrfGuard.isSafeUrl("http://127.0.0.1:8080/test").isSafe).toBe(false);
      expect(SsrfGuard.isSafeUrl("http://127.0.0.5/test").isSafe).toBe(false);
    });

    it("should block cloud metadata and link-local addresses", () => {
      expect(SsrfGuard.isSafeUrl("http://169.254.169.254/latest/meta-data").isSafe).toBe(false);
      expect(SsrfGuard.isSafeUrl("http://metadata.google.internal/computeMetadata/v1").isSafe).toBe(false);
    });

    it("should block private RFC 1918 IPv4 ranges", () => {
      expect(SsrfGuard.isSafeUrl("http://10.0.0.1/admin").isSafe).toBe(false);
      expect(SsrfGuard.isSafeUrl("http://172.16.0.1/status").isSafe).toBe(false);
      expect(SsrfGuard.isSafeUrl("http://192.168.1.1/config").isSafe).toBe(false);
    });

    it("should allow safe external HTTPS domains within allowlist", () => {
      const result = SsrfGuard.isSafeUrl("https://play.google.com/store/apps/details?id=com.app", [
        "play.google.com",
      ]);
      expect(result.isSafe).toBe(true);
      expect(result.parsedUrl?.hostname).toBe("play.google.com");
    });
  });

  describe("GoogleGroupValidationService", () => {
    it("should validate a correct Google Group URL", async () => {
      const result = await GoogleGroupValidationService.validateGoogleGroup(
        "https://groups.google.com/g/calltest-testers-group",
      );

      expect(result.valid).toBe(true);
      expect(result.reachable).toBe(true);
      expect(result.status).toBe(GoogleGroupValidationStatus.ACCESSIBLE);
    });

    it("should reject malicious or internal URLs (SSRF Attack Prevention)", async () => {
      const result = await GoogleGroupValidationService.validateGoogleGroup(
        "http://127.0.0.1:8080/g/my-group",
      );

      expect(result.valid).toBe(false);
      expect(result.status).toBe(GoogleGroupValidationStatus.INVALID_URL);
    });

    it("should reject empty or invalid format URLs", async () => {
      const emptyRes = await GoogleGroupValidationService.validateGoogleGroup("");
      expect(emptyRes.valid).toBe(false);

      const invalidDomain = await GoogleGroupValidationService.validateGoogleGroup(
        "https://evil.com/g/my-group",
      );
      expect(invalidDomain.valid).toBe(false);
    });
  });

  describe("PlayStoreValidationService", () => {
    it("should validate closed testing track URL with matching package name", async () => {
      const result = await PlayStoreValidationService.validatePlayStoreUrl(
        "https://play.google.com/apps/testing/com.calltest.beta?id=com.calltest.beta",
        "com.calltest.beta",
      );

      expect(result.validUrl).toBe(true);
      expect(result.packageMatches).toBe(true);
      expect(result.packageName).toBe("com.calltest.beta");
      expect(result.status).toBe(PlayStoreValidationStatus.TESTING);
    });

    it("should detect package name mismatch", async () => {
      const result = await PlayStoreValidationService.validatePlayStoreUrl(
        "https://play.google.com/store/apps/details?id=com.other.app",
        "com.calltest.expected",
      );

      expect(result.validUrl).toBe(true);
      expect(result.packageMatches).toBe(false);
      expect(result.errorCode).toBe("PACKAGE_MISMATCH");
    });

    it("should reject internal or SSRF targeting Play Store URLs", async () => {
      const result = await PlayStoreValidationService.validatePlayStoreUrl(
        "http://169.254.169.254/apps/details?id=com.test",
        "com.test",
      );

      expect(result.validUrl).toBe(false);
      expect(result.status).toBe(PlayStoreValidationStatus.ERROR);
    });
  });
});
