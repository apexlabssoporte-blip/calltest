import { FraudEventType, FraudSeverity } from "@calltest/shared-types";
import { FraudSignal, FraudSignalContext, FraudSignalResult } from "./fraud-signal-interface.js";

export class AbnormalMissionPatternSignal implements FraudSignal {
  public readonly type = FraudEventType.ABNORMAL_MISSION_PATTERN;

  public async evaluate(context: FraudSignalContext): Promise<FraudSignalResult | null> {
    const recentCount = context.recentEventCount ?? 0;
    const timeWindowMs = context.timeWindowMs ?? 60000;

    // More than 5 mission attempts submitted in under 1 minute
    if (recentCount >= 5 && timeWindowMs <= 60000) {
      return {
        triggered: true,
        type: this.type,
        severity: FraudSeverity.HIGH,
        scoreImpact: 30,
        reason: "Abnormal automated burst of completed missions detected",
        metadata: {
          missionsCount: recentCount,
          timeWindowMs,
        },
      };
    }

    return null;
  }
}
