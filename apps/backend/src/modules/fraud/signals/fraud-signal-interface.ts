import { FraudEventType, FraudSeverity } from "@calltest/shared-types";

export interface FraudSignalResult {
  triggered: boolean;
  type: FraudEventType;
  severity: FraudSeverity;
  scoreImpact: number;
  reason: string;
  metadata?: Record<string, unknown>;
}

export interface FraudSignalContext {
  userId: string;
  appId?: string;
  campaignId?: string;
  sessionId?: string;
  clientTimestamp?: Date;
  serverTimestamp?: Date;
  durationSeconds?: number;
  stepsCompleted?: number;
  estimatedMinutes?: number;
  deviceFingerprint?: string;
  ipAddress?: string;
  recentEventCount?: number;
  timeWindowMs?: number;
  payload?: Record<string, unknown>;
}

export interface FraudSignal {
  readonly type: FraudEventType;
  evaluate(context: FraudSignalContext): Promise<FraudSignalResult | null>;
}
