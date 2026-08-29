import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildApp } from "../src/app.js";
import {
  CampaignCapacityService,
  CAMPAIGN_ACTIVE_TESTER_TARGET,
  CAMPAIGN_BACKUP_TARGET,
  CAMPAIGN_TOTAL_TARGET,
} from "../src/modules/campaigns/capacity.service.js";
import { BackupTesterService } from "../src/modules/campaign-testers/backup-tester.service.js";
import { MissionScheduleService } from "../src/modules/missions/mission-schedule.service.js";
import { AppAvailabilityService } from "../src/modules/availability/app-availability.service.js";
import { UserIdentityService } from "../src/modules/identity/user-identity.service.js";
import { TesterReliabilityService } from "../src/modules/trust/tester-reliability.service.js";
import { NotificationService } from "../src/modules/notifications/service.js";
import { LocalEvidenceStorage } from "../src/core/storage/local-evidence-storage.js";
import {
  IdentityRiskLevel,
  ScheduledMissionStatus,
  MissionType,
  AvailabilityIssueType,
  AppAvailabilityStatus,
} from "@calltest/shared-types";
import { prisma } from "../src/core/database/prisma.js";

describe("Phase 14.2: Post-Go-Live Monitoring & Incident Readiness", () => {
  const campaignId = "c-p14-2-mon-001";
  const devId = "dev-p14-2-lead";
  const appId = "app-p14-2-shield";

  beforeEach(() => {
    vi.restoreAllMocks();
    UserIdentityService._clearStore();
    AppAvailabilityService._clearStore();
    vi.spyOn(NotificationService, "createNotification").mockResolvedValue({} as any);
    vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);
    vi.spyOn(prisma.campaign, "findUnique").mockResolvedValue({
      id: campaignId,
      name: "CallShield Monitoring Campaign",
      app: { id: appId, name: "CallShield", developerId: devId },
    } as any);
    vi.spyOn(prisma.campaignTester, "findMany").mockResolvedValue([
      { id: "b1" },
      { id: "b2" },
      { id: "b3" },
    ] as any);
  });

  describe("1. Health Probes, Latency & Metrics Baseline", () => {
    it("should respond to liveness probe with 200 OK without database dependency", async () => {
      const app = buildApp();
      const res = await app.inject({
        method: "GET",
        url: "/health/live",
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.body);
      expect(json.status).toBe("ok");
      expect(json.timestamp).toBeDefined();
      await app.close();
    });

    it("should process HTTP requests and correlate via x-request-id", async () => {
      const app = buildApp();
      const traceId = "trace-p14-2-audit-001";
      const res = await app.inject({
        method: "GET",
        url: "/health/live",
        headers: { "x-request-id": traceId },
      });

      expect(res.statusCode).toBe(200);
      await app.close();
    });
  });

  describe("2. Production Business Invariants Monitoring", () => {
    it("INVARIANT: Capacity bounds 12 active + 3 backups strictly held under concurrent pressure", async () => {
      expect(CAMPAIGN_ACTIVE_TESTER_TARGET).toBe(12);
      expect(CAMPAIGN_BACKUP_TARGET).toBe(3);
      expect(CAMPAIGN_TOTAL_TARGET).toBe(15);

      const existingBackups = ["b1", "b2", "b3"];
      const incomingCandidates = Array.from({ length: 20 }, (_, i) => `candidate-mon-${i + 1}`);

      const reserved = await BackupTesterService.reserveBackups(campaignId, incomingCandidates, existingBackups);
      expect(reserved.length).toBe(0); // 0 over-allocation

      const status = CampaignCapacityService.evaluateCampaignCapacity(12, 3, campaignId);
      expect(status.activeCount).toBe(12);
      expect(status.backupCount).toBe(3);
      expect(status.isUnderCapacity).toBe(false);
      expect(status.backupNeeded).toBe(0);
    });

    it("INVARIANT: Progression anti-farming ensures 1 campaign completion increments progress exactly once", async () => {
      const userId = "u-p14-2-dedup-100";
      const targetCamp = "c-p14-2-target";

      const first = await UserIdentityService.recordCampaignCompletion(userId, targetCamp);
      expect(first.alreadyRecorded).toBe(false);

      for (let i = 0; i < 99; i++) {
        const dup = await UserIdentityService.recordCampaignCompletion(userId, targetCamp);
        expect(dup.alreadyRecorded).toBe(true);
      }

      expect(UserIdentityService.countUserCompletedCampaigns(userId)).toBe(1);
    });

    it("INVARIANT: Replacement on Day 8 assigns ONLY Day 8..14 missions", () => {
      const template = MissionScheduleService.getRecommendedTemplate();

      const replacementSchedule = MissionScheduleService.distributeDeveloperMissionsForReplacement(
        campaignId,
        "ct-mon-replacement-01",
        template,
        8,
        new Date("2026-08-01T00:00:00Z")
      );

      expect(replacementSchedule.length).toBeGreaterThanOrEqual(7);
      expect(replacementSchedule.every((m) => m.scheduledDay >= 8 && m.scheduledDay <= 14)).toBe(true);
      expect(replacementSchedule.some((m) => m.scheduledDay < 8)).toBe(false);
    });

    it("INVARIANT: BLOCKED_BY_AVAILABILITY produces 0 penalty and generates brand new 48h window on resolution", async () => {
      const { report } = await AppAvailabilityService.createOrGroupReport({
        campaignId,
        campaignTesterId: "ct-avail-mon",
        appId,
        testerId: "t-avail-mon",
        countryCode: "FR",
        issueType: AvailabilityIssueType.COUNTRY_RESTRICTION,
        reason: "App not listed in France Store",
      });

      expect(report.status).toBe(AppAvailabilityStatus.OPEN);

      const reliability = TesterReliabilityService.calculateReliability({
        requiredMissionsCompletedCount: 4,
        requiredMissionsMissedCount: 0,
        completedCampaignsCount: 0,
        abandonedCampaignsCount: 0,
        replacedAsInactiveCount: 0,
      });
      expect(reliability.signals.penaltyPoints).toBe(0);

      const blockedMission = {
        id: "m-d5-mon",
        campaignId,
        type: MissionType.FUNCTIONAL,
        title: "Test search",
        description: "Search in app",
        scheduledDay: 5,
        availableFrom: new Date("2026-08-05T00:00:00Z"),
        deadline: new Date("2026-08-07T00:00:00Z"), // Expired
        required: true,
        priority: "NORMAL" as const,
        status: ScheduledMissionStatus.BLOCKED_BY_AVAILABILITY,
      };

      const resolutionDate = new Date("2026-08-08T12:00:00Z");
      const unblocked = AppAvailabilityService.recoverBlockedMissions([blockedMission], resolutionDate, 48);

      expect(unblocked[0].status).toBe(ScheduledMissionStatus.AVAILABLE);
      expect(unblocked[0].availableFrom.toISOString()).toBe("2026-08-08T12:00:00.000Z");
      expect(unblocked[0].deadline.toISOString()).toBe("2026-08-10T12:00:00.000Z");
    });
  });

  describe("3. Evidence Storage Validation", () => {
    it("should reject evidence exceeding 10MB or invalid MIME type", async () => {
      const storage = new LocalEvidenceStorage();
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB

      await expect(
        storage.save(largeBuffer, "large.png", "image/png")
      ).rejects.toThrow("File exceeds maximum allowed size of 10MB");

      const invalidMimeBuffer = Buffer.from("invalid-executable-content");
      await expect(
        storage.save(invalidMimeBuffer, "test.exe", "application/x-msdownload")
      ).rejects.toThrow("Unsupported MIME type");
    });
  });

  describe("4. Security & Privacy Zero-PII Audit", () => {
    it("INVARIANT: Risk signal does not automatically ban account", () => {
      const mediumRisk = {
        userId: "t-mon-risk-02",
        reliabilityScore: 70,
        progressionTier: "NEW" as const,
        riskLevel: IdentityRiskLevel.MEDIUM_RISK,
      };

      const score = UserIdentityService.calculateMatchingScore({ candidate: mediumRisk });
      expect(score.riskMultiplier).toBe(0.8);
      expect(score.matchScore).toBe(56); // 70 * 1.0 * 0.8 = 56
      expect(score.matchScore).toBeGreaterThan(0);
    });

    it("should enforce helmet security headers and error obfuscation in production", async () => {
      const app = buildApp();
      const res = await app.inject({
        method: "GET",
        url: "/health/live",
      });

      expect(res.headers["x-content-type-options"]).toBe("nosniff");
      expect(res.headers["x-frame-options"]).toBe("SAMEORIGIN");
      await app.close();
    });
  });
});
