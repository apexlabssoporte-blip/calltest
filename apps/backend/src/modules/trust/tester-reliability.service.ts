import { TesterReliabilityTier } from "@calltest/shared-types";

export interface ReliabilitySignals {
  completedMissionsCount?: number;
  missedMissionsCount?: number;
  lateMissionsCount?: number;
  requiredMissionsCompletedCount?: number;
  requiredMissionsMissedCount?: number;
  requiredMissionsLateCount?: number;
  optionalMissionsIgnoredCount?: number; // Zero penalty invariant
  completedCampaignsCount: number;
  abandonedCampaignsCount: number;
  replacedAsInactiveCount: number;
  recentActivityStreakDays?: number;
  initialBaseScore?: number;
}

export interface ReliabilityEvaluationResult {
  score: number; // 0–100
  tier: TesterReliabilityTier;
  signals: {
    missionsSuccessRate: number;
    campaignsSuccessRate: number;
    penaltyPoints: number;
    bonusPoints: number;
  };
}

export const RELIABLE_THRESHOLD = 75;
export const HIGHLY_RELIABLE_THRESHOLD = 90;

export class TesterReliabilityService {
  /**
   * Computes a deterministic reliability score (0-100) independent of XP/Level.
   * INVARIANT: Optional missions ignored NEVER penalize the user.
   */
  public static calculateReliability(signals: ReliabilitySignals): ReliabilityEvaluationResult {
    let score = typeof signals.initialBaseScore === "number" ? signals.initialBaseScore : 70;

    const completedMissions =
      typeof signals.requiredMissionsCompletedCount === "number"
        ? signals.requiredMissionsCompletedCount
        : signals.completedMissionsCount || 0;

    const missedMissions =
      typeof signals.requiredMissionsMissedCount === "number"
        ? signals.requiredMissionsMissedCount
        : signals.missedMissionsCount || 0;

    const lateMissions =
      typeof signals.requiredMissionsLateCount === "number"
        ? signals.requiredMissionsLateCount
        : signals.lateMissionsCount || 0;

    const totalMissions = completedMissions + missedMissions + lateMissions;
    const missionsSuccessRate = totalMissions > 0 ? (completedMissions / totalMissions) * 100 : 100;

    const totalCampaigns = signals.completedCampaignsCount + signals.abandonedCampaignsCount;
    const campaignsSuccessRate = totalCampaigns > 0 ? (signals.completedCampaignsCount / totalCampaigns) * 100 : 100;

    let bonusPoints = 0;
    let penaltyPoints = 0;

    // Positive signals
    bonusPoints += Math.min(20, signals.completedCampaignsCount * 4);
    bonusPoints += Math.min(15, completedMissions * 1.5);
    if (signals.recentActivityStreakDays && signals.recentActivityStreakDays >= 3) {
      bonusPoints += Math.min(10, signals.recentActivityStreakDays * 2);
    }

    // Negative penalties (Optional missions ignored = 0 penalty points)
    penaltyPoints += signals.abandonedCampaignsCount * 25;
    penaltyPoints += signals.replacedAsInactiveCount * 20;
    penaltyPoints += missedMissions * 8;
    penaltyPoints += lateMissions * 4;

    score = score + bonusPoints - penaltyPoints;

    // Strict clamping [0, 100]
    const clampedScore = Math.max(0, Math.min(100, Math.round(score)));

    let tier: TesterReliabilityTier;
    if (clampedScore >= HIGHLY_RELIABLE_THRESHOLD) {
      tier = TesterReliabilityTier.HIGHLY_RELIABLE;
    } else if (clampedScore >= RELIABLE_THRESHOLD) {
      tier = TesterReliabilityTier.RELIABLE;
    } else if (clampedScore >= 60) {
      tier = TesterReliabilityTier.STANDARD;
    } else {
      tier = TesterReliabilityTier.LOW;
    }

    return {
      score: clampedScore,
      tier,
      signals: {
        missionsSuccessRate: Math.round(missionsSuccessRate),
        campaignsSuccessRate: Math.round(campaignsSuccessRate),
        penaltyPoints,
        bonusPoints,
      },
    };
  }

  /**
   * Evaluates progression tier based on real participation history.
   * INVARIANT: New testers start at NEW tier without penalty.
   * INVARIANT: Responsible behavior increases matching priority multiplier.
   */
  public static evaluateTesterProgression(history: {
    campaignsCompleted: number;
    campaignsAbandoned: number;
    requiredMissionsCompleted: number;
    requiredMissionsMissed: number;
    requiredMissionsCompletedLate?: number;
    replacementsCaused?: number;
    availabilityReportsValidated?: number;
    initialBaseScore?: number;
  }): {
    tier: "NEW" | "ACTIVE" | "RELIABLE" | "HIGHLY_RELIABLE";
    campaignsCompleted: number;
    campaignsAbandoned: number;
    requiredMissionsCompleted: number;
    requiredMissionsMissed: number;
    requiredMissionsCompletedLate: number;
    replacementsCaused: number;
    availabilityReportsValidated: number;
    reliabilityScore: number;
    higherMatchingPriorityMultiplier: number;
  } {
    const reliability = this.calculateReliability({
      requiredMissionsCompletedCount: history.requiredMissionsCompleted,
      requiredMissionsMissedCount: history.requiredMissionsMissed,
      requiredMissionsLateCount: history.requiredMissionsCompletedLate || 0,
      completedCampaignsCount: history.campaignsCompleted,
      abandonedCampaignsCount: history.campaignsAbandoned,
      replacedAsInactiveCount: history.replacementsCaused || 0,
      initialBaseScore: history.initialBaseScore,
    });

    let tier: "NEW" | "ACTIVE" | "RELIABLE" | "HIGHLY_RELIABLE" = "NEW";
    let multiplier = 1.0;

    if (history.campaignsCompleted === 0) {
      tier = "NEW";
      multiplier = 1.0;
    } else if (
      history.campaignsCompleted >= 4 &&
      reliability.score >= HIGHLY_RELIABLE_THRESHOLD &&
      history.campaignsAbandoned === 0
    ) {
      tier = "HIGHLY_RELIABLE";
      multiplier = 1.5;
    } else if (history.campaignsCompleted >= 2 && reliability.score >= RELIABLE_THRESHOLD) {
      tier = "RELIABLE";
      multiplier = 1.35;
    } else {
      tier = "ACTIVE";
      multiplier = 1.15;
    }

    return {
      tier,
      campaignsCompleted: history.campaignsCompleted,
      campaignsAbandoned: history.campaignsAbandoned,
      requiredMissionsCompleted: history.requiredMissionsCompleted,
      requiredMissionsMissed: history.requiredMissionsMissed,
      requiredMissionsCompletedLate: history.requiredMissionsCompletedLate || 0,
      replacementsCaused: history.replacementsCaused || 0,
      availabilityReportsValidated: history.availabilityReportsValidated || 0,
      reliabilityScore: reliability.score,
      higherMatchingPriorityMultiplier: multiplier,
    };
  }

  /**
   * Helper to verify if a tester meets the reliability threshold for Reinforcement slots (13-15).
   */
  public static isEligibleForReinforcement(score: number): boolean {
    return score >= RELIABLE_THRESHOLD;
  }
}
