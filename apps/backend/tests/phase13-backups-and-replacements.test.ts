import { describe, it, expect, vi, beforeEach } from "vitest";
import { BackupTesterService } from "../src/modules/campaign-testers/backup-tester.service.js";
import { ReplacementService } from "../src/modules/campaign-testers/replacement.service.js";
import { NotificationService } from "../src/modules/notifications/service.js";
import { prisma } from "../src/core/database/prisma.js";
import { TesterAssignmentType, TesterStatus } from "@calltest/shared-types";

describe("Phase 13: 3 Backups & Automated Replacement Workflows", () => {
  const campaignId = "c1111111-0000-0000-0000-000000000001";
  const devId = "d1111111-0000-0000-0000-000000000001";

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(NotificationService, "createNotification").mockResolvedValue({} as any);
    vi.spyOn(prisma.notification, "findUnique").mockResolvedValue(null);
    vi.spyOn(prisma.notification, "create").mockResolvedValue({} as any);
  });

  it("1. should reserve up to exactly 3 backup testers for a campaign", async () => {
    vi.spyOn(prisma.campaignTester, "findMany").mockResolvedValue([]);
    const createSpy = vi.spyOn(prisma.campaignTester, "create").mockImplementation(async (args: any) => ({
      id: `bk-${args.data.testerId}`,
      ...args.data,
    }));
    vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

    const backupCandidateIds = ["t-b1", "t-b2", "t-b3", "t-b4"];
    const assignedIds = await BackupTesterService.reserveBackups(campaignId, backupCandidateIds);

    expect(assignedIds.length).toBe(3); // Capped at exactly 3
    expect(createSpy).toHaveBeenCalledTimes(3);
  });

  it("2. should replace abandoned tester by activating reserved backup", async () => {
    const abandonedAssignmentId = "ct-abandoned-1";
    const backupAssignmentId = "ct-backup-1";

    vi.spyOn(prisma.campaignTester, "findUnique").mockImplementation(async (args: any) => {
      if (args.where.id === abandonedAssignmentId) {
        return {
          id: abandonedAssignmentId,
          campaignId,
          testerId: "t-abandoned",
          status: TesterStatus.ACTIVE,
          campaign: {
            id: campaignId,
            name: "Test App Campaign",
            app: { developerId: devId, name: "Test App" },
          },
          tester: { displayName: "Tester Abandoned" },
        } as any;
      }
      if (args.where.id === backupAssignmentId) {
        return {
          id: backupAssignmentId,
          campaignId,
          testerId: "t-backup-1",
          assignmentType: TesterAssignmentType.BACKUP,
          status: TesterStatus.INVITED,
        } as any;
      }
      return null;
    });

    vi.spyOn(prisma.campaignTester, "findFirst").mockResolvedValue({
      id: backupAssignmentId,
      campaignId,
      testerId: "t-backup-1",
      assignmentType: TesterAssignmentType.BACKUP,
      status: TesterStatus.INVITED,
      tester: { displayName: "Backup Tester One" },
    } as any);

    const updateSpy = vi.spyOn(prisma.campaignTester, "update").mockImplementation(async (args: any) => ({
      id: args.where.id,
      ...args.data,
    }));

    vi.spyOn(prisma.notification, "create").mockResolvedValue({} as any);
    vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

    const result = await ReplacementService.replaceAbandonedTester(abandonedAssignmentId);

    expect(result.source).toBe("BACKUP");
    expect(result.replacementTesterId).toBe("t-backup-1");
    // Verify backup activated as REPLACEMENT and ACTIVE
    expect(updateSpy).toHaveBeenCalledWith({
      where: { id: backupAssignmentId },
      data: expect.objectContaining({
        assignmentType: TesterAssignmentType.REPLACEMENT,
        status: TesterStatus.ACTIVE,
        isReplacement: true,
      }),
    });
  });

  it("3. should fallback to searching matching pool when no backups are available", async () => {
    const abandonedAssignmentId = "ct-abandoned-2";

    vi.spyOn(prisma.campaignTester, "findUnique").mockResolvedValue({
      id: abandonedAssignmentId,
      campaignId,
      testerId: "t-abandoned-2",
      status: TesterStatus.ACTIVE,
      campaign: {
        id: campaignId,
        name: "Test App Campaign",
        app: { developerId: devId, name: "Test App" },
      },
      tester: { displayName: "Tester Abandoned 2" },
    } as any);

    // No backup available
    vi.spyOn(prisma.campaignTester, "findFirst").mockResolvedValue(null);

    // Candidate found in matching pool
    vi.spyOn(prisma.user, "findFirst").mockResolvedValue({
      id: "t-matched-1",
      displayName: "Matched Candidate",
      trustScore: 85,
    } as any);

    vi.spyOn(prisma.campaignTester, "update").mockResolvedValue({} as any);
    vi.spyOn(prisma.campaignTester, "create").mockResolvedValue({
      id: "ct-matched-new",
      campaignId,
      testerId: "t-matched-1",
    } as any);
    vi.spyOn(prisma.notification, "create").mockResolvedValue({} as any);
    vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

    const result = await ReplacementService.replaceAbandonedTester(abandonedAssignmentId);

    expect(result.source).toBe("MATCHING_SEARCH");
    expect(result.replacementTesterId).toBe("t-matched-1");
  });
});
