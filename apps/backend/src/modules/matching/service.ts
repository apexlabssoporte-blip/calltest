import { prisma } from "../../core/database/prisma.js";
import { AuditService } from "../../core/services/audit-service.js";
import { CampaignHealthService, CampaignHealthMetrics } from "../campaign-health/service.js";
import { DefaultMatchingStrategy, MatchingStrategy } from "./matching-strategy.js";
import { verifyCampaignOwnership } from "../../core/middlewares/rbac-guard.js";
import {
  AuditAction,
  TesterAssignmentType,
  TesterStatus,
  UserRole,
} from "@calltest/shared-types";
import { NotFoundError } from "../../core/errors/app-error.js";

export interface MatchingEvaluationResult {
  campaignId: string;
  assignedCount: number;
  reason?: string;
  health: CampaignHealthMetrics;
  assignedTesters: {
    testerId: string;
    campaignTesterId: string;
    score: number;
    joinedAt: Date;
    expectedEndAt: Date;
    isReplacement: boolean;
  }[];
}

export class MatchingEngine {
  private static readonly strategy: MatchingStrategy = new DefaultMatchingStrategy();

  /**
   * Evaluates campaign health and algorithmically executes replacement assignments with concurrency control.
   */
  public static async evaluateAndAssignReplacements(
    campaignId: string,
    actorId: string,
    actorRole: UserRole,
    context?: { ipAddress?: string; userAgent?: string },
  ): Promise<MatchingEvaluationResult> {
    await verifyCampaignOwnership(campaignId, actorId, actorRole);

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundError("Campaign not found");
    }

    // 1. Calculate campaign health and replacement requirements
    const health = await CampaignHealthService.calculateHealth(campaignId);

    if (health.replacementNeed <= 0) {
      return {
        campaignId,
        assignedCount: 0,
        reason: "NO_REPLACEMENT_NEEDED",
        health,
        assignedTesters: [],
      };
    }

    // 2. Rank eligible candidates through MatchingStrategy
    const candidates = await this.strategy.rankCandidates(
      campaignId,
      health.replacementNeed,
    );

    if (candidates.length === 0) {
      return {
        campaignId,
        assignedCount: 0,
        reason: "NO_ELIGIBLE_CANDIDATES",
        health,
        assignedTesters: [],
      };
    }

    // 3. Execute Transactional Assignment with strict concurrency & 15 limit control
    const assignedTesters: MatchingEvaluationResult["assignedTesters"] = [];

    await prisma.$transaction(async (tx) => {
      // Re-verify current active count inside transaction lock
      const currentActiveCount = await tx.campaignTester.count({
        where: {
          campaignId,
          status: TesterStatus.ACTIVE,
        },
      });

      let currentActive = currentActiveCount;
      const maxAllowed = campaign.maxTesters; // 15

      for (const candidate of candidates) {
        if (currentActive >= maxAllowed) {
          break; // Invariant: Never exceed 15 active testers
        }

        // Idempotency: Prevent duplicate active participation
        const existing = await tx.campaignTester.findFirst({
          where: {
            campaignId,
            testerId: candidate.testerId,
            status: {
              in: [TesterStatus.INVITED, TesterStatus.ACTIVE, TesterStatus.LOW_ACTIVITY],
            },
          },
        });

        if (existing) {
          continue;
        }

        const now = new Date();
        const durationMs = campaign.durationDays * 24 * 60 * 60 * 1000;
        const expectedEndAt = new Date(now.getTime() + durationMs);

        const newAssignment = await tx.campaignTester.create({
          data: {
            campaignId,
            testerId: candidate.testerId,
            assignmentType: TesterAssignmentType.REPLACEMENT,
            status: TesterStatus.ACTIVE,
            isReplacement: true,
            joinedAt: now,
            expectedEndAt,
          },
        });

        currentActive++;

        assignedTesters.push({
          testerId: candidate.testerId,
          campaignTesterId: newAssignment.id,
          score: candidate.score,
          joinedAt: now,
          expectedEndAt,
          isReplacement: true,
        });
      }
    });

    // 4. Audit Log recording
    if (assignedTesters.length > 0) {
      await AuditService.log({
        userId: actorId,
        campaignId,
        action: AuditAction.MATCHING_EXECUTED,
        entityName: "MatchingEngine",
        entityId: campaignId,
        changes: {
          replacementNeed: health.replacementNeed,
          assignedCount: assignedTesters.length,
          assignedTesters: assignedTesters.map((t) => t.testerId),
        },
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      });

      for (const assigned of assignedTesters) {
        await AuditService.log({
          userId: actorId,
          campaignId,
          action: AuditAction.TESTER_ASSIGNED,
          entityName: "CampaignTester",
          entityId: assigned.campaignTesterId,
          changes: {
            testerId: assigned.testerId,
            isReplacement: true,
            joinedAt: assigned.joinedAt,
            expectedEndAt: assigned.expectedEndAt,
          },
          ipAddress: context?.ipAddress,
          userAgent: context?.userAgent,
        });
      }
    }

    const updatedHealth = await CampaignHealthService.calculateHealth(campaignId);

    return {
      campaignId,
      assignedCount: assignedTesters.length,
      health: updatedHealth,
      assignedTesters,
    };
  }
}
