import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuditService } from "../src/core/services/audit-service.js";
import { prisma } from "../src/core/database/prisma.js";
import { AuditAction } from "@calltest/shared-types";
import { eventBus } from "../src/core/events/domain-event-bus.js";

describe("AuditService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should create audit log and redact sensitive keys", async () => {
    const createSpy = vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);
    const publishSpy = vi.spyOn(eventBus, "publish").mockResolvedValue(undefined);

    await AuditService.log({
      userId: "user-1",
      action: AuditAction.LOGIN,
      entityName: "User",
      entityId: "user-1",
      changes: {
        email: "user@calltest.com",
        password: "SecretPassword123!",
        passwordHash: "salt:hash",
        token: "jwt_token_here",
        apiKey: "apk_secret",
        normalField: "visible",
      },
    });

    expect(createSpy).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        action: AuditAction.LOGIN,
        entityName: "User",
        entityId: "user-1",
        changes: {
          email: "user@calltest.com",
          password: "[REDACTED]",
          passwordHash: "[REDACTED]",
          token: "[REDACTED]",
          apiKey: "[REDACTED]",
          normalField: "visible",
        },
      }),
    });

    expect(publishSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: `AUDIT_${AuditAction.LOGIN}`,
      }),
    );
  });
});
