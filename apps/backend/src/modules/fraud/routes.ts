import { FastifyInstance } from "fastify";
import {
  UserFraudParamsSchema,
  UserFraudReportResponseSchema,
} from "./schemas.js";
import { getUserFraudReportHandler } from "./handlers.js";
import { authenticate } from "../../core/middlewares/auth-guard.js";
import { requireRole } from "../../core/middlewares/rbac-guard.js";
import { UserRole } from "@calltest/shared-types";

export async function fraudRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  // GET /users/:userId/fraud (ADMIN ONLY)
  app.get(
    "/users/:userId/fraud",
    {
      preHandler: [requireRole(UserRole.ADMIN)],
      schema: {
        tags: ["Fraud"],
        summary: "Get full internal fraud signals, score, and events (Admin confidential)",
        security: [{ bearerAuth: [] }],
        params: UserFraudParamsSchema,
        response: {
          200: UserFraudReportResponseSchema,
        },
      },
    },
    getUserFraudReportHandler as any,
  );
}
