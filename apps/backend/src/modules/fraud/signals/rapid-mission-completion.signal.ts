import { FraudEventType, FraudSeverity } from "@calltest/shared-types";
import { FraudSignal, FraudSignalContext, FraudSignalResult } from "./fraud-signal-interface.js";

export class RapidMissionCompletionSignal implements FraudSignal {
  public readonly type = FraudEventType.RAPID_MISSION_COMPLETION;

  public async evaluate(context: FraudSignalContext): Promise<FraudSignalResult | null> {
    const duration = context.durationSeconds ?? 0;
    const estimatedMinutes = context.estimatedMinutes ?? 10;
    const estimatedSeconds = estimatedMinutes * 60;

    // Trigger if mission is submitted in less than 5 seconds or less than 5% of estimated time
    if (duration > 0 && (duration < 5 || duration < estimatedSeconds * 0.05)) {
      return {
        triggered: true,
        type: this.type,
        severity: FraudSeverity.HIGH,
        scoreImpact: 25,
        reason: "Mission submitted abnormally fast without plausible human interaction time",
        metadata: {
          durationSeconds: duration,
          estimatedMinutes,
        },
      };
    }

    return null;
  }
}
