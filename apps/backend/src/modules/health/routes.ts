import { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import {
  HealthLiveResponseSchema,
  HealthReadyResponseSchema,
  HealthStartupResponseSchema,
} from "./schemas.js";
import {
  getLivenessHandler,
  getReadinessHandler,
  getStartupHandler,
} from "./handlers.js";

export const healthRoutes: FastifyPluginAsyncTypebox = async (fastify) => {
  fastify.get(
    "/health/live",
    {
      schema: {
        description:
          "Liveness probe verifying that the HTTP server process is running",
        tags: ["Health"],
        response: {
          200: HealthLiveResponseSchema,
        },
      },
    },
    getLivenessHandler,
  );

  fastify.get(
    "/health/ready",
    {
      schema: {
        description:
          "Readiness probe checking database and redis infrastructure connectivity",
        tags: ["Health"],
        response: {
          200: HealthReadyResponseSchema,
          503: HealthReadyResponseSchema,
        },
      },
    },
    getReadinessHandler,
  );

  fastify.get(
    "/health/startup",
    {
      schema: {
        description:
          "Startup probe verifying that server initialization is complete",
        tags: ["Health"],
        response: {
          200: HealthStartupResponseSchema,
        },
      },
    },
    getStartupHandler as any,
  );
};

