import { FastifyInstance } from "fastify";
import {
  UserTrustParamsSchema,
  UserTrustResponseSchema,
  UserReputationResponseSchema,
  DeveloperUserTrustResponseSchema,
} from "./schemas.js";
import {
  getMyTrustHandler,
  getMyReputationHandler,
  getUserTrustForDeveloperHandler,
} from "./handlers.js";
import { authenticate } from "../../core/middlewares/auth-guard.js";
import { requireRole } from "../../core/middlewares/rbac-guard.js";
import { UserRole } from "@calltest/shared-types";

export async function trustRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  // GET /me/trust
  app.get(
    "/me/trust",
    {
      schema: {
        tags: ["Trust"],
        summary: "Get current user trust profile, score, rank, and history",
        security: [{ bearerAuth: [] }],
        response: {
          200: UserTrustResponseSchema,
        },
      },
    },
    getMyTrustHandler as any,
  );

  // GET /me/reputation
  app.get(
    "/me/reputation",
    {
      schema: {
        tags: ["Trust"],
        summary: "Get current user reputation status and active restrictions",
        security: [{ bearerAuth: [] }],
        response: {
          200: UserReputationResponseSchema,
        },
      },
    },
    getMyReputationHandler as any,
  );

  // GET /users/:userId/trust
  app.get(
    "/users/:userId/trust",
    {
      preHandler: [requireRole(UserRole.DEVELOPER)],
      schema: {
        tags: ["Trust"],
        summary: "Get sanitized user trust rank and metrics for campaign developers (Privacy protected)",
        security: [{ bearerAuth: [] }],
        params: UserTrustParamsSchema,
        response: {
          200: DeveloperUserTrustResponseSchema,
        },
      },
    },
    getUserTrustForDeveloperHandler as any,
  );
}
