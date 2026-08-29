import { describe, it, expect } from "vitest";
import { PasswordHasher } from "../src/core/security/password-hasher.js";
import { TokenService } from "../src/core/security/token-service.js";

describe("PasswordHasher", () => {
  it("should hash a password with random salt and verify correctly", async () => {
    const rawPassword = "SuperSecretPassword123!";
    const hash = await PasswordHasher.hash(rawPassword);

    expect(hash).toContain(":");
    expect(hash.split(":").length).toBe(2);

    const isValid = await PasswordHasher.verify(rawPassword, hash);
    expect(isValid).toBe(true);
  });

  it("should reject an incorrect password", async () => {
    const rawPassword = "CorrectPassword123!";
    const hash = await PasswordHasher.hash(rawPassword);

    const isValid = await PasswordHasher.verify("WrongPassword123!", hash);
    expect(isValid).toBe(false);
  });

  it("should produce different hashes for the same password due to random salt", async () => {
    const rawPassword = "SamePassword123!";
    const hash1 = await PasswordHasher.hash(rawPassword);
    const hash2 = await PasswordHasher.hash(rawPassword);

    expect(hash1).not.toBe(hash2);
    expect(await PasswordHasher.verify(rawPassword, hash1)).toBe(true);
    expect(await PasswordHasher.verify(rawPassword, hash2)).toBe(true);
  });

  it("should throw when password is less than 8 characters", async () => {
    await expect(PasswordHasher.hash("short")).rejects.toThrow(
      "Password must be at least 8 characters long",
    );
  });

  it("should safely handle malformed hash strings during verification", async () => {
    expect(await PasswordHasher.verify("password", "")).toBe(false);
    expect(await PasswordHasher.verify("password", "invalidhashformat")).toBe(false);
    expect(await PasswordHasher.verify("password", "salt:invalidlength")).toBe(false);
  });
});

describe("TokenService", () => {
  it("should generate cryptographically random refresh tokens", () => {
    const token1 = TokenService.generateRefreshToken();
    const token2 = TokenService.generateRefreshToken();

    expect(token1).toBeDefined();
    expect(token1.length).toBeGreaterThan(30);
    expect(token1).not.toBe(token2);
  });

  it("should consistently hash tokens using SHA-256", () => {
    const raw = "sample_refresh_token_string";
    const hash1 = TokenService.hashToken(raw);
    const hash2 = TokenService.hashToken(raw);

    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64); // hex SHA-256 length
  });

  it("should calculate expiration date in future", () => {
    const now = new Date();
    const expiresAt = TokenService.getRefreshTokenExpiresAt(7);

    expect(expiresAt.getTime()).toBeGreaterThan(now.getTime());
    const diffDays = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    expect(Math.round(diffDays)).toBe(7);
  });
});
