import { FraudEventType, FraudSeverity } from "@calltest/shared-types";
import { FraudSignal, FraudSignalContext, FraudSignalResult } from "./fraud-signal-interface.js";

export class RepeatedAssignmentAbuseSignal implements FraudSignal {
  public readonly type = FraudEventType.REPEATED_ASSIGNMENT_ABUSE;

  public async evaluate(context: FraudSignalContext): Promise<FraudSignalResult | null> {
    const abandonments = (context.payload?.abandonmentsCount as number) ?? 0;
    const daysWindow = (context.payload?.daysWindow as number) ?? 14;

    // More than 3 campaign abandonments within 14 days
    if (abandonments >= 3 && daysWindow <= 14) {
      return {
        triggered: true,
        type: this.type,
        severity: FraudSeverity.HIGH,
        scoreImpact: 30,
        reason: "Repeated systematic campaign assignment abuse and rapid abandonments",
        metadata: {
          abandonmentsCount: abandonments,
          daysWindow,
        },
      };
    }

    return null;
  }
}
