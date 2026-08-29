import { CampaignStatus, UserRole } from "@calltest/shared-types";
import { BadRequestError, ForbiddenError } from "../../core/errors/app-error.js";

export class CampaignStateMachine {
  /**
   * Transition map defining valid next states from a given status.
   */
  private static readonly ALLOWED_TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
    [CampaignStatus.DRAFT]: [CampaignStatus.READY, CampaignStatus.CANCELLED],
    [CampaignStatus.READY]: [CampaignStatus.ACTIVE, CampaignStatus.DRAFT, CampaignStatus.CANCELLED],
    [CampaignStatus.ACTIVE]: [
      CampaignStatus.TESTING,
      CampaignStatus.PAUSED,
      CampaignStatus.CANCELLED,
      CampaignStatus.SUSPENDED,
      CampaignStatus.ENDED_EARLY,
      CampaignStatus.AT_RISK,
      CampaignStatus.COMPLETED,
    ],
    [CampaignStatus.PAUSED]: [CampaignStatus.ACTIVE, CampaignStatus.CANCELLED],
    [CampaignStatus.TESTING]: [
      CampaignStatus.COMPLETED,
      CampaignStatus.PAUSED,
      CampaignStatus.SUSPENDED,
      CampaignStatus.ENDED_EARLY,
      CampaignStatus.AT_RISK,
    ],
    [CampaignStatus.AT_RISK]: [
      CampaignStatus.ACTIVE,
      CampaignStatus.TESTING,
      CampaignStatus.PAUSED,
      CampaignStatus.SUSPENDED,
      CampaignStatus.CANCELLED,
      CampaignStatus.ENDED_EARLY,
      CampaignStatus.COMPLETED,
    ],
    [CampaignStatus.COMPLETED]: [CampaignStatus.PUBLIC],
    [CampaignStatus.ENDED_EARLY]: [CampaignStatus.PUBLIC],
    [CampaignStatus.SUSPENDED]: [CampaignStatus.ACTIVE],
    [CampaignStatus.CANCELLED]: [],
    [CampaignStatus.PUBLIC]: [],
  };

  /**
   * Validates whether a transition is allowed from currentStatus to targetStatus.
   * Enforces that SUSPENDED -> ACTIVE requires an ADMIN role.
   */
  public static validateTransition(
    currentStatus: CampaignStatus,
    targetStatus: CampaignStatus,
    userRole: UserRole,
  ): void {
    if (currentStatus === targetStatus) {
      return;
    }

    const allowedNext = this.ALLOWED_TRANSITIONS[currentStatus] || [];
    if (!allowedNext.includes(targetStatus)) {
      throw new BadRequestError(
        `Invalid campaign state transition from '${currentStatus}' to '${targetStatus}'`,
      );
    }

    // Reactivation from SUSPENDED requires ADMIN privileges
    if (currentStatus === CampaignStatus.SUSPENDED && targetStatus === CampaignStatus.ACTIVE) {
      if (userRole !== UserRole.ADMIN) {
        throw new ForbiddenError(
          "Only an administrator can reactivate a suspended campaign",
        );
      }
    }
  }

  /**
   * Helper method to check if a transition is valid without throwing.
   */
  public static isValidTransition(
    currentStatus: CampaignStatus,
    targetStatus: CampaignStatus,
    userRole: UserRole,
  ): boolean {
    try {
      this.validateTransition(currentStatus, targetStatus, userRole);
      return true;
    } catch {
      return false;
    }
  }
}
