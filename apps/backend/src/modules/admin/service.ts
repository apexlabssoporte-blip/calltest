import { prisma } from "../../core/database/prisma.js";
import {
  AuditAction,
  EvidenceStatus,
  UserRole,
  UserStatus,
} from "@calltest/shared-types";
import { AuditService } from "../../core/services/audit-service.js";
import { eventBus } from "../../core/events/domain-event-bus.js";
import {
  BadRequestError,
  NotFoundError,
} from "../../core/errors/app-error.js";
import { EvidenceService } from "../evidence/service.js";
import {
  AdminEvidenceListQuery,
  AdminUserListQuery,
  CreateOperationalReview,
  ReviewStatus,
  UpdateOperationalReview,
} from "./schemas.js";

// In-memory operational reviews store for V1
const operationalReviewsStore = new Map<string, any>();

export class AdminService {
  /**
   * List users with pagination, search, status, and role filters.
   */
  public static async getUsers(query: AdminUserListQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status) {
      where.status = query.status;
    }
    if (query.role) {
      where.role = query.role;
    }
    if (query.search) {
      where.OR = [
        { email: { contains: query.search, mode: "insensitive" } },
        { displayName: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          displayName: true,
          role: true,
          status: true,
          xpBalance: true,
          goldBalance: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    const items = users.map((u) => ({
      ...u,
      role: u.role as UserRole,
      status: u.status as UserStatus,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
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
   * Get sanitized detailed user information for Admin inspection.
   */
  public static async getUserDetail(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        status: true,
        trustScore: true,
        rank: true,
        xpBalance: true,
        goldBalance: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    const [activeCampaignsCount, rawAuditLogs] = await Promise.all([
      prisma.campaignTester.count({
        where: {
          testerId: userId,
          status: "ACTIVE" as any,
        },
      }),
      prisma.auditLog.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    const recentAuditLogs = rawAuditLogs.map((log: any) => ({
      id: log.id,
      action: log.action,
      createdAt: log.createdAt.toISOString(),
      details: (log.changes as Record<string, any>) ?? undefined,
    }));

    return {
      ...user,
      role: user.role as UserRole,
      status: user.status as UserStatus,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      trustScore: user.trustScore ?? 50,
      trustRank: user.rank ?? "NEW",
      activeCampaignsCount,
      recentAuditLogs,
    };
  }

  /**
   * Suspend a user with mandatory reason and audit log.
   */
  public static async suspendUser(
    userId: string,
    adminId: string,
    reason: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    if (!reason || !reason.trim()) {
      throw new BadRequestError("A valid reason is mandatory for user suspension");
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError("User not found");
    }

    if (user.status === UserStatus.SUSPENDED) {
      return user; // Idempotent
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { status: UserStatus.SUSPENDED },
    });

    await AuditService.log({
      userId: adminId,
      action: AuditAction.USER_SUSPENDED,
      entityName: "User",
      entityId: userId,
      changes: {
        previousStatus: user.status,
        newStatus: UserStatus.SUSPENDED,
        reason,
        suspendedBy: adminId,
      },
      ipAddress,
      userAgent,
    });

    await eventBus.publish({
      id: `evt_sus_${userId}_${Date.now()}`,
      type: "user.suspended",
      occurredAt: new Date(),
      payload: { userId, adminId, reason },
    });

    return updated;
  }

  /**
   * Unsuspend a user and restore to ACTIVE.
   */
  public static async unsuspendUser(
    userId: string,
    adminId: string,
    reason: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    if (!reason || !reason.trim()) {
      throw new BadRequestError("A valid reason is mandatory for unsuspending a user");
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError("User not found");
    }

    if (user.status === UserStatus.ACTIVE) {
      return user; // Idempotent
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { status: UserStatus.ACTIVE },
    });

    await AuditService.log({
      userId: adminId,
      action: AuditAction.TRUST_RECOVERY,
      entityName: "User",
      entityId: userId,
      changes: {
        previousStatus: user.status,
        newStatus: UserStatus.ACTIVE,
        reason,
        restoredBy: adminId,
      },
      ipAddress,
      userAgent,
    });

    await eventBus.publish({
      id: `evt_unsus_${userId}_${Date.now()}`,
      type: "user.unsuspended",
      occurredAt: new Date(),
      payload: { userId, adminId, reason },
    });

    return updated;
  }

  /**
   * Ban a user with mandatory reason and audit log.
   */
  public static async banUser(
    userId: string,
    adminId: string,
    reason: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    if (!reason || !reason.trim()) {
      throw new BadRequestError("A valid reason is mandatory for user ban");
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError("User not found");
    }

    if (user.status === UserStatus.BANNED) {
      return user; // Idempotent
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { status: UserStatus.BANNED },
    });

    await AuditService.log({
      userId: adminId,
      action: AuditAction.USER_BANNED,
      entityName: "User",
      entityId: userId,
      changes: {
        previousStatus: user.status,
        newStatus: UserStatus.BANNED,
        reason,
        bannedBy: adminId,
      },
      ipAddress,
      userAgent,
    });

    await eventBus.publish({
      id: `evt_ban_${userId}_${Date.now()}`,
      type: "user.banned",
      occurredAt: new Date(),
      payload: { userId, adminId, reason },
    });

    return updated;
  }

  /**
   * Unban a user and restore to ACTIVE.
   */
  public static async unbanUser(
    userId: string,
    adminId: string,
    reason: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    if (!reason || !reason.trim()) {
      throw new BadRequestError("A valid reason is mandatory for unbanning a user");
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError("User not found");
    }

    if (user.status === UserStatus.ACTIVE) {
      return user;
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { status: UserStatus.ACTIVE },
    });

    await AuditService.log({
      userId: adminId,
      action: AuditAction.TRUST_RECOVERY,
      entityName: "User",
      entityId: userId,
      changes: {
        previousStatus: user.status,
        newStatus: UserStatus.ACTIVE,
        reason,
        unbannedBy: adminId,
      },
      ipAddress,
      userAgent,
    });

    await eventBus.publish({
      id: `evt_unban_${userId}_${Date.now()}`,
      type: "user.unbanned",
      occurredAt: new Date(),
      payload: { userId, adminId, reason },
    });

    return updated;
  }

  /**
   * List pending evidence submissions for Admin review.
   */
  public static async getPendingEvidence(query: AdminEvidenceListQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {
      status: EvidenceStatus.PENDING_REVIEW,
    };
    if (query.campaignId) {
      where.campaignId = query.campaignId;
    }

    const [total, rawItems] = await Promise.all([
      prisma.missionEvidence.count({ where }),
      prisma.missionEvidence.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    const items = rawItems.map((e) => ({
      id: e.id,
      attemptId: e.missionAttemptId,
      testerId: e.testerId,
      campaignId: e.campaignId,
      status: e.status as EvidenceStatus,
      fileUrl: e.fileReference,
      sha256Hash: e.sha256,
      mimeType: e.mimeType,
      sizeBytes: e.fileSize,
      rejectionReason: e.rejectionReason,
      createdAt: e.createdAt.toISOString(),
      reviewedAt: e.reviewedAt ? e.reviewedAt.toISOString() : null,
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
   * Admin evidence approval with elevated privileges.
   */
  public static async approveEvidence(
    evidenceId: string,
    adminId: string,
    metadata?: { ipAddress?: string; userAgent?: string },
  ) {
    return EvidenceService.approveEvidence(evidenceId, adminId, UserRole.ADMIN, metadata);
  }

  /**
   * Admin evidence rejection with elevated privileges.
   */
  public static async rejectEvidence(
    evidenceId: string,
    adminId: string,
    reason: string,
  ) {
    return EvidenceService.rejectEvidence(
      evidenceId,
      adminId,
      UserRole.ADMIN,
      "OTHER" as any,
      reason,
    );
  }

  /**
   * Create an operational dispute or review ticket.
   */
  public static async createReviewDispute(
    openedBy: string,
    data: CreateOperationalReview,
  ) {
    const reviewId = `rev_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const review = {
      id: reviewId,
      entityType: data.entityType,
      entityId: data.entityId,
      status: ReviewStatus.OPEN,
      reason: data.reason,
      resolution: null,
      openedBy,
      reviewedBy: null,
      createdAt: new Date().toISOString(),
      resolvedAt: null,
    };

    operationalReviewsStore.set(reviewId, review);

    await AuditService.log({
      userId: openedBy,
      action: AuditAction.FRAUD_EVENT_CREATED,
      entityName: "OperationalReview",
      entityId: reviewId,
      changes: {
        entityType: data.entityType,
        entityId: data.entityId,
        reason: data.reason,
      },
    });

    return review;
  }

  /**
   * Update an operational dispute or review ticket.
   */
  public static async updateReviewDispute(
    reviewId: string,
    adminId: string,
    data: UpdateOperationalReview,
  ) {
    const review = operationalReviewsStore.get(reviewId);
    if (!review) {
      throw new NotFoundError("Operational review not found");
    }

    review.status = data.status;
    review.resolution = data.resolution;
    review.reviewedBy = adminId;
    if (data.status === ReviewStatus.RESOLVED || data.status === ReviewStatus.REJECTED) {
      review.resolvedAt = new Date().toISOString();
    }

    operationalReviewsStore.set(reviewId, review);

    await AuditService.log({
      userId: adminId,
      action: AuditAction.FRAUD_DECISION_MADE,
      entityName: "OperationalReview",
      entityId: reviewId,
      changes: {
        newStatus: data.status,
        resolution: data.resolution,
        reviewedBy: adminId,
      },
    });

    return review;
  }

  /**
   * Get operational review by ID.
   */
  public static async getReviewDispute(reviewId: string) {
    const review = operationalReviewsStore.get(reviewId);
    if (!review) {
      throw new NotFoundError("Operational review not found");
    }
    return review;
  }
}
