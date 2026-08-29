import { FraudEventType, FraudSeverity } from "@calltest/shared-types";
import { FraudSignal, FraudSignalContext, FraudSignalResult } from "./fraud-signal-interface.js";

export class DuplicateEventSignal implements FraudSignal {
  public readonly type = FraudEventType.DUPLICATE_EVENT;

  public async evaluate(context: FraudSignalContext): Promise<FraudSignalResult | null> {
    if (context.payload?.isDuplicate === true) {
      return {
        triggered: true,
        type: this.type,
        severity: FraudSeverity.LOW,
        scoreImpact: 5,
        reason: "Duplicate event ingestion detected with identical key or timestamp",
        metadata: {
          sessionId: context.sessionId,
          clientTimestamp: context.clientTimestamp?.toISOString(),
        },
      };
    }
    return null;
  }
}
