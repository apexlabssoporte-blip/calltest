import { FastifyInstance } from "fastify";
import {
  IngestActivityEventSchema,
  IngestActivityEventsBatchSchema,
  ActivityScoreResponseSchema,
  DeveloperTesterOverviewResponseSchema,
  TesterOverviewQuerySchema,
} from "./schemas.js";
import {
  ingestActivityEventHandler,
  getTesterActivityScoreHandler,
  getDeveloperTesterOverviewHandler,
} from "./handlers.js";
import { authenticate } from "../../core/middlewares/auth-guard.js";
import { requireRole } from "../../core/middlewares/rbac-guard.js";
import { UserRole } from "@calltest/shared-types";
import { Type } from "@sinclair/typebox";

export async function activityRoutes(app: FastifyInstance) {
  // All activity routes require authentication
  app.addHook("preHandler", authenticate);

  // POST /activity/events (SDK / Tester telemetry ingestion with specific rate limit)
  app.post(
    "/activity/events",
    {
      config: {
        rateLimit: {
          max: 300,
          timeWindow: "1 minute",
        },
      },
      schema: {
        tags: ["Activity"],
        summary: "Ingest client/SDK activity event or batch (Idempotent & timestamp validated)",
        security: [{ bearerAuth: [] }],
        body: Type.Union([IngestActivityEventSchema, IngestActivityEventsBatchSchema]),
      },
    },
    ingestActivityEventHandler as any,
  );

  // GET /campaign-testers/:campaignTesterId/activity-score
  app.get(
    "/campaign-testers/:campaignTesterId/activity-score",
    {
      schema: {
        tags: ["Activity"],
        summary: "Get multi-signal activity score and classification for a tester",
        security: [{ bearerAuth: [] }],
        params: Type.Object({
          campaignTesterId: Type.String({ format: "uuid" }),
        }),
        response: {
          200: ActivityScoreResponseSchema,
        },
      },
    },
    getTesterActivityScoreHandler as any,
  );

  // GET /campaigns/:campaignId/testers/:testerId/overview (Developer View)
  app.get(
    "/campaigns/:campaignId/testers/:testerId/overview",
    {
      preHandler: [requireRole(UserRole.DEVELOPER)],
      schema: {
        tags: ["Activity"],
        summary: "Developer view of tester participation, replacement status, and activity signals",
        security: [{ bearerAuth: [] }],
        params: TesterOverviewQuerySchema,
        response: {
          200: DeveloperTesterOverviewResponseSchema,
        },
      },
    },
    getDeveloperTesterOverviewHandler as any,
  );
}
