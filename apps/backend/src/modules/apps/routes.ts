import { FastifyInstance } from "fastify";
import {
  CreateAppRequestSchema,
  UpdateAppRequestSchema,
  UpdateAppSdkStatusRequestSchema,
  AppParamsSchema,
  AppResponseSchema,
  AppListResponseSchema,
} from "./schemas.js";
import {
  createAppHandler,
  listAppsHandler,
  getAppByIdHandler,
  updateAppHandler,
  updateAppSdkStatusHandler,
  deleteAppHandler,
} from "./handlers.js";
import { authenticate } from "../../core/middlewares/auth-guard.js";
import { requireRole } from "../../core/middlewares/rbac-guard.js";
import { UserRole } from "@calltest/shared-types";
import { MessageResponseSchema } from "../auth/schemas.js";

export async function appRoutes(app: FastifyInstance) {
  // All app routes require authentication and DEVELOPER role (or BOTH / ADMIN)
  app.addHook("preHandler", authenticate);
  app.addHook("preHandler", requireRole(UserRole.DEVELOPER));

  // POST /apps
  app.post(
    "/apps",
    {
      schema: {
        tags: ["Apps"],
        summary: "Register a new application",
        security: [{ bearerAuth: [] }],
        body: CreateAppRequestSchema,
        response: {
          201: AppResponseSchema,
        },
      },
    },
    createAppHandler,
  );

  // GET /apps
  app.get(
    "/apps",
    {
      schema: {
        tags: ["Apps"],
        summary: "List applications owned by current developer",
        security: [{ bearerAuth: [] }],
        response: {
          200: AppListResponseSchema,
        },
      },
    },
    listAppsHandler,
  );

  // GET /apps/:id
  app.get(
    "/apps/:id",
    {
      schema: {
        tags: ["Apps"],
        summary: "Get application details by ID",
        security: [{ bearerAuth: [] }],
        params: AppParamsSchema,
        response: {
          200: AppResponseSchema,
        },
      },
    },
    getAppByIdHandler,
  );

  // PATCH /apps/:id
  app.patch(
    "/apps/:id",
    {
      schema: {
        tags: ["Apps"],
        summary: "Update application details",
        security: [{ bearerAuth: [] }],
        params: AppParamsSchema,
        body: UpdateAppRequestSchema,
        response: {
          200: AppResponseSchema,
        },
      },
    },
    updateAppHandler,
  );

  // PATCH /apps/:id/sdk-status
  app.patch(
    "/apps/:id/sdk-status",
    {
      schema: {
        tags: ["Apps"],
        summary: "Update SDK integration choice (SDK_ENABLED vs NO_SDK)",
        security: [{ bearerAuth: [] }],
        params: AppParamsSchema,
        body: UpdateAppSdkStatusRequestSchema,
        response: {
          200: AppResponseSchema,
        },
      },
    },
    updateAppSdkStatusHandler,
  );

  // DELETE /apps/:id (Soft delete / Archive)
  app.delete(
    "/apps/:id",
    {
      schema: {
        tags: ["Apps"],
        summary: "Archive application (soft delete)",
        security: [{ bearerAuth: [] }],
        params: AppParamsSchema,
        response: {
          200: MessageResponseSchema,
        },
      },
    },
    deleteAppHandler,
  );
}
