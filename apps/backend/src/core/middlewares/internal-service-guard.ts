import { FastifyRequest, FastifyReply } from "fastify";
import crypto from "crypto";
import { ForbiddenError, UnauthorizedError } from "../errors/app-error.js";
import { env } from "../config/env.js";
import { AuditService } from "../services/audit-service.js";
import { AuditAction } from "@calltest/shared-types";

/**
 * In-memory Nonce Cache with TTL for replay protection.
 */
export class NonceStore {
  private static nonces = new Map<string, number>();

  public static has(nonce: string): boolean {
    const expiresAt = this.nonces.get(nonce);
    if (!expiresAt) return false;
    if (Date.now() > expiresAt) {
      this.nonces.delete(nonce);
      return false;
    }
    return true;
  }

  public static add(nonce: string, ttlMs: number): void {
    const expiresAt = Date.now() + ttlMs;
    this.nonces.set(nonce, expiresAt);
    this.cleanup();
  }

  public static reset(): void {
    this.nonces.clear();
  }

  private static cleanup(): void {
    if (this.nonces.size > 10000) {
      const now = Date.now();
      for (const [nonce, expiresAt] of this.nonces.entries()) {
        if (now > expiresAt) {
          this.nonces.delete(nonce);
        }
      }
    }
  }
}

/**
 * Computes SHA-256 hash of a request payload.
 */
export function computeBodyHash(body: unknown): string {
  if (body === undefined || body === null) {
    return crypto.createHash("sha256").update("").digest("hex");
  }
  const bodyString = typeof body === "string" ? body : JSON.stringify(body);
  return crypto.createHash("sha256").update(bodyString).digest("hex");
}

/**
 * Canonical signature string generator.
 */
export function buildCanonicalSignaturePayload(
  method: string,
  path: string,
  timestamp: number | string,
  nonce: string,
  bodyHash: string,
): string {
  return `${method.toUpperCase()}\n${path}\n${timestamp}\n${nonce}\n${bodyHash}`;
}

/**
 * Signs an internal service request using HMAC-SHA256.
 */
export function signInternalServiceRequest(options: {
  method: string;
  path: string;
  timestamp?: number | string;
  nonce?: string;
  body?: unknown;
  secret?: string;
}): {
  signature: string;
  timestamp: string;
  nonce: string;
  bodyHash: string;
} {
  const timestamp = String(options.timestamp ?? Date.now());
  const nonce = options.nonce ?? crypto.randomUUID();
  const bodyHash = computeBodyHash(options.body);
  const canonicalPayload = buildCanonicalSignaturePayload(
    options.method,
    options.path,
    timestamp,
    nonce,
    bodyHash,
  );
  const secret = options.secret || env.INTERNAL_SERVICE_SECRET;

  const signature = crypto
    .createHmac("sha256", secret)
    .update(canonicalPayload)
    .digest("hex");

  return {
    signature,
    timestamp,
    nonce,
    bodyHash,
  };
}

/**
 * Verifies internal service HMAC signature with timing-safe comparison and replay protection.
 */
export function verifyInternalServiceSignature(options: {
  method: string;
  path: string;
  timestampHeader?: string;
  nonceHeader?: string;
  signatureHeader?: string;
  body?: unknown;
  secret?: string;
  windowSeconds?: number;
}): void {
  const {
    method,
    path,
    timestampHeader,
    nonceHeader,
    signatureHeader,
    body,
    secret = env.INTERNAL_SERVICE_SECRET,
    windowSeconds = env.INTERNAL_SERVICE_SIGNATURE_WINDOW_SECONDS,
  } = options;

  if (!timestampHeader || !nonceHeader || !signatureHeader) {
    throw new UnauthorizedError(
      "Missing required internal authentication headers (x-internal-timestamp, x-internal-nonce, x-internal-signature)",
    );
  }

  // 1. Timestamp validation
  const parsedTimestamp = Number(timestampHeader);
  if (isNaN(parsedTimestamp)) {
    throw new UnauthorizedError("Invalid timestamp header in internal service authentication");
  }

  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const timeDrift = Math.abs(now - parsedTimestamp);

  if (timeDrift > windowMs) {
    if (parsedTimestamp < now) {
      throw new UnauthorizedError("Internal service signature timestamp expired");
    } else {
      throw new UnauthorizedError("Internal service signature timestamp is too far in the future");
    }
  }

  // 2. Replay protection
  if (NonceStore.has(nonceHeader)) {
    throw new UnauthorizedError("Internal service signature nonce replay detected");
  }

  // 3. Compute expected signature
  const bodyHash = computeBodyHash(body);
  const canonicalPayload = buildCanonicalSignaturePayload(
    method,
    path,
    timestampHeader,
    nonceHeader,
    bodyHash,
  );

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(canonicalPayload)
    .digest("hex");

  // 4. Timing-safe comparison
  const sigBuffer = Buffer.from(signatureHeader, "utf-8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf-8");

  if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    throw new UnauthorizedError("Invalid internal service HMAC signature");
  }

  // 5. Register nonce with TTL = 2 * windowMs
  NonceStore.add(nonceHeader, windowMs * 2);
}

/**
 * Middleware protecting internal engine routes (/internal/*).
 * Strictly requires cryptographic HMAC signature with timestamp and nonce replay protection.
 */
export async function requireInternalServiceAuth(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  const signatureHeader = request.headers["x-internal-signature"] as string | undefined;
  const timestampHeader = request.headers["x-internal-timestamp"] as string | undefined;
  const nonceHeader = request.headers["x-internal-nonce"] as string | undefined;

  try {
    verifyInternalServiceSignature({
      method: request.method,
      path: request.url.split("?")[0], // Canonical path without query
      timestampHeader,
      nonceHeader,
      signatureHeader,
      body: request.body,
    });

    // Audit approved internal invocation
    await AuditService.log({
      userId: "internal-service",
      action: AuditAction.MATCHING_EXECUTED,
      entityName: "InternalService",
      entityId: request.url,
      changes: {
        route: request.url,
        method: request.method,
        authMethod: "HMAC_SHA256",
        nonce: nonceHeader,
        timestamp: timestampHeader,
      },
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
    });
  } catch (error: any) {
    // Audit rejected attempt
    await AuditService.log({
      userId: "unauthorized-internal-caller",
      action: AuditAction.USER_RESTRICTED,
      entityName: "InternalService",
      entityId: request.url,
      changes: {
        action: "INTERNAL_SERVICE_AUTH_FAILED",
        route: request.url,
        method: request.method,
        reason: error?.message || "Invalid HMAC signature or replay",
        ip: request.ip,
      },
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
    });

    throw new ForbiddenError(error?.message || "Internal service access denied");
  }
}
