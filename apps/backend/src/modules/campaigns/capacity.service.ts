import { RELIABLE_THRESHOLD } from "../trust/tester-reliability.service.js";

export const CAMPAIGN_ACTIVE_TESTER_TARGET = 12;
export const CAMPAIGN_BACKUP_TARGET = 3;
export const CAMPAIGN_TOTAL_TARGET = 15;

export interface CampaignCapacityStatus {
  campaignId: string;
  activeCount: number;
  backupCount: number;
  activeTarget: number; // 12
  backupTarget: number; // 3
  totalTarget: number; // 15
  isUnderCapacity: boolean;
  replacementRequired: boolean;
  backupNeeded: number;
  statusSummary: string;
}

export interface ProgressiveCapacityResult {
  maxCoreTesters: number;
  maxCampaignCapacity: number; // 15 with reinforcements
  completedAppsCount: number;
  nextTierRequirement: number;
  progressPercentage: number;
}

export interface ReinforcementEligibilityResult {
  day: number;
  targetSlot: number | null; // 13, 14, 15 or null
  canUnlock: boolean;
  requiredReliability: number;
  reason: string;
}

export class CampaignCapacityService {
  /**
   * Evaluates current campaign capacity against 12 active + 3 backup targets.
   */
  public static evaluateCampaignCapacity(
    activeCount: number,
    backupCount: number,
    campaignId = ""
  ): CampaignCapacityStatus {
    const isUnderCapacity = activeCount < CAMPAIGN_ACTIVE_TESTER_TARGET;
    const replacementRequired = activeCount < CAMPAIGN_ACTIVE_TESTER_TARGET;
    const backupNeeded = Math.max(0, CAMPAIGN_BACKUP_TARGET - backupCount);

    let statusSummary = "Campaña saludable (12/12 activos, 3/3 backups)";
    if (activeCount < CAMPAIGN_ACTIVE_TESTER_TARGET && backupCount > 0) {
      statusSummary = `⚠️ ${activeCount}/${CAMPAIGN_ACTIVE_TESTER_TARGET} testers activos. Buscando reemplazo...`;
    } else if (activeCount < CAMPAIGN_ACTIVE_TESTER_TARGET && backupCount === 0) {
      statusSummary = `⚠️ ${activeCount}/${CAMPAIGN_ACTIVE_TESTER_TARGET} testers activos. UNDER_CAPACITY (0 backups disponibles)`;
    } else if (backupNeeded > 0) {
      statusSummary = `ℹ️ ${backupCount}/${CAMPAIGN_BACKUP_TARGET} testers de respaldo. Buscando ${backupNeeded} nuevo respaldo...`;
    }

    return {
      campaignId,
      activeCount,
      backupCount,
      activeTarget: CAMPAIGN_ACTIVE_TESTER_TARGET,
      backupTarget: CAMPAIGN_BACKUP_TARGET,
      totalTarget: CAMPAIGN_TOTAL_TARGET,
      isUnderCapacity,
      replacementRequired,
      backupNeeded,
      statusSummary,
    };
  }
  /**
   * Calculates progressive maximum core testers for a developer based on their completed apps.
   *  1–3 apps  → max 3 testers
   *  4–6 apps  → max 6 testers
   *  7–9 apps  → max 9 testers
   *  10–12 apps → max 12 testers (Full Core)
   */
  public static calculateDeveloperCapacity(completedAppsCount: number): ProgressiveCapacityResult {
    let maxCoreTesters = 3;
    let nextTierRequirement = 4;

    if (completedAppsCount >= 10) {
      maxCoreTesters = 12;
      nextTierRequirement = 12;
    } else if (completedAppsCount >= 7) {
      maxCoreTesters = 9;
      nextTierRequirement = 10;
    } else if (completedAppsCount >= 4) {
      maxCoreTesters = 6;
      nextTierRequirement = 7;
    } else if (completedAppsCount >= 1) {
      maxCoreTesters = 3;
      nextTierRequirement = 4;
    } else {
      maxCoreTesters = 3;
      nextTierRequirement = 1;
    }

    const progressPercentage = Math.min(100, Math.round((completedAppsCount / 12) * 100));

    return {
      maxCoreTesters,
      maxCampaignCapacity: 15,
      completedAppsCount,
      nextTierRequirement,
      progressPercentage,
    };
  }

  /**
   * Evaluates if a campaign can unlock reinforcement slots (13, 14, 15) on day 3, 6, 9.
   * Rules:
   *  - Day 3: slot 13 (Requires Reliability >= 75)
   *  - Day 6: slot 14 (Requires Reliability >= 75)
   *  - Day 9: slot 15 (Requires Reliability >= 75)
   *  - Prior days: Cannot unlock early.
   */
  public static evaluateReinforcementSlot(campaignDay: number, currentActiveCount: number): ReinforcementEligibilityResult {
    if (campaignDay >= 9 && currentActiveCount < 15) {
      return {
        day: campaignDay,
        targetSlot: 15,
        canUnlock: true,
        requiredReliability: RELIABLE_THRESHOLD,
        reason: "Day 9+ reached: Eligible to search for Reliable Reinforcement slot #15",
      };
    }

    if (campaignDay >= 6 && currentActiveCount < 14) {
      return {
        day: campaignDay,
        targetSlot: 14,
        canUnlock: true,
        requiredReliability: RELIABLE_THRESHOLD,
        reason: "Day 6+ reached: Eligible to search for Reliable Reinforcement slot #14",
      };
    }

    if (campaignDay >= 3 && currentActiveCount < 13) {
      return {
        day: campaignDay,
        targetSlot: 13,
        canUnlock: true,
        requiredReliability: RELIABLE_THRESHOLD,
        reason: "Day 3+ reached: Eligible to search for Reliable Reinforcement slot #13",
      };
    }

    return {
      day: campaignDay,
      targetSlot: null,
      canUnlock: false,
      requiredReliability: RELIABLE_THRESHOLD,
      reason: campaignDay < 3
        ? "Reinforcement slots unlock on Day 3 (#13), Day 6 (#14), and Day 9 (#15)"
        : "All available reinforcement slots for this campaign day are already occupied",
    };
  }

  /**
   * Calculates maximum active campaigns a tester can enroll in simultaneously.
   * Progressive limits: 3, 6, 9, 12, 15.
   */
  public static calculateTesterCampaignCapacity(completedCampaigns: number): number {
    if (completedCampaigns >= 10) return 15;
    if (completedCampaigns >= 7) return 12;
    if (completedCampaigns >= 4) return 9;
    if (completedCampaigns >= 2) return 6;
    return 3;
  }
}
