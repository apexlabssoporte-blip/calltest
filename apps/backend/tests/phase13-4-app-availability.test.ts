import { describe, it, expect, vi, beforeEach } from "vitest";
import { AppAvailabilityService } from "../src/modules/availability/app-availability.service.js";
import { TesterReliabilityService } from "../src/modules/trust/tester-reliability.service.js";
import { TesterActivityService } from "../src/modules/activity/tester-activity.service.js";
import { MissionScheduleService } from "../src/modules/missions/mission-schedule.service.js";
import { NotificationService } from "../src/modules/notifications/service.js";
import { prisma } from "../src/core/database/prisma.js";
import {
  AppAvailabilityStatus,
  AvailabilityIssueType,
  AvailabilityEvidenceType,
  ScheduledMissionStatus,
  NotificationType,
} from "@calltest/shared-types";

describe("Phase 13.4: App Availability & Country Verification", () => {
  const campaignId = "c-avail-001";
  const campaignTesterId = "ct-avail-001";
  const appId = "app-avail-001";
  const tester1Id = "t-mexico-1";
  const tester2Id = "t-mexico-2";
  const devId = "dev-owner-001";

  beforeEach(() => {
    vi.restoreAllMocks();
    AppAvailabilityService._clearStore();
    vi.spyOn(NotificationService, "createNotification").mockResolvedValue({} as any);
    vi.spyOn(prisma.campaign, "findUnique").mockResolvedValue({
      id: campaignId,
      name: "CallShield Global",
      app: { id: appId, name: "CallShield", developerId: devId },
    } as any);
    vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);
  });

  describe("1. Reporting, Deduplication & Country Grouping", () => {
    it("should create availability report and block mission attempt without penalty", async () => {
      const notifSpy = vi.spyOn(NotificationService, "createNotification");

      const result = await AppAvailabilityService.createOrGroupReport({
        campaignId,
        campaignTesterId,
        appId,
        testerId: tester1Id,
        countryCode: "MX",
        issueType: AvailabilityIssueType.COUNTRY_RESTRICTION,
        reason: "Esta aplicación no está disponible en tu país (Google Play México)",
      });

      expect(result.isDuplicate).toBe(false);
      expect(result.isGrouped).toBe(false);
      expect(result.report.status).toBe(AppAvailabilityStatus.OPEN);
      expect(result.report.affectedTestersCount).toBe(1);
      expect(result.report.countryCode).toBe("MX");

      // Developer and Tester notifications dispatched
      expect(notifSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: devId,
          type: NotificationType.AVAILABILITY_REPORT_RECEIVED,
        })
      );
      expect(notifSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: tester1Id,
          type: NotificationType.AVAILABILITY_REPORT_RECEIVED,
        })
      );
    });

    it("should prevent duplicate reports from the same tester for the same incident", async () => {
      // First submission
      await AppAvailabilityService.createOrGroupReport({
        campaignId,
        campaignTesterId,
        appId,
        testerId: tester1Id,
        countryCode: "MX",
        issueType: AvailabilityIssueType.COUNTRY_RESTRICTION,
        reason: "No disponible en MX",
      });

      // Duplicate submission by same tester
      const duplicateResult = await AppAvailabilityService.createOrGroupReport({
        campaignId,
        campaignTesterId,
        appId,
        testerId: tester1Id,
        countryCode: "MX",
        issueType: AvailabilityIssueType.COUNTRY_RESTRICTION,
        reason: "Intento repetido de reporte",
      });

      expect(duplicateResult.isDuplicate).toBe(true);
      expect(duplicateResult.report.affectedTestersCount).toBe(1);
    });

    it("should group multiple testers from the same country under single availability incident", async () => {
      // Tester 1 reports
      await AppAvailabilityService.createOrGroupReport({
        campaignId,
        campaignTesterId: "ct-1",
        appId,
        testerId: tester1Id,
        countryCode: "MX",
        issueType: AvailabilityIssueType.COUNTRY_RESTRICTION,
        reason: "No disponible en MX",
      });

      // Tester 2 from same country reports
      const groupedResult = await AppAvailabilityService.createOrGroupReport({
        campaignId,
        campaignTesterId: "ct-2",
        appId,
        testerId: tester2Id,
        countryCode: "MX",
        issueType: AvailabilityIssueType.COUNTRY_RESTRICTION,
        reason: "Tampoco puedo instalar en MX",
      });

      expect(groupedResult.isGrouped).toBe(true);
      expect(groupedResult.isDuplicate).toBe(false);
      expect(groupedResult.report.affectedTestersCount).toBe(2);
      expect(groupedResult.report.affectedTesterIds).toContain(tester1Id);
      expect(groupedResult.report.affectedTesterIds).toContain(tester2Id);
    });
  });

  describe("2. Evidence Submission & Review Resolution", () => {
    it("should request and accept Google Play Console screenshot evidence from developer", async () => {
      const { report } = await AppAvailabilityService.createOrGroupReport({
        campaignId,
        campaignTesterId,
        appId,
        testerId: tester1Id,
        countryCode: "MX",
        issueType: AvailabilityIssueType.COUNTRY_RESTRICTION,
        reason: "No disponible en MX",
      });

      // Step 1: Request evidence
      const updatedReport = await AppAvailabilityService.requestDeveloperEvidence(report.id, devId);
      expect(updatedReport.status).toBe(AppAvailabilityStatus.AWAITING_DEVELOPER_EVIDENCE);

      // Step 2: Developer submits Google Play Console evidence
      const evidence = await AppAvailabilityService.submitDeveloperEvidence({
        reportId: report.id,
        developerId: devId,
        evidenceType: AvailabilityEvidenceType.GOOGLE_PLAY_CONSOLE_SCREENSHOT,
        fileReference: "evidence/play_console_mexico_distribution.png",
        notes: "Captura de Google Play Console mostrando México habilitado en producción y testing cerrado",
      });

      expect(evidence.evidenceType).toBe(AvailabilityEvidenceType.GOOGLE_PLAY_CONSOLE_SCREENSHOT);
      expect(updatedReport.evidence.length).toBe(1);
      expect(updatedReport.status).toBe(AppAvailabilityStatus.UNDER_REVIEW);
    });

    it("should resolve report as AVAILABLE or RESTRICTED and notify all affected testers", async () => {
      const { report } = await AppAvailabilityService.createOrGroupReport({
        campaignId,
        campaignTesterId,
        appId,
        testerId: tester1Id,
        countryCode: "MX",
        issueType: AvailabilityIssueType.COUNTRY_RESTRICTION,
        reason: "No disponible en MX",
      });

      const notifSpy = vi.spyOn(NotificationService, "createNotification");

      const resolved = await AppAvailabilityService.resolveAvailabilityReport({
        reportId: report.id,
        reviewerId: "admin-reviewer-1",
        resolutionStatus: AppAvailabilityStatus.RESTRICTED,
        resolutionNotes: "Confirmado que la app está restringida en México por regulaciones locales",
      });

      expect(resolved.status).toBe(AppAvailabilityStatus.RESOLVED);
      expect(resolved.resolution).toContain("RESTRICTED");

      expect(notifSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: tester1Id,
          type: NotificationType.AVAILABILITY_RESOLVED,
        })
      );
    });
  });

  describe("3. Tester Reliability & Activity Protection Invariants", () => {
    it("INVARIANT: blocked mission by availability generates ZERO reliability penalty", () => {
      // Baseline: 10 required completed, 0 missed
      const baseline = TesterReliabilityService.calculateReliability({
        requiredMissionsCompletedCount: 10,
        requiredMissionsMissedCount: 0,
        completedCampaignsCount: 1,
        abandonedCampaignsCount: 0,
        replacedAsInactiveCount: 0,
        initialBaseScore: 70,
      });

      // Tester with 1 mission blocked by availability: missed count is NOT incremented
      const withBlockedMission = TesterReliabilityService.calculateReliability({
        requiredMissionsCompletedCount: 10,
        requiredMissionsMissedCount: 0, // Blocked mission is NOT missed
        completedCampaignsCount: 1,
        abandonedCampaignsCount: 0,
        replacedAsInactiveCount: 0,
        initialBaseScore: 70,
      });

      expect(withBlockedMission.score).toBe(baseline.score);
    });

    it("INVARIANT: tester with blocked mission is NOT marked AT_RISK or INACTIVE", () => {
      const result = TesterActivityService.evaluateActivity({
        lastActivityAt: new Date(Date.now() - 72 * 60 * 60 * 1000), // 72h passed
        pendingMissionsCount: 0, // Blocked mission does not count as pending actionable
        hasOverdueMission: false,
      });

      expect(result.state).toBe("ACTIVE");
      expect(result.canRecover).toBe(false);
    });
  });

  describe("4. Daily Inbox Rendering for Blocked Missions", () => {
    it("should render BLOCKED_BY_AVAILABILITY clearly without false required pending penalty", () => {
      const userId = "u-tester-blocked";
      const now = new Date("2026-08-01T10:00:00Z");

      const schedules = [
        {
          campaignId,
          appName: "CallShield",
          campaignDay: 1,
          missions: [
            {
              id: "m-install-blocked",
              campaignId,
              type: "INSTALL" as any,
              title: "Instalar aplicación",
              description: "Descarga desde Google Play",
              scheduledDay: 1,
              required: true,
              priority: "CRITICAL" as const,
              status: ScheduledMissionStatus.BLOCKED_BY_AVAILABILITY,
            },
          ],
        },
      ];

      const inbox = MissionScheduleService.aggregateDailyInbox(userId, schedules, now);

      expect(inbox.totalPendingToday).toBe(1);
      expect(inbox.totalRequiredPendingToday).toBe(0); // Protected: not treated as actionable required pending
      expect(inbox.tabs.pending[0].description).toContain("Bloqueada por disponibilidad");
    });
  });

  describe("5. End-to-End Simulation: Availability Dispute & Full Lifecycle", () => {
    it("should simulate full lifecycle: Day 1 report -> blocked -> evidence review -> resolution -> Day 14 completion", async () => {
      // 1. Day 1: Tester reports availability issue
      const { report } = await AppAvailabilityService.createOrGroupReport({
        campaignId,
        campaignTesterId,
        appId,
        testerId: tester1Id,
        countryCode: "MX",
        issueType: AvailabilityIssueType.COUNTRY_RESTRICTION,
        reason: "App not available in Mexico store",
      });

      expect(report.status).toBe(AppAvailabilityStatus.OPEN);

      // 2. Day 2: Developer submits Google Play Console screenshot
      await AppAvailabilityService.submitDeveloperEvidence({
        reportId: report.id,
        developerId: devId,
        evidenceType: AvailabilityEvidenceType.GOOGLE_PLAY_CONSOLE_SCREENSHOT,
        fileReference: "console_mexico_ok.png",
      });

      // 3. Day 3: Verified as AVAILABLE (e.g. rollout propagation completed)
      await AppAvailabilityService.resolveAvailabilityReport({
        reportId: report.id,
        reviewerId: "admin-1",
        resolutionStatus: AppAvailabilityStatus.AVAILABLE,
        resolutionNotes: "Google Play Console propagation completed; app is now live in MX",
      });

      // 4. Tester completes remaining days through Day 14
      const reliabilityResult = TesterReliabilityService.calculateReliability({
        requiredMissionsCompletedCount: 14,
        requiredMissionsMissedCount: 0,
        completedCampaignsCount: 1,
        abandonedCampaignsCount: 0,
        replacedAsInactiveCount: 0,
        initialBaseScore: 75,
      });

      expect(reliabilityResult.score).toBeGreaterThanOrEqual(85);
      expect(reliabilityResult.tier).toBe("HIGHLY_RELIABLE");
    });
  });
});
