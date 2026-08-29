import { AiEscalationDecision } from "@calltest/shared-types";

export interface EscalationInputSignals {
  reportCount?: number;
  hasValidEvidence?: boolean;
  consistentReproduction?: boolean;
  developerEscalated?: boolean;
  contradictoryReports?: boolean;
  criticalMissionAffected?: boolean;
  multipleDevicesOrOs?: boolean;
}

export interface EscalationEvaluationResult {
  score: number;
  decision: AiEscalationDecision;
  reasons: string[];
}

export class ReportAiEscalationService {
  /**
   * Calculates a strictly bounded (0-100) escalation score based on independent signals.
   * Signals:
   *  - 2 independent reports: +15
   *  - 3+ independent reports: +25
   *  - Valid evidence: +15
   *  - Consistent reproduction: +20
   *  - Developer ESCALATED: +20
   *  - Contradictory reports: +10
   *  - Critical mission affected: +10
   *  - Multiple testers/devices: +10
   */
  public static calculateEscalationScore(signals: EscalationInputSignals): EscalationEvaluationResult {
    let score = 0;
    const reasons: string[] = [];
    const count = signals.reportCount || 1;

    // 1. Independent reports
    if (count >= 3) {
      score += 25;
      reasons.push("3 or more similar independent reports in cluster");
    } else if (count >= 2) {
      score += 15;
      reasons.push("2 similar independent reports in cluster");
    }

    // 2. Valid attached evidence: +15
    if (signals.hasValidEvidence) {
      score += 15;
      reasons.push("Valid attached screenshot/video evidence");
    }

    // 3. Consistent reproduction: +20
    if (signals.consistentReproduction) {
      score += 20;
      reasons.push("Consistent reproduction of the issue observed");
    }

    // 4. Explicit developer escalation: +20
    if (signals.developerEscalated) {
      score += 20;
      reasons.push("Explicit developer escalation requested");
    }

    // 5. Contradictory reports: +10
    if (signals.contradictoryReports) {
      score += 10;
      reasons.push("Contradictory dispute signals detected");
    }

    // 6. Critical mission affected: +10
    if (signals.criticalMissionAffected) {
      score += 10;
      reasons.push("Critical path mission affected");
    }

    // 7. Multiple devices / OS versions affected: +10
    if (signals.multipleDevicesOrOs) {
      score += 10;
      reasons.push("Multiple distinct devices/OS versions affected");
    }

    // Strictly clamp between 0 and 100
    const clampedScore = Math.max(0, Math.min(100, score));

    // Decision tiers
    let decision: AiEscalationDecision;
    if (clampedScore <= 39) {
      decision = AiEscalationDecision.HUMAN_REVIEW;
    } else if (clampedScore <= 59) {
      decision = AiEscalationDecision.COLLECT_MORE_EVIDENCE;
    } else if (clampedScore <= 79) {
      decision = AiEscalationDecision.AI_CANDIDATE;
    } else {
      decision = AiEscalationDecision.AI_ESCALATION;
    }

    return {
      score: clampedScore,
      decision,
      reasons,
    };
  }
}
