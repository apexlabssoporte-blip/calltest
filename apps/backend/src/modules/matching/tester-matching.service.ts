import { RELIABLE_THRESHOLD } from "../trust/tester-reliability.service.js";

export interface TesterCandidateProfile {
  id: string;
  displayName: string;
  reliabilityScore: number; // 0–100
  qualityScore: number; // 0–100
  activityScore: number; // 0–100
  completedCampaignsCount: number;
  level: number; // XP progression (NOT primary matching weight)
  deviceModel?: string;
  androidVersion?: string;
  country?: string;
}

export interface MatchingContext {
  campaignId: string;
  targetSlot: number; // 1–12 (CORE) or 13–15 (REINFORCEMENT)
  developerReliabilityScore?: number; // 0–100 from developer's past participation
  requiredAndroidMinVersion?: number;
  allowedCountries?: string[];
}

export interface ScoredCandidate {
  candidate: TesterCandidateProfile;
  matchingScore: number;
  isEligibleForSlot: boolean;
  scoreBreakdown: {
    reliabilityWeight: number;
    qualityWeight: number;
    activityWeight: number;
    experienceWeight: number;
    developerBonus: number;
  };
}

export class TesterMatchingService {
  /**
   * Computes matching score from independent components.
   * XP / Level is deliberately NOT the primary driver.
   */
  public static calculateMatchingScore(
    candidate: TesterCandidateProfile,
    context: MatchingContext
  ): ScoredCandidate {
    // 1. Mandatory Filter for Reinforcement Slots (13-15)
    const isReinforcementSlot = context.targetSlot >= 13 && context.targetSlot <= 15;
    const isReliabilityEligible = !isReinforcementSlot || candidate.reliabilityScore >= RELIABLE_THRESHOLD;

    // Component weights
    // Reliability (40%), Quality (25%), Activity (20%), Experience (15%)
    const reliabilityWeight = (candidate.reliabilityScore / 100) * 40;
    const qualityWeight = (candidate.qualityScore / 100) * 25;
    const activityWeight = (candidate.activityScore / 100) * 20;
    const experienceWeight = Math.min(15, (candidate.completedCampaignsCount * 3));

    // Developer Priority Bonus: If developer has high reliability history, they get priority boost for reliable testers
    let developerBonus = 0;
    if (context.developerReliabilityScore && context.developerReliabilityScore >= 80 && candidate.reliabilityScore >= 75) {
      developerBonus = 10;
    }

    const matchingScore = Math.round(
      reliabilityWeight + qualityWeight + activityWeight + experienceWeight + developerBonus
    );

    return {
      candidate,
      matchingScore,
      isEligibleForSlot: isReliabilityEligible,
      scoreBreakdown: {
        reliabilityWeight: Math.round(reliabilityWeight),
        qualityWeight: Math.round(qualityWeight),
        activityWeight: Math.round(activityWeight),
        experienceWeight: Math.round(experienceWeight),
        developerBonus,
      },
    };
  }

  /**
   * Selects best candidate for a slot.
   * If slot is 13–15 and no candidate meets RELIABLE_THRESHOLD (75), returns null.
   * NEVER downgrades threshold or assigns an incompatible candidate.
   */
  public static selectBestCandidate(
    candidates: TesterCandidateProfile[],
    context: MatchingContext
  ): ScoredCandidate | null {
    const scored = candidates
      .map((c) => this.calculateMatchingScore(c, context))
      .filter((s) => s.isEligibleForSlot);

    if (scored.length === 0) {
      return null;
    }

    // Sort descending by matching score
    scored.sort((a, b) => b.matchingScore - a.matchingScore);
    return scored[0];
  }

  /**
   * Generates participation incentive message when a developer's campaign completes.
   */
  public static getCampaignCompletionIncentiveMessage(): string {
    return (
      "¡Tu campaña terminó correctamente! Seguir participando en nuevas campañas, descargando aplicaciones " +
      "y completando misiones puede mejorar tu historial como tester y aumentar la probabilidad de recibir " +
      "testers con un mejor historial de participación cuando publiques una nueva aplicación."
    );
  }
}
