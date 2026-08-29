import { prisma } from "../../core/database/prisma.js";
import { CampaignCapacityService } from "./capacity.service.js";
import { TesterStatus, TesterAssignmentType } from "@calltest/shared-types";

export interface TesterDashboardSummary {
  userId: string;
  level: number;
  xpBalance: number;
  reliabilityScore: number;
  activityScore: number;
  maxCampaignCapacity: number;
  activeCampaignsCount: number;
  pendingMissionsCount: number;
  upcomingMissionsCount: number;
  waitingCampaignsCount: number;
  campaigns: {
    campaignId: string;
    appName: string;
    campaignDay: number;
    daysRemaining: number;
    pendingMissions: number;
    status: string;
  }[];
}

export interface DeveloperDashboardSummary {
  campaignId: string;
  appName: string;
  campaignDay: number;
  totalDurationDays: number;
  status: string;
  testers: {
    activeCount: number;
    coreCount: number;
    reinforcementsCount: number;
    targetCount: number;
    maxCapacity: number;
    backupsCount: number;
    atRiskCount: number;
    replacementsCount: number;
  };
  missions: {
    totalCount: number;
    completedCount: number;
    pendingCount: number;
  };
  reports: {
    totalSubmitted: number;
    validatedCount: number;
  };
  aggregatedReliability: number;
}

export class DashboardService {
  /**
   * Generates tester dashboard summary.
   */
  public static async getTesterDashboard(testerId: string): Promise<TesterDashboardSummary> {
    const user = await prisma.user.findUnique({
      where: { id: testerId },
      include: {
        trustProfile: true,
        testerAssignments: {
          where: {
            status: { in: [TesterStatus.ACTIVE, TesterStatus.INVITED] },
            assignmentType: { not: TesterAssignmentType.BACKUP },
          },
          include: {
            campaign: {
              include: {
                app: true,
                missions: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const completedCampaigns = user.trustProfile?.completedCampaignsCount || 0;
    const maxCampaignCapacity = CampaignCapacityService.calculateTesterCampaignCapacity(completedCampaigns);
    const reliabilityScore = user.trustScore || 70;
    let pendingMissionsCount = 0;
    let upcomingMissionsCount = 0;

    const assignments = (user as any).testerAssignments || [];
    const campaigns = assignments.map((assignment: any) => {
      const startsAt = assignment.campaign.startsAt || assignment.campaign.createdAt;
      const daysSinceStart = Math.max(1, Math.floor((Date.now() - new Date(startsAt).getTime()) / (1000 * 60 * 60 * 24)));
      const daysRemaining = Math.max(0, assignment.campaign.durationDays - daysSinceStart);

      const missionCount = assignment.campaign.missions?.length || 0;
      const pendingForCampaign = Math.max(0, missionCount > 0 ? 1 : 0);
      pendingMissionsCount += pendingForCampaign;

      return {
        campaignId: assignment.campaignId,
        appName: assignment.campaign.app.name,
        campaignDay: daysSinceStart,
        daysRemaining,
        pendingMissions: pendingForCampaign,
        status: assignment.campaign.status,
      };
    });

    return {
      userId: user.id,
      level: Math.floor(user.xpBalance / 100) + 1,
      xpBalance: user.xpBalance,
      reliabilityScore,
      activityScore: 95,
      maxCampaignCapacity,
      activeCampaignsCount: assignments.length,
      pendingMissionsCount,
      upcomingMissionsCount,
      waitingCampaignsCount: Math.max(0, maxCampaignCapacity - assignments.length),
      campaigns,
    };
  }

  /**
   * Generates developer dashboard summary with ZERO tester PII.
   */
  public static async getDeveloperDashboard(campaignId: string): Promise<DeveloperDashboardSummary> {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        app: true,
        campaignTesters: {
          include: {
            tester: true,
          },
        },
        missions: {
          include: {
            attempts: true,
          },
        },
        testerReports: true,
      },
    });

    if (!campaign) {
      throw new Error("Campaign not found");
    }

    const startsAt = campaign.startsAt || campaign.createdAt;
    const daysSinceStart = Math.max(1, Math.floor((Date.now() - new Date(startsAt).getTime()) / (1000 * 60 * 60 * 24)));

    const activeAssignments = campaign.campaignTesters.filter(
      (ct: any) => ct.status === TesterStatus.ACTIVE && ct.assignmentType !== ("BACKUP" as any)
    );

    const coreCount = activeAssignments.filter((ct: any) => ct.assignmentType === TesterAssignmentType.PRIMARY || ct.assignmentType === ("CORE_TESTER" as any)).length;
    const reinforcementsCount = activeAssignments.filter((ct: any) => ct.assignmentType === TesterAssignmentType.PROTECTION || ct.assignmentType === ("RELIABLE_REINFORCEMENT" as any)).length;
    const backupsCount = campaign.campaignTesters.filter((ct: any) => ct.assignmentType === ("BACKUP" as any)).length;
    const atRiskCount = campaign.campaignTesters.filter((ct: any) => ct.status === TesterStatus.LOW_ACTIVITY).length;
    const replacementsCount = campaign.campaignTesters.filter((ct: any) => ct.isReplacement).length;

    let totalAttempts = 0;
    let completedAttempts = 0;
    campaign.missions.forEach((m) => {
      m.attempts.forEach((a) => {
        totalAttempts++;
        if (a.status === "VALIDATED") completedAttempts++;
      });
    });

    const validatedReports = campaign.testerReports.filter((r) => r.status === "VALID").length;

    const avgReliability =
      activeAssignments.length > 0
        ? Math.round(
            activeAssignments.reduce((acc, ct) => acc + (ct.tester.trustScore || 70), 0) /
              activeAssignments.length
          )
        : 80;

    return {
      campaignId: campaign.id,
      appName: campaign.app.name,
      campaignDay: daysSinceStart,
      totalDurationDays: campaign.durationDays,
      status: campaign.status,
      testers: {
        activeCount: activeAssignments.length,
        coreCount,
        reinforcementsCount,
        targetCount: campaign.targetTesters,
        maxCapacity: campaign.maxTesters,
        backupsCount,
        atRiskCount,
        replacementsCount,
      },
      missions: {
        totalCount: campaign.missions.length,
        completedCount: completedAttempts,
        pendingCount: Math.max(0, totalAttempts - completedAttempts),
      },
      reports: {
        totalSubmitted: campaign.testerReports.length,
        validatedCount: validatedReports,
      },
      aggregatedReliability: avgReliability,
    };
  }
}
