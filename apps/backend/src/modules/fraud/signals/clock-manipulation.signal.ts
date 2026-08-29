import { FraudEventType, FraudSeverity } from "@calltest/shared-types";
import { FraudSignal, FraudSignalContext, FraudSignalResult } from "./fraud-signal-interface.js";
import { env } from "../../../core/config/env.js";

export class ClockManipulationSignal implements FraudSignal {
  public readonly type = FraudEventType.CLOCK_MANIPULATION;

  public async evaluate(context: FraudSignalContext): Promise<FraudSignalResult | null> {
    if (!context.clientTimestamp || !context.serverTimestamp) {
      return null;
    }

    const diff = Math.abs(context.serverTimestamp.getTime() - context.clientTimestamp.getTime());
    const isFuture = context.clientTimestamp.getTime() > context.serverTimestamp.getTime() + env.CLOCK_SKEW_TOLERANCE_MS;
    const isAncient = context.clientTimestamp.getTime() < context.serverTimestamp.getTime() - 7 * 24 * 60 * 60 * 1000; // > 7 days

    if (isFuture || isAncient || diff > env.CLOCK_SKEW_TOLERANCE_MS * 2) {
      return {
        triggered: true,
        type: this.type,
        severity: FraudSeverity.MEDIUM,
        scoreImpact: 15,
        reason: "Severe client-server clock skew or time manipulation detected",
        metadata: {
          clientTimestamp: context.clientTimestamp.toISOString(),
          serverTimestamp: context.serverTimestamp.toISOString(),
          skewMs: diff,
        },
      };
    }

    return null;
  }
}
