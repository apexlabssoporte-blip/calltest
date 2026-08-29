import { FraudEventType, FraudSeverity } from "@calltest/shared-types";
import { FraudSignal, FraudSignalContext, FraudSignalResult } from "./fraud-signal-interface.js";

export class SuspiciousActivityBurstSignal implements FraudSignal {
  public readonly type = FraudEventType.SUSPICIOUS_ACTIVITY_BURST;

  public async evaluate(context: FraudSignalContext): Promise<FraudSignalResult | null> {
    const recentEvents = context.recentEventCount ?? 0;
    const timeWindowMs = context.timeWindowMs ?? 2000;

    // More than 50 events in less than 2 seconds
    if (recentEvents >= 50 && timeWindowMs <= 2000) {
      return {
        triggered: true,
        type: this.type,
        severity: FraudSeverity.MEDIUM,
        scoreImpact: 20,
        reason: "Suspicious synthetic event burst detected within short sub-second window",
        metadata: {
          eventCount: recentEvents,
          timeWindowMs,
        },
      };
    }

    return null;
  }
}
