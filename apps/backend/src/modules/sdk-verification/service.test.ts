import { beforeEach, describe, expect, it, vi } from "vitest";
import { SdkIntegrationStatus } from "@calltest/shared-types";
import { prisma } from "../../core/database/prisma.js";
import { SdkVerificationService } from "./service.js";

describe("SdkVerificationService", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("activates the SDK only after a valid key and package handshake", async () => {
    vi.spyOn(prisma.app, "findUnique").mockResolvedValue({
      id: "a0000000-0000-0000-0000-000000000001",
      packageName: "com.example.realapp",
      sdkIntegrationStatus: SdkIntegrationStatus.NOT_CONFIGURED,
      hasCallTestSdk: false,
    } as any);
    const update = vi.spyOn(prisma.app, "update").mockResolvedValue({} as any);

    const result = await SdkVerificationService.verifyHandshake({
      apiKey: "apk_123456789012345678901234",
      packageName: "com.example.realapp",
      sdkVersion: "1.0.0",
    });

    expect(result.status).toBe("CONNECTED");
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          sdkIntegrationStatus: SdkIntegrationStatus.SDK_ENABLED,
          hasCallTestSdk: true,
        },
      }),
    );
  });

  it("rejects an unknown SDK key", async () => {
    vi.spyOn(prisma.app, "findUnique").mockResolvedValue(null);

    await expect(
      SdkVerificationService.verifyHandshake({
        apiKey: "apk_invalid_1234567890123456",
        packageName: "com.example.realapp",
        sdkVersion: "1.0.0",
      }),
    ).rejects.toMatchObject({ code: "SDK_INVALID_API_KEY", statusCode: 401 });
  });

  it("rejects a key used from the wrong Android package", async () => {
    vi.spyOn(prisma.app, "findUnique").mockResolvedValue({
      id: "a0000000-0000-0000-0000-000000000001",
      packageName: "com.example.realapp",
      sdkIntegrationStatus: SdkIntegrationStatus.NOT_CONFIGURED,
      hasCallTestSdk: false,
    } as any);

    await expect(
      SdkVerificationService.verifyHandshake({
        apiKey: "apk_123456789012345678901234",
        packageName: "com.attacker.otherapp",
        sdkVersion: "1.0.0",
      }),
    ).rejects.toMatchObject({ code: "SDK_PACKAGE_MISMATCH", statusCode: 409 });
  });
});
