import { prisma } from "../../core/database/prisma.js";
import { UserRole, UserStatus, TesterStatus, ReputationStatus } from "@calltest/shared-types";
import { TesterLoadService, TesterLoad } from "./load-service.js";
import { TrustProfileService } from "../trust/trust-profile-service.js";

export interface CompatibilityResult {
  isCompatible: boolean;
  reason?: string;
  load?: TesterLoad;
}

export class CampaignCompatibilityService {
  /**
   * Evaluates if a candidate tester is strictly eligible and compatible with a campaign.
   * Enforces role requirements, capacity limits, reputation restrictions, and self-testing restrictions.
   */
  public static async evaluateCompatibility(
    campaignId: string,
    testerId: string,
  ): Promise<CompatibilityResult> {
    const [user, campaign, trustProfile] = await Promise.all([
      prisma.user.findUnique({
        where: { id: testerId },
      }),
      prisma.campaign.findUnique({
        where: { id: campaignId },
        include: { app: true },
      }),
      TrustProfileService.getOrCreateProfile(testerId),
    ]);

    if (!user || !campaign) {
      return { isCompatible: false, reason: "USER_OR_CAMPAIGN_NOT_FOUND" };
    }

    // 1. User status check
    if (user.status !== UserStatus.ACTIVE) {
      return { isCompatible: false, reason: "USER_NOT_ACTIVE" };
    }

    // 2. CRITICAL: Self-testing rejection (Developer cannot test their own application)
    if (campaign.app.developerId === testerId) {
      return { isCompatible: false, reason: "SELF_TESTING_NOT_ALLOWED" };
    }

    // 3. Role check (must have TESTER capability, i.e. TESTER or BOTH)
    if (user.role !== UserRole.TESTER && user.role !== UserRole.BOTH && user.role !== UserRole.ADMIN) {
      return { isCompatible: false, reason: "INSUFFICIENT_ROLE" };
    }

    // 4. Reputation restriction check
    if (
      trustProfile.reputationStatus === ReputationStatus.SUSPENDED ||
      trustProfile.reputationStatus === ReputationStatus.BANNED
    ) {
      return { isCompatible: false, reason: "USER_SUSPENDED_OR_BANNED" };
    }

    // 5. Duplicate active participation check
    const existingParticipation = await prisma.campaignTester.findFirst({
      where: {
        campaignId,
        testerId,
        status: {
          in: [TesterStatus.INVITED, TesterStatus.ACTIVE, TesterStatus.LOW_ACTIVITY],
        },
      },
    });

    if (existingParticipation) {
      return { isCompatible: false, reason: "ALREADY_PARTICIPATING" };
    }

    // 6. Workload capacity check
    const load = await TesterLoadService.calculateLoad(testerId);
    let maxAllowedCampaigns = load.maxActiveCampaigns;

    // Restricted reputation caps max active campaigns to 1
    if (trustProfile.reputationStatus === ReputationStatus.RESTRICTED) {
      maxAllowedCampaigns = Math.min(1, maxAllowedCampaigns);
    }

    if (load.activeCampaignsCount >= maxAllowedCampaigns) {
      return { isCompatible: false, reason: "CAPACITY_EXCEEDED", load };
    }

    return {
      isCompatible: true,
      load,
    };
  }
}
