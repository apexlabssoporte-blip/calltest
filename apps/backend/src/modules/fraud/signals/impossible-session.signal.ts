import { FraudEventType, FraudSeverity } from "@calltest/shared-types";
import { FraudSignal, FraudSignalContext, FraudSignalResult } from "./fraud-signal-interface.js";

export class ImpossibleSessionSignal implements FraudSignal {
  public readonly type = FraudEventType.IMPOSSIBLE_SESSION;

  public async evaluate(context: FraudSignalContext): Promise<FraudSignalResult | null> {
    const duration = context.durationSeconds ?? 0;

    // Session longer than 24 hours (86,400s) or negative duration
    if (duration > 86400 || duration < 0) {
      return {
        triggered: true,
        type: this.type,
        severity: FraudSeverity.HIGH,
        scoreImpact: 25,
        reason: "Physically impossible session duration detected",
        metadata: {
          durationSeconds: duration,
          sessionId: context.sessionId,
        },
      };
    }

    return null;
  }
}
