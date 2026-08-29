import { describe, it, expect } from "vitest";
import { hasRolePermission } from "../src/core/middlewares/rbac-guard.js";
import { UserRole } from "@calltest/shared-types";

describe("RBAC Permissions (hasRolePermission)", () => {
  describe("DEVELOPER Target Requirement", () => {
    it("should allow DEVELOPER role", () => {
      expect(hasRolePermission(UserRole.DEVELOPER, UserRole.DEVELOPER)).toBe(true);
    });

    it("should allow BOTH role to act as DEVELOPER", () => {
      expect(hasRolePermission(UserRole.BOTH, UserRole.DEVELOPER)).toBe(true);
    });

    it("should allow ADMIN to act as DEVELOPER", () => {
      expect(hasRolePermission(UserRole.ADMIN, UserRole.DEVELOPER)).toBe(true);
    });

    it("should deny pure TESTER role from acting as DEVELOPER", () => {
      expect(hasRolePermission(UserRole.TESTER, UserRole.DEVELOPER)).toBe(false);
    });
  });

  describe("TESTER Target Requirement", () => {
    it("should allow TESTER role", () => {
      expect(hasRolePermission(UserRole.TESTER, UserRole.TESTER)).toBe(true);
    });

    it("should allow BOTH role to act as TESTER", () => {
      expect(hasRolePermission(UserRole.BOTH, UserRole.TESTER)).toBe(true);
    });

    it("should allow ADMIN to act as TESTER", () => {
      expect(hasRolePermission(UserRole.ADMIN, UserRole.TESTER)).toBe(true);
    });

    it("should deny pure DEVELOPER role from acting as TESTER", () => {
      expect(hasRolePermission(UserRole.DEVELOPER, UserRole.TESTER)).toBe(false);
    });
  });

  describe("ADMIN Target Requirement", () => {
    it("should allow ADMIN role", () => {
      expect(hasRolePermission(UserRole.ADMIN, UserRole.ADMIN)).toBe(true);
    });

    it("should deny DEVELOPER, TESTER, and BOTH from ADMIN-only actions", () => {
      expect(hasRolePermission(UserRole.DEVELOPER, UserRole.ADMIN)).toBe(false);
      expect(hasRolePermission(UserRole.TESTER, UserRole.ADMIN)).toBe(false);
      expect(hasRolePermission(UserRole.BOTH, UserRole.ADMIN)).toBe(false);
    });
  });
});
