import { FastifyInstance } from "fastify";
import {
  CampaignHealthParamsSchema,
  CampaignHealthResponseSchema,
} from "./schemas.js";
import { getCampaignHealthHandler } from "./handlers.js";
import { authenticate } from "../../core/middlewares/auth-guard.js";
import { requireRole } from "../../core/middlewares/rbac-guard.js";
import { UserRole } from "@calltest/shared-types";

export async function campaignHealthRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  // GET /campaigns/:campaignId/health
  app.get(
    "/campaigns/:campaignId/health",
    {
      preHandler: [requireRole(UserRole.DEVELOPER)],
      schema: {
        tags: ["CampaignHealth"],
        summary: "Get real-time campaign health, risk status, and replacement needs",
        security: [{ bearerAuth: [] }],
        params: CampaignHealthParamsSchema,
        response: {
          200: CampaignHealthResponseSchema,
        },
      },
    },
    getCampaignHealthHandler as any,
  );
}
