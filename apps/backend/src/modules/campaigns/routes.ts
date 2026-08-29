import { FastifyInstance } from "fastify";
import {
  CreateCampaignRequestSchema,
  UpdateCampaignRequestSchema,
  CampaignTransitionRequestSchema,
  AppCampaignParamsSchema,
  CampaignParamsSchema,
  CampaignResponseSchema,
  CampaignListResponseSchema,
  CampaignDashboardResponseSchema,
  CampaignReadinessResponseSchema,
  ValidateLinksResponseSchema,
  ConfirmLinksTestResponseSchema,
  CompleteCampaignResponseSchema,
} from "./schemas.js";
import {
  createCampaignHandler,
  listAppCampaignsHandler,
  getCampaignByIdHandler,
  updateCampaignHandler,
  transitionCampaignHandler,
  getCampaignDashboardHandler,
  getCampaignReadinessHandler,
  validateCampaignLinksHandler,
  confirmLinksTestHandler,
  completeCampaignHandler,
  endCampaignEarlyHandler,
  getTesterDashboardHandler,
  getDeveloperDashboardHandler,
} from "./handlers.js";
import { authenticate } from "../../core/middlewares/auth-guard.js";
import { requireRole } from "../../core/middlewares/rbac-guard.js";
import { UserRole } from "@calltest/shared-types";

export async function campaignRoutes(app: FastifyInstance) {
  // All campaign management routes require authentication and DEVELOPER role (or BOTH / ADMIN)
  app.addHook("preHandler", authenticate);
  app.addHook("preHandler", requireRole(UserRole.DEVELOPER));

  // POST /apps/:appId/campaigns
  app.post(
    "/apps/:appId/campaigns",
    {
      schema: {
        tags: ["Campaigns"],
        summary: "Create a new testing campaign for an application",
        security: [{ bearerAuth: [] }],
        params: AppCampaignParamsSchema,
        body: CreateCampaignRequestSchema,
        response: {
          201: CampaignResponseSchema,
        },
      },
    },
    createCampaignHandler,
  );

  // GET /apps/:appId/campaigns
  app.get(
    "/apps/:appId/campaigns",
    {
      schema: {
        tags: ["Campaigns"],
        summary: "List all campaigns for an application",
        security: [{ bearerAuth: [] }],
        params: AppCampaignParamsSchema,
        response: {
          200: CampaignListResponseSchema,
        },
      },
    },
    listAppCampaignsHandler,
  );

  // GET /campaigns/:id
  app.get(
    "/campaigns/:id",
    {
      schema: {
        tags: ["Campaigns"],
        summary: "Get campaign details by ID",
        security: [{ bearerAuth: [] }],
        params: CampaignParamsSchema,
        response: {
          200: CampaignResponseSchema,
        },
      },
    },
    getCampaignByIdHandler,
  );

  // PATCH /campaigns/:id
  app.patch(
    "/campaigns/:id",
    {
      schema: {
        tags: ["Campaigns"],
        summary: "Update campaign configuration",
        security: [{ bearerAuth: [] }],
        params: CampaignParamsSchema,
        body: UpdateCampaignRequestSchema,
        response: {
          200: CampaignResponseSchema,
        },
      },
    },
    updateCampaignHandler,
  );

  // POST /campaigns/:id/transition
  app.post(
    "/campaigns/:id/transition",
    {
      schema: {
        tags: ["Campaigns"],
        summary: "Execute a validated status transition on a campaign",
        security: [{ bearerAuth: [] }],
        params: CampaignParamsSchema,
        body: CampaignTransitionRequestSchema,
        response: {
          200: CampaignResponseSchema,
        },
      },
    },
    transitionCampaignHandler,
  );

  // GET /campaigns/:id/dashboard
  app.get(
    "/campaigns/:id/dashboard",
    {
      schema: {
        tags: ["Campaigns"],
        summary: "Get comprehensive operational dashboard for a campaign",
        security: [{ bearerAuth: [] }],
        params: CampaignParamsSchema,
        response: {
          200: CampaignDashboardResponseSchema,
        },
      },
    },
    getCampaignDashboardHandler as any,
  );

  // GET /campaigns/:id/readiness
  app.get(
    "/campaigns/:id/readiness",
    {
      schema: {
        tags: ["Campaigns"],
        summary: "Check campaign activation readiness criteria",
        security: [{ bearerAuth: [] }],
        params: CampaignParamsSchema,
        response: {
          200: CampaignReadinessResponseSchema,
        },
      },
    },
    getCampaignReadinessHandler as any,
  );

  // POST /campaigns/:id/validate-links
  app.post(
    "/campaigns/:id/validate-links",
    {
      schema: {
        tags: ["Campaigns"],
        summary: "Execute automated validation on Play Store and Google Group URLs",
        security: [{ bearerAuth: [] }],
        params: CampaignParamsSchema,
        response: {
          200: ValidateLinksResponseSchema,
        },
      },
    },
    validateCampaignLinksHandler as any,
  );

  // POST /campaigns/:id/confirm-links-test
  app.post(
    "/campaigns/:id/confirm-links-test",
    {
      schema: {
        tags: ["Campaigns"],
        summary: "Developer manual confirmation of device link testing",
        security: [{ bearerAuth: [] }],
        params: CampaignParamsSchema,
        response: {
          200: ConfirmLinksTestResponseSchema,
        },
      },
    },
    confirmLinksTestHandler as any,
  );

  // POST /campaigns/:id/complete
  app.post(
    "/campaigns/:id/complete",
    {
      schema: {
        tags: ["Campaigns"],
        summary: "Gracefully complete campaign testing and archive active sessions",
        security: [{ bearerAuth: [] }],
        params: CampaignParamsSchema,
        response: {
          200: CompleteCampaignResponseSchema,
        },
      },
    },
    completeCampaignHandler as any,
  );

  // POST /campaigns/:id/end-early
  app.post(
    "/campaigns/:id/end-early",
    {
      schema: {
        tags: ["Campaigns"],
        summary: "End campaign early when app is verified publicly available on Google Play",
        security: [{ bearerAuth: [] }],
        params: CampaignParamsSchema,
      },
    },
    endCampaignEarlyHandler as any,
  );

  // GET /campaigns/:id/developer-dashboard
  app.get(
    "/campaigns/:id/developer-dashboard",
    {
      schema: {
        tags: ["Dashboard"],
        summary: "Get developer campaign dashboard overview (12/15 testers, 3 backups, day X/14, aggregated reliability, zero PII)",
        security: [{ bearerAuth: [] }],
        params: CampaignParamsSchema,
      },
    },
    getDeveloperDashboardHandler as any,
  );
}

export async function testerDashboardRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  // GET /me/tester-dashboard
  app.get(
    "/me/tester-dashboard",
    {
      schema: {
        tags: ["Dashboard"],
        summary: "Get authenticated tester dashboard overview",
        security: [{ bearerAuth: [] }],
      },
    },
    getTesterDashboardHandler as any,
  );
}
