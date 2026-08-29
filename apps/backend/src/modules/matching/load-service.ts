import { prisma } from "../../core/database/prisma.js";
import { CampaignStatus, TesterStatus } from "@calltest/shared-types";
import { TesterExposureService, ExposureDetails } from "./exposure-service.js";

export interface TesterLoad {
  userId: string;
  activeCampaignsCount: number;
  maxActiveCampaigns: number;
  canAcceptMore: boolean;
  exposure: ExposureDetails;
}

export class TesterLoadService {
  /**
   * Calculates current workload for a tester and verifies if they can accept more active campaigns.
   * Prevents multi-developer multi-app overload.
   */
  public static async calculateLoad(userId: string): Promise<TesterLoad> {
    const exposure = await TesterExposureService.getExposureDetails(userId);

    const activeCampaignsCount = await prisma.campaignTester.count({
      where: {
        testerId: userId,
        status: {
          in: [TesterStatus.INVITED, TesterStatus.ACTIVE, TesterStatus.LOW_ACTIVITY],
        },
        campaign: {
          status: {
            in: [CampaignStatus.READY, CampaignStatus.ACTIVE, CampaignStatus.TESTING],
          },
        },
      },
    });

    const canAcceptMore = activeCampaignsCount < exposure.maxActiveCampaigns;

    return {
      userId,
      activeCampaignsCount,
      maxActiveCampaigns: exposure.maxActiveCampaigns,
      canAcceptMore,
      exposure,
    };
  }
}
