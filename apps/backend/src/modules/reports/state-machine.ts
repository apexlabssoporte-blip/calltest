import { ReportStatus } from "@calltest/shared-types";
import { BadRequestError } from "../../core/errors/app-error.js";

export class ReportStateMachine {
  private static readonly VALID_TRANSITIONS: Record<ReportStatus, ReportStatus[]> = {
    [ReportStatus.SUBMITTED]: [
      ReportStatus.DEVELOPER_REVIEW,
      ReportStatus.VALID,
      ReportStatus.INVALID,
      ReportStatus.NEEDS_MORE_EVIDENCE,
      ReportStatus.ESCALATED,
    ],
    [ReportStatus.DEVELOPER_REVIEW]: [
      ReportStatus.VALID,
      ReportStatus.INVALID,
      ReportStatus.NEEDS_MORE_EVIDENCE,
      ReportStatus.ESCALATED,
    ],
    [ReportStatus.ESCALATED]: [
      ReportStatus.AI_REVIEW_PENDING,
      ReportStatus.HUMAN_REVIEW,
    ],
    [ReportStatus.AI_REVIEW_PENDING]: [
      ReportStatus.AI_REVIEWED,
      ReportStatus.HUMAN_REVIEW,
    ],
    [ReportStatus.AI_REVIEWED]: [
      ReportStatus.HUMAN_REVIEW,
    ],
    [ReportStatus.HUMAN_REVIEW]: [
      ReportStatus.CONFIRMED,
      ReportStatus.REJECTED,
      ReportStatus.NEEDS_MORE_EVIDENCE,
    ],
    // Terminal states
    [ReportStatus.VALID]: [],
    [ReportStatus.INVALID]: [],
    [ReportStatus.CONFIRMED]: [],
    [ReportStatus.REJECTED]: [],
    [ReportStatus.NEEDS_MORE_EVIDENCE]: [
      ReportStatus.DEVELOPER_REVIEW,
      ReportStatus.SUBMITTED,
    ],
  };

  /**
   * Validates state transition according to the Report state machine.
   */
  public static validateTransition(currentStatus: ReportStatus, targetStatus: ReportStatus): void {
    if (currentStatus === targetStatus) {
      return; // Idempotent
    }

    const allowed = this.VALID_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(targetStatus)) {
      throw new BadRequestError(
        `Invalid report transition from '${currentStatus}' to '${targetStatus}'. Allowed transitions: [${allowed.join(", ")}]`,
      );
    }
  }
}
