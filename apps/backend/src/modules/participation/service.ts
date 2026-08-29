import { prisma } from "../../core/database/prisma.js";
import {
  AttemptStatus,
  EvidenceStatus,
  InstallationStatus,
  ParticipationStatus,
  TesterStatus,
} from "@calltest/shared-types";
import { NotFoundError } from "../../core/errors/app-error.js";

export interface TesterParticipationEvaluation {
  testerId: string;
  campaignId: string;
  installationStatus: InstallationStatus;
  participationStatus: ParticipationStatus;
  isInstallationVerified: boolean;
  isParticipationVerified: boolean;
  validatedMissionsCount: number;
  approvedEvidencesCount: number;
  activityScore: number;
  activityState: string;
}

export interface CampaignParticipationSummary {
  campaignId: string;
  assignedTestersCount: number;
  installationClaimedCount: number;
  installationVerifiedCount: number;
  participationVerifiedCount: number;
  pendingVerificationCount: number;
  activeTestersCount: number;
  lowActivityTestersCount: number;
  abandonedTestersCount: number;
  completedTestersCount: number;
  missionsSummary: {
    totalMissions: number;
    completedAttempts: number;
    pendingAttempts: number;
    rejectedAttempts: number;
  };
}

export class ParticipationVerificationService {
  /**
   * Evaluates participation status for a single tester in a campaign.
   * STRICT PRINCIPLE: Never considers INSTALL_CLAIMED as VERIFIED, nor VERIFIED as automatically ACTIVE.
   */
  public static async evaluateParticipation(
    campaignId: string,
    testerId: string,
  ): Promise<TesterParticipationEvaluation> {
    const campaignTester = await prisma.campaignTester.findFirst({
      where: { campaignId, testerId },
      include: {
        missionAttempts: true,
        campaign: { include: { app: true } },
      },
    });

    if (!campaignTester) {
      throw new NotFoundError("Tester participation not found");
    }

    const installation = await prisma.installationRecord.findUnique({
      where: {
        campaignId_testerId: {
          campaignId,
          testerId,
        },
      },
    });

    const instStatus = (installation?.status as unknown as InstallationStatus) || InstallationStatus.NOT_STARTED;

    // Count validated mission attempts and approved evidences
    const validatedAttempts = campaignTester.missionAttempts.filter(
      (a) => a.status === AttemptStatus.VALIDATED,
    );

    const approvedEvidences = await prisma.missionEvidence.count({
      where: {
        campaignId,
        testerId,
        status: EvidenceStatus.APPROVED,
      },
    });

    // Determine Installation Verified
    const isInstallationVerified =
      instStatus === InstallationStatus.INSTALL_DETECTED ||
      instStatus === InstallationStatus.FIRST_OPEN ||
      approvedEvidences > 0;

    // Determine Participation Status
    let partStatus: ParticipationStatus = ParticipationStatus.UNVERIFIED;

    if (campaignTester.status === TesterStatus.COMPLETED) {
      partStatus = ParticipationStatus.COMPLETED;
    } else if (campaignTester.status === TesterStatus.ABANDONED) {
      partStatus = ParticipationStatus.ABANDONED;
    } else if (campaignTester.status === TesterStatus.LOW_ACTIVITY) {
      partStatus = ParticipationStatus.LOW_ACTIVITY;
    } else if (isInstallationVerified && validatedAttempts.length > 0) {
      partStatus = ParticipationStatus.VERIFIED;
      if (campaignTester.status === TesterStatus.ACTIVE) {
        partStatus = ParticipationStatus.ACTIVE;
      }
    } else if (instStatus === InstallationStatus.INSTALL_CLAIMED || validatedAttempts.length > 0) {
      partStatus = ParticipationStatus.PARTIALLY_VERIFIED;
    }

    const isParticipationVerified =
      partStatus === ParticipationStatus.VERIFIED ||
      partStatus === ParticipationStatus.ACTIVE ||
      partStatus === ParticipationStatus.COMPLETED;

    return {
      testerId,
      campaignId,
      installationStatus: instStatus,
      participationStatus: partStatus,
      isInstallationVerified,
      isParticipationVerified,
      validatedMissionsCount: validatedAttempts.length,
      approvedEvidencesCount: approvedEvidences,
      activityScore: campaignTester.activityScore,
      activityState: campaignTester.status,
    };
  }

  /**
   * Aggregates campaign-wide participation metrics for Developer Dashboard.
   */
  public static async getCampaignParticipationSummary(
    campaignId: string,
  ): Promise<CampaignParticipationSummary> {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        campaignTesters: {
          include: {
            missionAttempts: true,
          },
        },
        missions: true,
        installationRecords: true,
      },
    });

    if (!campaign) {
      throw new NotFoundError("Campaign not found");
    }

    let claimedCount = 0;
    let verifiedInstCount = 0;
    let verifiedPartCount = 0;
    let pendingVerificationCount = 0;
    let activeCount = 0;
    let lowActivityCount = 0;
    let abandonedCount = 0;
    let completedCount = 0;

    let completedAttempts = 0;
    let pendingAttempts = 0;
    let rejectedAttempts = 0;

    const campaignTesters = campaign.campaignTesters || [];
    const missions = campaign.missions || [];
    const installationRecords = campaign.installationRecords || [];

    for (const ct of campaignTesters) {
      if (ct.status === TesterStatus.ACTIVE) activeCount++;
      else if (ct.status === TesterStatus.LOW_ACTIVITY) lowActivityCount++;
      else if (ct.status === TesterStatus.ABANDONED) abandonedCount++;
      else if (ct.status === TesterStatus.COMPLETED) completedCount++;

      const attempts = ct.missionAttempts || [];
      for (const attempt of attempts) {
        if (attempt.status === AttemptStatus.VALIDATED) completedAttempts++;
        else if (attempt.status === AttemptStatus.STARTED || attempt.status === AttemptStatus.SUBMITTED) {
          pendingAttempts++;
        } else if (attempt.status === AttemptStatus.REJECTED) {
          rejectedAttempts++;
        }
      }

      const inst = installationRecords.find((ir) => ir.testerId === ct.testerId);
      const instStat = (inst?.status as unknown as InstallationStatus) || InstallationStatus.NOT_STARTED;

      if (instStat === InstallationStatus.INSTALL_CLAIMED) {
        claimedCount++;
      } else if (
        instStat === InstallationStatus.INSTALL_DETECTED ||
        instStat === InstallationStatus.FIRST_OPEN
      ) {
        verifiedInstCount++;
      }

      const hasValidated = ct.missionAttempts.some((a) => a.status === AttemptStatus.VALIDATED);
      if (
        (instStat === InstallationStatus.INSTALL_DETECTED || instStat === InstallationStatus.FIRST_OPEN || hasValidated) &&
        hasValidated
      ) {
        verifiedPartCount++;
      } else {
        pendingVerificationCount++;
      }
    }

    return {
      campaignId,
      assignedTestersCount: campaignTesters.length,
      installationClaimedCount: claimedCount,
      installationVerifiedCount: verifiedInstCount,
      participationVerifiedCount: verifiedPartCount,
      pendingVerificationCount,
      activeTestersCount: activeCount,
      lowActivityTestersCount: lowActivityCount,
      abandonedTestersCount: abandonedCount,
      completedTestersCount: completedCount,
      missionsSummary: {
        totalMissions: missions.length,
        completedAttempts,
        pendingAttempts,
        rejectedAttempts,
      },
    };
  }
}
