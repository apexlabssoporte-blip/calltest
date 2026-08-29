import { FraudEventType, FraudSeverity } from "@calltest/shared-types";
import { FraudSignal, FraudSignalContext, FraudSignalResult } from "./fraud-signal-interface.js";

export class MultipleAccountSignal implements FraudSignal {
  public readonly type = FraudEventType.MULTIPLE_ACCOUNT_SIGNAL;

  public async evaluate(context: FraudSignalContext): Promise<FraudSignalResult | null> {
    const sharedAccountsCount = (context.payload?.sharedAccountsCount as number) ?? 0;

    // Trigger risk signal if > 2 accounts share identical hardware fingerprint within short timeframe
    if (sharedAccountsCount >= 3) {
      return {
        triggered: true,
        type: this.type,
        severity: FraudSeverity.MEDIUM,
        scoreImpact: 20,
        reason: "Suspicious shared device fingerprint pattern detected across multiple accounts",
        metadata: {
          sharedAccountsCount,
          deviceFingerprint: context.deviceFingerprint ? "[REDACTED_FINGERPRINT]" : undefined,
        },
      };
    }

    return null;
  }
}
