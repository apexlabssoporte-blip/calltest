import { prisma } from "../../core/database/prisma.js";
import { PasswordHasher } from "../../core/security/password-hasher.js";
import { TokenService } from "../../core/security/token-service.js";
import { AuditService } from "../../core/services/audit-service.js";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  UnauthorizedError,
  NotFoundError,
} from "../../core/errors/app-error.js";
import { UserRole, UserStatus, AuditAction } from "@calltest/shared-types";
import { RegisterRequest, LoginRequest } from "./schemas.js";

export class AuthService {
  /**
   * Registers a new User (TESTER, DEVELOPER, or BOTH).
   * Note: ADMIN role cannot be self-assigned.
   */
  public static async register(
    data: RegisterRequest,
    context?: { ipAddress?: string; userAgent?: string },
  ) {
    if ((data.role as string) === UserRole.ADMIN) {
      throw new BadRequestError("Cannot register as ADMIN directly");
    }

    const normalizedEmail = data.email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      throw new ConflictError("A user with this email already exists");
    }

    const passwordHash = await PasswordHasher.hash(data.password);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        displayName: data.displayName.trim(),
        role: data.role,
        status: UserStatus.ACTIVE,
      },
    });

    await AuditService.log({
      userId: user.id,
      action: AuditAction.USER_REGISTERED,
      entityName: "User",
      entityId: user.id,
      changes: { email: user.email, role: user.role },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    return user;
  }

  /**
   * Authenticates a user with email and password.
   * Disallows login for SUSPENDED, BANNED, or DELETED users.
   */
  public static async login(
    data: LoginRequest,
    context?: { ipAddress?: string; userAgent?: string },
  ) {
    const normalizedEmail = data.email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const isPasswordValid = await PasswordHasher.verify(data.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedError("Invalid email or password");
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new ForbiddenError("Account is suspended. Please contact support.");
    }

    if (user.status === UserStatus.BANNED) {
      throw new ForbiddenError("Account is permanently banned.");
    }

    if (user.status === UserStatus.DELETED) {
      throw new ForbiddenError("Account has been deleted.");
    }

    const now = new Date();
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: now },
    });

    await AuditService.log({
      userId: user.id,
      action: AuditAction.LOGIN,
      entityName: "User",
      entityId: user.id,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    return user;
  }

  /**
   * Creates and stores a rotated refresh token for a user.
   */
  public static async createRefreshToken(userId: string): Promise<string> {
    const rawToken = TokenService.generateRefreshToken();
    const tokenHash = TokenService.hashToken(rawToken);
    const expiresAt = TokenService.getRefreshTokenExpiresAt(7);

    await prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    return rawToken;
  }

  /**
   * Rotates a refresh token: verifies the existing token, revokes it, and issues a new one.
   * If an already revoked token is used, detects reuse and revokes all active tokens for that user.
   */
  public static async rotateRefreshToken(
    rawToken: string,
    context?: { ipAddress?: string; userAgent?: string },
  ) {
    const tokenHash = TokenService.hashToken(rawToken);

    const storedToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!storedToken) {
      throw new UnauthorizedError("Invalid refresh token");
    }

    // Reuse detection: If token was already revoked, someone may have stolen it
    if (storedToken.revokedAt !== null) {
      // Revoke all tokens for this user as a security measure
      await prisma.refreshToken.updateMany({
        where: { userId: storedToken.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      await AuditService.log({
        userId: storedToken.userId,
        action: AuditAction.REFRESH_TOKEN_REVOKED,
        entityName: "RefreshToken",
        entityId: storedToken.id,
        changes: { reason: "REUSE_DETECTED" },
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      });

      throw new UnauthorizedError("Revoked refresh token reuse detected. All sessions revoked.");
    }

    // Check expiration
    if (new Date() > storedToken.expiresAt) {
      throw new UnauthorizedError("Refresh token has expired");
    }

    // Check user status
    const user = storedToken.user;
    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenError(`User account is ${user.status.toLowerCase()}`);
    }

    // Generate new refresh token
    const newRawToken = TokenService.generateRefreshToken();
    const newTokenHash = TokenService.hashToken(newRawToken);
    const expiresAt = TokenService.getRefreshTokenExpiresAt(7);

    const newToken = await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: newTokenHash,
        expiresAt,
      },
    });

    // Mark previous token as replaced & revoked
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: {
        revokedAt: new Date(),
        replacedByTokenId: newToken.id,
      },
    });

    return {
      user,
      newRefreshToken: newRawToken,
    };
  }

  /**
   * Revokes a refresh token on logout.
   */
  public static async logout(
    rawToken?: string,
    userId?: string,
    context?: { ipAddress?: string; userAgent?: string },
  ) {
    if (rawToken) {
      const tokenHash = TokenService.hashToken(rawToken);
      const stored = await prisma.refreshToken.findUnique({
        where: { tokenHash },
      });

      if (stored && stored.revokedAt === null) {
        await prisma.refreshToken.update({
          where: { id: stored.id },
          data: { revokedAt: new Date() },
        });
      }
    }

    if (userId) {
      await AuditService.log({
        userId,
        action: AuditAction.LOGOUT,
        entityName: "User",
        entityId: userId,
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      });
    }
  }

  /**
   * Retrieves profile of current user.
   */
  public static async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.status === UserStatus.DELETED) {
      throw new NotFoundError("User not found");
    }

    return user;
  }

  /**
   * Deletes and anonymizes a user account while preserving referential integrity on audit and financial ledgers.
   */
  public static async deleteAccount(
    userId: string,
    context?: { reason?: string; ipAddress?: string; userAgent?: string },
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    if (user.status === UserStatus.DELETED) {
      return {
        message: "Account is already deleted and anonymized",
      };
    }

    const randomId = crypto.randomUUID();
    const anonymizedEmail = `deleted_${randomId}@calltest.anonymized`;

    // 1. Anonymize user PII and mark status DELETED
    await prisma.user.update({
      where: { id: userId },
      data: {
        email: anonymizedEmail,
        displayName: "Deleted User",
        name: null,
        status: UserStatus.DELETED,
        passwordHash: "ANONYMIZED_DELETED_ACCOUNT",
      },
    });

    // 2. Revoke all active refresh tokens
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    // 3. Clear push device tokens
    await prisma.devicePushToken.deleteMany({
      where: { userId },
    });

    // 4. Audit Log
    await AuditService.log({
      userId,
      action: AuditAction.USER_RESTRICTED,
      entityName: "User",
      entityId: userId,
      changes: {
        action: "ACCOUNT_DELETED_ANONYMIZED",
        reason: context?.reason || "User requested account deletion under Privacy & Data Retention Controls",
      },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    return {
      message: "Account deleted and PII anonymized successfully",
    };
  }
}
