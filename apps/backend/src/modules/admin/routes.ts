import { FastifyInstance } from "fastify";
import { authenticate } from "../../core/middlewares/auth-guard.js";
import { requireRole } from "../../core/middlewares/rbac-guard.js";
import { UserRole } from "@calltest/shared-types";
import {
  AdminEvidenceApproveRequestSchema,
  AdminEvidenceItemSchema,
  AdminEvidenceListQuerySchema,
  AdminEvidenceListResponseSchema,
  AdminEvidenceRejectRequestSchema,
  AdminUserActionRequestSchema,
  AdminUserDetailResponseSchema,
  AdminUserListItemSchema,
  AdminUserListQuerySchema,
  AdminUserListResponseSchema,
  CreateOperationalReviewSchema,
  OperationalReviewSchema,
  UpdateOperationalReviewSchema,
} from "./schemas.js";
import {
  approveAdminEvidenceHandler,
  banUserHandler,
  createOperationalReviewHandler,
  getAdminPendingEvidenceHandler,
  getAdminUserDetailHandler,
  getAdminUsersHandler,
  getOperationalReviewHandler,
  rejectAdminEvidenceHandler,
  suspendUserHandler,
  unbanUserHandler,
  unsuspendUserHandler,
  updateOperationalReviewHandler,
} from "./handlers.js";

export async function adminRoutes(app: FastifyInstance) {
  // All admin routes require authentication and ADMIN role
  app.addHook("preHandler", authenticate);
  app.addHook("preHandler", requireRole(UserRole.ADMIN));

  // Users Management
  app.get(
    "/admin/users",
    {
      schema: {
        tags: ["Admin"],
        summary: "Search and list users with administrative filters",
        security: [{ bearerAuth: [] }],
        querystring: AdminUserListQuerySchema,
        response: {
          200: AdminUserListResponseSchema,
        },
      },
    },
    getAdminUsersHandler as any,
  );

  app.get(
    "/admin/users/:id",
    {
      schema: {
        tags: ["Admin"],
        summary: "Get sanitized comprehensive user profile for admin inspection",
        security: [{ bearerAuth: [] }],
        response: {
          200: AdminUserDetailResponseSchema,
        },
      },
    },
    getAdminUserDetailHandler as any,
  );

  app.post(
    "/admin/users/:id/suspend",
    {
      schema: {
        tags: ["Admin"],
        summary: "Suspend a user account with mandatory reason and audit log",
        security: [{ bearerAuth: [] }],
        body: AdminUserActionRequestSchema,
        response: {
          200: AdminUserListItemSchema,
        },
      },
    },
    suspendUserHandler as any,
  );

  app.post(
    "/admin/users/:id/unsuspend",
    {
      schema: {
        tags: ["Admin"],
        summary: "Unsuspend a user account and restore to active status",
        security: [{ bearerAuth: [] }],
        body: AdminUserActionRequestSchema,
        response: {
          200: AdminUserListItemSchema,
        },
      },
    },
    unsuspendUserHandler as any,
  );

  app.post(
    "/admin/users/:id/ban",
    {
      schema: {
        tags: ["Admin"],
        summary: "Ban a user account with mandatory reason and audit log",
        security: [{ bearerAuth: [] }],
        body: AdminUserActionRequestSchema,
        response: {
          200: AdminUserListItemSchema,
        },
      },
    },
    banUserHandler as any,
  );

  app.post(
    "/admin/users/:id/unban",
    {
      schema: {
        tags: ["Admin"],
        summary: "Unban a user account and restore to active status",
        security: [{ bearerAuth: [] }],
        body: AdminUserActionRequestSchema,
        response: {
          200: AdminUserListItemSchema,
        },
      },
    },
    unbanUserHandler as any,
  );

  // Evidence Review Admin
  app.get(
    "/admin/evidence/pending",
    {
      schema: {
        tags: ["Admin"],
        summary: "List all pending evidence across campaigns for admin review",
        security: [{ bearerAuth: [] }],
        querystring: AdminEvidenceListQuerySchema,
        response: {
          200: AdminEvidenceListResponseSchema,
        },
      },
    },
    getAdminPendingEvidenceHandler as any,
  );

  app.post(
    "/admin/evidence/:id/approve",
    {
      schema: {
        tags: ["Admin"],
        summary: "Approve mission screenshot evidence with admin privileges",
        security: [{ bearerAuth: [] }],
        body: AdminEvidenceApproveRequestSchema,
        response: {
          200: AdminEvidenceItemSchema,
        },
      },
    },
    approveAdminEvidenceHandler as any,
  );

  app.post(
    "/admin/evidence/:id/reject",
    {
      schema: {
        tags: ["Admin"],
        summary: "Reject mission screenshot evidence with mandatory reason",
        security: [{ bearerAuth: [] }],
        body: AdminEvidenceRejectRequestSchema,
        response: {
          200: AdminEvidenceItemSchema,
        },
      },
    },
    rejectAdminEvidenceHandler as any,
  );

  // Operational Reviews / Disputes
  app.post(
    "/admin/reviews",
    {
      schema: {
        tags: ["Admin"],
        summary: "Create an operational dispute or review ticket",
        security: [{ bearerAuth: [] }],
        body: CreateOperationalReviewSchema,
        response: {
          201: OperationalReviewSchema,
        },
      },
    },
    createOperationalReviewHandler as any,
  );

  app.get(
    "/admin/reviews/:id",
    {
      schema: {
        tags: ["Admin"],
        summary: "Get operational review ticket by ID",
        security: [{ bearerAuth: [] }],
        response: {
          200: OperationalReviewSchema,
        },
      },
    },
    getOperationalReviewHandler as any,
  );

  app.patch(
    "/admin/reviews/:id",
    {
      schema: {
        tags: ["Admin"],
        summary: "Update or resolve an operational review ticket",
        security: [{ bearerAuth: [] }],
        body: UpdateOperationalReviewSchema,
        response: {
          200: OperationalReviewSchema,
        },
      },
    },
    updateOperationalReviewHandler as any,
  );
}
