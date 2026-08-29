export interface ActivityEvaluationInput {
  lastActivityAt: Date;
  pendingMissionsCount: number;
  hasOverdueMission: boolean;
  now?: Date;
  warningHours?: number; // default 48h
  abandonmentHours?: number; // default 96h
}

export type TesterActivityState = "ACTIVE" | "AT_RISK" | "INACTIVE" | "COMPLETED";

export interface ActivityEvaluationResult {
  state: TesterActivityState;
  hoursSinceLastActivity: number;
  reason: string;
  canRecover: boolean;
}

export class TesterActivityService {
  /**
   * Evaluates tester activity state for a campaign.
   * INVARIANT: If pendingMissionsCount === 0 and !hasOverdueMission, the tester is NEVER penalized
   * and remains ACTIVE even if several days have passed without app opens.
   */
  public static evaluateActivity(input: ActivityEvaluationInput): ActivityEvaluationResult {
    const now = input.now || new Date();
    const lastActivityTime = new Date(input.lastActivityAt).getTime();
    const diffMs = Math.max(0, now.getTime() - lastActivityTime);
    const hoursSinceLastActivity = Math.floor(diffMs / (1000 * 60 * 60));

    const warningHours = input.warningHours || 48;
    const abandonmentHours = input.abandonmentHours || 96;

    // Invariant: No pending missions -> no inactivity penalty
    if (input.pendingMissionsCount === 0 && !input.hasOverdueMission) {
      return {
        state: "ACTIVE",
        hoursSinceLastActivity,
        reason: "All required missions completed; tester is active and in good standing",
        canRecover: false,
      };
    }

    // Tester has pending/overdue missions
    if (hoursSinceLastActivity >= abandonmentHours || (input.hasOverdueMission && hoursSinceLastActivity >= warningHours)) {
      return {
        state: "INACTIVE",
        hoursSinceLastActivity,
        reason: `Tester inactive for ${hoursSinceLastActivity} hours with pending/overdue missions`,
        canRecover: false,
      };
    }

    if (hoursSinceLastActivity >= warningHours || input.hasOverdueMission) {
      return {
        state: "AT_RISK",
        hoursSinceLastActivity,
        reason: `Tester has pending missions and no activity for ${hoursSinceLastActivity} hours`,
        canRecover: true,
      };
    }

    return {
      state: "ACTIVE",
      hoursSinceLastActivity,
      reason: "Recent activity recorded",
      canRecover: false,
    };
  }

  /**
   * Evaluates risk recovery when a tester performs mission activity.
   */
  public static recoverFromRisk(currentState: TesterActivityState): TesterActivityState {
    if (currentState === "AT_RISK") {
      return "ACTIVE";
    }
    return currentState;
  }
}
