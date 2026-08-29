import { describe, it, expect } from "vitest";
import { CampaignStateMachine } from "../src/modules/campaigns/state-machine.js";
import { CampaignStatus, UserRole } from "@calltest/shared-types";
import { BadRequestError, ForbiddenError } from "../src/core/errors/app-error.js";

describe("CampaignStateMachine", () => {
  describe("Valid Standard Lifecycle Transitions", () => {
    it("should allow DRAFT -> READY", () => {
      expect(() =>
        CampaignStateMachine.validateTransition(
          CampaignStatus.DRAFT,
          CampaignStatus.READY,
          UserRole.DEVELOPER,
        ),
      ).not.toThrow();
    });

    it("should allow READY -> ACTIVE", () => {
      expect(() =>
        CampaignStateMachine.validateTransition(
          CampaignStatus.READY,
          CampaignStatus.ACTIVE,
          UserRole.DEVELOPER,
        ),
      ).not.toThrow();
    });

    it("should allow ACTIVE -> TESTING", () => {
      expect(() =>
        CampaignStateMachine.validateTransition(
          CampaignStatus.ACTIVE,
          CampaignStatus.TESTING,
          UserRole.DEVELOPER,
        ),
      ).not.toThrow();
    });

    it("should allow TESTING -> COMPLETED", () => {
      expect(() =>
        CampaignStateMachine.validateTransition(
          CampaignStatus.TESTING,
          CampaignStatus.COMPLETED,
          UserRole.DEVELOPER,
        ),
      ).not.toThrow();
    });

    it("should allow COMPLETED -> PUBLIC", () => {
      expect(() =>
        CampaignStateMachine.validateTransition(
          CampaignStatus.COMPLETED,
          CampaignStatus.PUBLIC,
          UserRole.DEVELOPER,
        ),
      ).not.toThrow();
    });
  });

  describe("Pause, Resume, and Cancellation Transitions", () => {
    it("should allow ACTIVE -> PAUSED and PAUSED -> ACTIVE", () => {
      expect(() =>
        CampaignStateMachine.validateTransition(
          CampaignStatus.ACTIVE,
          CampaignStatus.PAUSED,
          UserRole.DEVELOPER,
        ),
      ).not.toThrow();

      expect(() =>
        CampaignStateMachine.validateTransition(
          CampaignStatus.PAUSED,
          CampaignStatus.ACTIVE,
          UserRole.DEVELOPER,
        ),
      ).not.toThrow();
    });

    it("should allow ACTIVE -> CANCELLED and PAUSED -> CANCELLED", () => {
      expect(() =>
        CampaignStateMachine.validateTransition(
          CampaignStatus.ACTIVE,
          CampaignStatus.CANCELLED,
          UserRole.DEVELOPER,
        ),
      ).not.toThrow();

      expect(() =>
        CampaignStateMachine.validateTransition(
          CampaignStatus.PAUSED,
          CampaignStatus.CANCELLED,
          UserRole.DEVELOPER,
        ),
      ).not.toThrow();
    });
  });

  describe("Suspension and Admin Reactivation Restriction", () => {
    it("should allow ACTIVE -> SUSPENDED", () => {
      expect(() =>
        CampaignStateMachine.validateTransition(
          CampaignStatus.ACTIVE,
          CampaignStatus.SUSPENDED,
          UserRole.DEVELOPER,
        ),
      ).not.toThrow();
    });

    it("should reject SUSPENDED -> ACTIVE for normal DEVELOPER", () => {
      expect(() =>
        CampaignStateMachine.validateTransition(
          CampaignStatus.SUSPENDED,
          CampaignStatus.ACTIVE,
          UserRole.DEVELOPER,
        ),
      ).toThrow(ForbiddenError);
    });

    it("should reject SUSPENDED -> ACTIVE for BOTH role", () => {
      expect(() =>
        CampaignStateMachine.validateTransition(
          CampaignStatus.SUSPENDED,
          CampaignStatus.ACTIVE,
          UserRole.BOTH,
        ),
      ).toThrow(ForbiddenError);
    });

    it("should allow SUSPENDED -> ACTIVE exclusively for ADMIN", () => {
      expect(() =>
        CampaignStateMachine.validateTransition(
          CampaignStatus.SUSPENDED,
          CampaignStatus.ACTIVE,
          UserRole.ADMIN,
        ),
      ).not.toThrow();
    });
  });

  describe("Invalid & Terminal State Transitions", () => {
    it("should reject PUBLIC -> ACTIVE", () => {
      expect(() =>
        CampaignStateMachine.validateTransition(
          CampaignStatus.PUBLIC,
          CampaignStatus.ACTIVE,
          UserRole.ADMIN,
        ),
      ).toThrow(BadRequestError);
    });

    it("should reject CANCELLED -> ACTIVE", () => {
      expect(() =>
        CampaignStateMachine.validateTransition(
          CampaignStatus.CANCELLED,
          CampaignStatus.ACTIVE,
          UserRole.DEVELOPER,
        ),
      ).toThrow(BadRequestError);
    });

    it("should reject skipping steps e.g. DRAFT -> COMPLETED", () => {
      expect(() =>
        CampaignStateMachine.validateTransition(
          CampaignStatus.DRAFT,
          CampaignStatus.COMPLETED,
          UserRole.DEVELOPER,
        ),
      ).toThrow(BadRequestError);
    });

    it("should reject DRAFT -> TESTING", () => {
      expect(() =>
        CampaignStateMachine.validateTransition(
          CampaignStatus.DRAFT,
          CampaignStatus.TESTING,
          UserRole.DEVELOPER,
        ),
      ).toThrow(BadRequestError);
    });
  });
});
