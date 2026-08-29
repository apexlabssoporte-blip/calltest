import { FastifyInstance } from "fastify";
import {
  EvaluateMatchingParamsSchema,
  EvaluateMatchingResponseSchema,
  TesterExposureResponseSchema,
} from "./schemas.js";
import {
  evaluateMatchingHandler,
  getTesterExposureHandler,
} from "./handlers.js";
import { authenticate } from "../../core/middlewares/auth-guard.js";
import { requireRole } from "../../core/middlewares/rbac-guard.js";
import { UserRole } from "@calltest/shared-types";

import { requireInternalServiceAuth } from "../../core/middlewares/internal-service-guard.js";

export async function matchingRoutes(app: FastifyInstance) {
  // POST /internal/matching/campaigns/:campaignId/evaluate
  app.post(
    "/internal/matching/campaigns/:campaignId/evaluate",
    {
      preHandler: [requireInternalServiceAuth],
      schema: {
        tags: ["Matching"],
        summary: "Evaluate campaign health and execute controlled replacement matching via HMAC internal service auth",
        params: EvaluateMatchingParamsSchema,
        response: {
          200: EvaluateMatchingResponseSchema,
        },
      },
    },
    evaluateMatchingHandler as any,
  );

  // GET /me/exposure
  app.get(
    "/me/exposure",
    {
      preHandler: [authenticate, requireRole(UserRole.TESTER)],
      schema: {
        tags: ["Matching"],
        summary: "Get current tester exposure level, capacity, and active load",
        security: [{ bearerAuth: [] }],
        response: {
          200: TesterExposureResponseSchema,
        },
      },
    },
    getTesterExposureHandler as any,
  );
}
