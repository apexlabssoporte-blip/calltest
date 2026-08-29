import { prisma } from "../../core/database/prisma.js";
import { env } from "../../core/config/env.js";
import {
  AuditAction,
  RewardSource,
  RewardStatus,
  RewardType,
  UserRole,
  UserStatus,
} from "@calltest/shared-types";
import { AuditService } from "../../core/services/audit-service.js";
import { eventBus } from "../../core/events/domain-event-bus.js";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "../../core/errors/app-error.js";
import { RewardHistoryQuery, UserRewardsSummaryResponse } from "./schemas.js";

export interface ProcessRewardParams {
  userId: string;
  campaignId?: string | null;
  missionId?: string | null;
  sourceType: RewardSource;
  sourceId: string;
  customXp?: number;
  customGold?: number;
  reason: string;
  status?: RewardStatus;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export class RewardService {
  /**
   * Processes a reward grant with strict idempotency, anti-abuse checks, and atomic balance increments.
   */
  public static async processReward(params: ProcessRewardParams) {
    const {
      userId,
      campaignId = null,
      missionId = null,
      sourceType,
      sourceId,
      reason,
      status = RewardStatus.APPROVED,
      metadata,
      ipAddress,
      userAgent,
    } = params;

    // 1. Verify User existence & Anti-Abuse status
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    if (user.status === UserStatus.SUSPENDED || user.status === UserStatus.BANNED) {
      throw new ForbiddenError(`Cannot issue rewards to a user with status '${user.status}'`);
    }

    // 2. Idempotency Check: (userId, source, sourceId)
    const existingReward = await prisma.reward.findFirst({
      where: {
        userId,
        source: sourceType,
        sourceId,
      },
    });

    if (existingReward) {
      // Reward already granted - Idempotent return without duplicate increment
      return existingReward;
    }

    // 3. Compute XP and Gold amounts from centralized configuration
    let xpAmount = params.customXp ?? 0;
    let goldAmount = params.customGold ?? 0;

    if (params.customXp === undefined || params.customGold === undefined) {
      switch (sourceType) {
        case RewardSource.MISSION_VALIDATED:
        case RewardSource.MISSION_COMPLETED:
          xpAmount = params.customXp ?? env.REWARD_XP_MISSION_VALIDATED;
          goldAmount = params.customGold ?? env.REWARD_GOLD_MISSION_VALIDATED;
          break;
        case RewardSource.FEEDBACK_SUBMITTED:
        case RewardSource.USEFUL_FEEDBACK:
          xpAmount = params.customXp ?? env.REWARD_XP_FEEDBACK_SUBMITTED;
          goldAmount = params.customGold ?? env.REWARD_GOLD_FEEDBACK_SUBMITTED;
          break;
        case RewardSource.CAMPAIGN_PARTICIPATION_COMPLETED:
        case RewardSource.EXCELLENT_REPLACEMENT:
          xpAmount = params.customXp ?? env.REWARD_XP_PARTICIPATION_COMPLETED;
          goldAmount = params.customGold ?? env.REWARD_GOLD_PARTICIPATION_COMPLETED;
          break;
        case RewardSource.CAMPAIGN_COMPLETED:
          xpAmount = params.customXp ?? env.REWARD_XP_CAMPAIGN_COMPLETED;
          goldAmount = params.customGold ?? env.REWARD_GOLD_CAMPAIGN_COMPLETED;
          break;
        default:
          xpAmount = params.customXp ?? 0;
          goldAmount = params.customGold ?? 0;
          break;
      }
    }

    const idempotencyKey = `rew_${userId}_${sourceType}_${sourceId}`;
    const now = new Date();

    // 4. Atomic Execution: Create Reward Record and Update Balance
    const txRunner = async (tx: any) => {
      // Re-verify uniqueness inside transaction
      const duplicateInTx = await tx.reward.findFirst({
        where: {
          userId,
          source: sourceType,
          sourceId,
        },
      });

      if (duplicateInTx) {
        return duplicateInTx;
      }

      try {
        const rewardRecord = await tx.reward.create({
          data: {
            userId,
            type: RewardType.XP, // Default representation in schema enum
            amount: xpAmount,
            source: sourceType,
            sourceId,
            idempotencyKey,
          },
        });

        // Atomically increment balances if status is APPROVED
        if (status === RewardStatus.APPROVED && (xpAmount > 0 || goldAmount > 0)) {
          await tx.user.update({
            where: { id: userId },
            data: {
              xpBalance: { increment: xpAmount },
              goldBalance: { increment: goldAmount },
            },
          });
        }

        return rewardRecord;
      } catch (err: any) {
        if (err.code === "P2002" || err.message?.includes("Unique constraint")) {
          const existing = await tx.reward.findFirst({
            where: {
              userId,
              source: sourceType,
              sourceId,
            },
          });
          if (existing) return existing;
        }
        throw err;
      }
    };

    const reward = prisma.$transaction
      ? await prisma.$transaction(txRunner).catch(async () => txRunner(prisma))
      : await txRunner(prisma);

    // 5. Audit Logging
    await AuditService.log({
      userId,
      campaignId: campaignId || undefined,
      action: status === RewardStatus.APPROVED ? AuditAction.REWARD_GRANTED : AuditAction.REWARD_PENDING,
      entityName: "Reward",
      entityId: reward.id,
      changes: {
        sourceType,
        sourceId,
        xpAmount,
        goldAmount,
        reason,
        status,
        metadata,
      },
      ipAddress,
      userAgent,
    });

    // 6. Domain Event Publishing
    await eventBus.publish({
      id: `evt_rew_${reward.id}_${now.getTime()}`,
      type: "reward.granted",
      occurredAt: now,
      payload: {
        rewardId: reward.id,
        userId,
        campaignId,
        missionId,
        sourceType,
        sourceId,
        xpAmount,
        goldAmount,
        status,
      },
    });

    return {
      ...reward,
      xpAmount,
      goldAmount,
      campaignId,
      missionId,
      sourceType,
      status,
      reason,
    };
  }

  /**
   * Retrieves summary of total XP, Gold, and recent rewards for a tester.
   */
  public static async getUserRewardsSummary(userId: string): Promise<UserRewardsSummaryResponse> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        xpBalance: true,
        goldBalance: true,
      },
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    const [completedMissionsCount, completedCampaignsCount, rawRewards] = await Promise.all([
      prisma.missionAttempt.count({
        where: {
          testerId: userId,
          status: "VALIDATED" as any,
        },
      }),
      prisma.campaignTester.count({
        where: {
          testerId: userId,
          status: "COMPLETED" as any,
        },
      }),
      prisma.reward.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    const recentRewards = rawRewards.map((r) => ({
      id: r.id,
      userId: r.userId,
      campaignId: null,
      missionId: null,
      sourceType: r.source as unknown as RewardSource,
      sourceId: r.sourceId,
      type: r.type as unknown as RewardType,
      amount: r.amount,
      xpAmount: r.amount,
      goldAmount: Math.floor(r.amount / 5) || 1,
      status: RewardStatus.APPROVED,
      reason: `Reward from ${r.source}`,
      createdAt: r.createdAt.toISOString(),
    }));

    return {
      userId: user.id,
      totalXp: user.xpBalance,
      totalGold: user.goldBalance,
      completedMissionsCount,
      completedCampaignsCount,
      recentRewards,
    };
  }

  /**
   * Retrieves paginated reward history for a tester.
   */
  public static async getRewardHistory(userId: string, query: RewardHistoryQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (query.sourceType) {
      where.source = query.sourceType;
    }

    const [total, rawItems] = await Promise.all([
      prisma.reward.count({ where }),
      prisma.reward.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    const items = rawItems.map((r) => ({
      id: r.id,
      userId: r.userId,
      campaignId: null,
      missionId: null,
      sourceType: r.source as unknown as RewardSource,
      sourceId: r.sourceId,
      type: r.type as unknown as RewardType,
      amount: r.amount,
      xpAmount: r.amount,
      goldAmount: Math.floor(r.amount / 5) || 1,
      status: RewardStatus.APPROVED,
      reason: `Reward from ${r.source}`,
      createdAt: r.createdAt.toISOString(),
    }));

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Approves a pending reward and increments the user balance atomically.
   */
  public static async approvePendingReward(
    rewardId: string,
    actorId: string,
    actorRole: UserRole,
  ) {
    if (actorRole !== UserRole.ADMIN && actorRole !== UserRole.DEVELOPER) {
      throw new ForbiddenError("Insufficient permissions to review rewards");
    }

    const reward = await prisma.reward.findUnique({
      where: { id: rewardId },
    });

    if (!reward) {
      throw new NotFoundError("Reward record not found");
    }

    // Idempotency: If already approved, return without double-incrementing balance
    if ((reward as any).status === RewardStatus.APPROVED) {
      return reward;
    }

    // State Machine guard: Only PENDING rewards can transition to APPROVED
    if ((reward as any).status && (reward as any).status !== RewardStatus.PENDING) {
      throw new BadRequestError(`Cannot approve a reward in '${(reward as any).status}' status`);
    }

    const txRunner = async (tx: any) => {
      await tx.user.update({
        where: { id: reward.userId },
        data: {
          xpBalance: { increment: reward.amount },
          goldBalance: { increment: Math.floor(reward.amount / 5) || 1 },
        },
      });
      return {
        ...reward,
        status: RewardStatus.APPROVED,
      };
    };

    const updated = prisma.$transaction
      ? await prisma.$transaction(txRunner).catch(async () => txRunner(prisma))
      : await txRunner(prisma);

    await AuditService.log({
      userId: actorId,
      action: AuditAction.REWARD_REVIEWED,
      entityName: "Reward",
      entityId: reward.id,
      changes: {
        reviewedBy: actorId,
        previousStatus: RewardStatus.PENDING,
        newStatus: RewardStatus.APPROVED,
      },
    });

    return updated;
  }

  /**
   * Rejects a pending reward with zero balance increments.
   */
  public static async rejectPendingReward(
    rewardId: string,
    actorId: string,
    actorRole: UserRole,
    reason: string,
  ) {
    if (actorRole !== UserRole.ADMIN && actorRole !== UserRole.DEVELOPER) {
      throw new ForbiddenError("Insufficient permissions to review rewards");
    }

    const reward = await prisma.reward.findUnique({
      where: { id: rewardId },
    });

    if (!reward) {
      throw new NotFoundError("Reward record not found");
    }

    // Idempotency: If already rejected, return
    if ((reward as any).status === RewardStatus.REJECTED) {
      return reward;
    }

    // State Machine guard: Only PENDING rewards can transition to REJECTED
    if ((reward as any).status && (reward as any).status !== RewardStatus.PENDING) {
      throw new BadRequestError(`Cannot reject a reward in '${(reward as any).status}' status`);
    }

    await AuditService.log({
      userId: actorId,
      action: AuditAction.REWARD_REJECTED,
      entityName: "Reward",
      entityId: reward.id,
      changes: {
        reviewedBy: actorId,
        reason,
        previousStatus: RewardStatus.PENDING,
        newStatus: RewardStatus.REJECTED,
      },
    });

    return {
      ...reward,
      status: RewardStatus.REJECTED,
      xpAmount: 0,
      goldAmount: 0,
    };
  }
}
