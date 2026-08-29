import crypto from "node:crypto";
import { UserRole, UserStatus } from "@calltest/shared-types";

export interface AuthJwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  iat?: number;
  exp?: number;
}

export class TokenService {
  /**
   * Generates a cryptographically secure random refresh token string.
   */
  public static generateRefreshToken(): string {
    return crypto.randomBytes(48).toString("base64url");
  }

  /**
   * Hashes a refresh token using SHA-256 for secure database storage.
   */
  public static hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  /**
   * Calculates the refresh token expiration date (default 7 days).
   */
  public static getRefreshTokenExpiresAt(days = 7): DateTime {
    const expires = new Date();
    expires.setDate(expires.getDate() + days);
    return expires;
  }
}

type DateTime = Date;
