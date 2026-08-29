import { prisma } from "../../../core/database/prisma.js";
import {
  AppStatus,
  MissionStatus,
  UserStatus,
} from "@calltest/shared-types";
import { PlayStoreValidationService } from "../validation/play-store-validation.service.js";
import { GoogleGroupValidationService } from "../validation/google-group-validation.service.js";

export interface ReadinessCheck {
  code: string;
  name: string;
  passed: boolean;
  isBlocking: boolean;
  message: string;
}

export interface CampaignReadinessResult {
  campaignId: string;
  ready: boolean;
  checks: ReadinessCheck[];
  blockingReasons: string[];
  warnings: string[];
}

export class CampaignReadinessService {
  /**
   * Evaluates if a campaign fulfills all operational, store, group, and mission prerequisites to move to READY.
   */
  public static async evaluateReadiness(campaignId: string): Promise<CampaignReadinessResult> {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        app: {
          include: {
            developer: true,
          },
        },
        missions: true,
      },
    });

    if (!campaign) {
      throw new Error("Campaign not found");
    }

    const checks: ReadinessCheck[] = [];
    const blockingReasons: string[] = [];
    const warnings: string[] = [];

    // 1. App Status & Developer Account Health
    const isDevActive = campaign.app.developer.status === UserStatus.ACTIVE;
    checks.push({
      code: "DEVELOPER_ACTIVE",
      name: "Developer Account Active",
      passed: isDevActive,
      isBlocking: true,
      message: isDevActive ? "Developer account is in good standing" : "Developer account is suspended or restricted",
    });
    if (!isDevActive) blockingReasons.push("Developer account is suspended or restricted");

    const isAppActive = campaign.app.status !== AppStatus.SUSPENDED && campaign.app.status !== AppStatus.ARCHIVED;
    checks.push({
      code: "APP_ACTIVE",
      name: "Application Active",
      passed: isAppActive,
      isBlocking: true,
      message: isAppActive ? "Application is active" : "Application is archived or suspended",
    });
    if (!isAppActive) blockingReasons.push("Application is archived or suspended");

    // 2. Play Store URL Validation
    const playStoreValidation = await PlayStoreValidationService.validatePlayStoreUrl(
      campaign.app.playStoreUrl,
      campaign.app.packageName,
    );
    checks.push({
      code: "PLAY_STORE_URL_VALID",
      name: "Play Store URL & Package Match",
      passed: playStoreValidation.validUrl && playStoreValidation.packageMatches,
      isBlocking: true,
      message: playStoreValidation.message,
    });
    if (!playStoreValidation.validUrl || !playStoreValidation.packageMatches) {
      blockingReasons.push(`Play Store validation error: ${playStoreValidation.message}`);
    }

    // 3. Google Group URL Validation
    const groupValidation = await GoogleGroupValidationService.validateGoogleGroup(
      campaign.app.googleGroupUrl,
    );
    checks.push({
      code: "GOOGLE_GROUP_VALID",
      name: "Google Group URL Valid",
      passed: groupValidation.valid,
      isBlocking: true,
      message: groupValidation.message,
    });
    if (!groupValidation.valid) {
      blockingReasons.push(`Google Group validation error: ${groupValidation.message}`);
    }

    // 4. Developer Confirmation of Real Device Testing
    const confirmedLinks = campaign.developerConfirmedLinksTest === true;
    checks.push({
      code: "DEVELOPER_CONFIRMED_LINKS_TEST",
      name: "Manual Device Link Verification",
      passed: confirmedLinks,
      isBlocking: true,
      message: confirmedLinks
        ? "Developer has confirmed testing links on a real mobile device"
        : "Developer has not yet confirmed testing the links from a real phone",
    });
    if (!confirmedLinks) {
      blockingReasons.push("Developer must test and confirm links from a real mobile device before activation");
    }

    // 5. Mission Inventory (At least 1 active/approved mission)
    const activeOrApprovedMissions = campaign.missions.filter(
      (m) => m.status === MissionStatus.ACTIVE || m.status === MissionStatus.APPROVED,
    );
    const hasActiveMissions = activeOrApprovedMissions.length >= 1;
    checks.push({
      code: "MISSIONS_AVAILABLE",
      name: "Active/Approved Testing Missions",
      passed: hasActiveMissions,
      isBlocking: true,
      message: hasActiveMissions
        ? `${activeOrApprovedMissions.length} mission(s) ready for testers`
        : "Campaign must have at least 1 approved or active mission",
    });
    if (!hasActiveMissions) {
      blockingReasons.push("At least 1 approved/active mission is required to start the campaign");
    }

    // 6. Campaign Standard Configuration
    const isTargetTestersValid = campaign.targetTesters === 12;
    checks.push({
      code: "TARGET_TESTERS_CONFIG",
      name: "Target Testers (12)",
      passed: isTargetTestersValid,
      isBlocking: true,
      message: `Target active testers is configured to ${campaign.targetTesters}`,
    });
    if (!isTargetTestersValid) {
      blockingReasons.push("Target active testers must be set to 12");
    }

    const ready = blockingReasons.length === 0;

    return {
      campaignId,
      ready,
      checks,
      blockingReasons,
      warnings,
    };
  }
}
