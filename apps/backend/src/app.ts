import Fastify, { FastifyInstance, FastifyError } from "fastify";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import jwt from "@fastify/jwt";
import { env } from "./core/config/env.js";
import { swaggerPlugin } from "./core/plugins/swagger.js";
import { healthRoutes } from "./modules/health/routes.js";
import { authRoutes } from "./modules/auth/routes.js";
import { appRoutes } from "./modules/apps/routes.js";
import { campaignRoutes, testerDashboardRoutes } from "./modules/campaigns/routes.js";
import { campaignTesterRoutes } from "./modules/campaign-testers/routes.js";
import { missionRoutes } from "./modules/missions/routes.js";
import { activityRoutes } from "./modules/activity/routes.js";
import { campaignHealthRoutes } from "./modules/campaign-health/routes.js";
import { matchingRoutes } from "./modules/matching/routes.js";
import { trustRoutes } from "./modules/trust/routes.js";
import { fraudRoutes } from "./modules/fraud/routes.js";
import { notificationRoutes } from "./modules/notifications/routes.js";
import { installationRoutes } from "./modules/installation/routes.js";
import { evidenceRoutes } from "./modules/evidence/routes.js";
import { rewardRoutes } from "./modules/rewards/routes.js";
import { adminRoutes } from "./modules/admin/routes.js";
import { reportRoutes } from "./modules/reports/routes.js";
import { legalRoutes } from "./modules/legal/routes-v2.js";
import { NotificationEventSubscribers } from "./modules/notifications/subscribers/domain-event-subscribers.js";
import { RewardEventSubscribers } from "./modules/rewards/subscribers/reward-event-subscribers.js";
import { MetricsService } from "./core/metrics/metrics-service.js";
import { AppError } from "./core/errors/app-error.js";

// Initialize global domain event subscribers
NotificationEventSubscribers.init();
RewardEventSubscribers.init();

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      transport:
        env.NODE_ENV === "development"
          ? {
              target: "pino-pretty",
              options: {
                translateTime: "HH:MM:ss Z",
                ignore: "pid,hostname",
              },
            }
          : undefined,
    },
    genReqId: (req) => {
      const headerReqId = req.headers["x-request-id"];
      return typeof headerReqId === "string" ? headerReqId : crypto.randomUUID();
    },
  }).withTypeProvider<TypeBoxTypeProvider>();

  // Request correlation and metrics hook
  app.addHook("onResponse", async (request, reply) => {
    const elapsed = reply.elapsedTime;
    MetricsService.recordHttpRequest(elapsed, reply.statusCode >= 400);
  });

  // Security Headers
  app.register(helmet, {
    contentSecurityPolicy: env.NODE_ENV === "production",
  });

  // CORS
  app.register(cors, {
    origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN.split(","),
    credentials: true,
  });

  // Rate Limiting
  app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_TIME_WINDOW_MS,
  });

  // JWT Authentication prepared
  app.register(jwt, {
    secret: env.JWT_SECRET,
  });

  // OpenAPI / Swagger Documentation
  app.register(swaggerPlugin);

  // Root health route for load balancers
  app.get("/", async () => {
    return { status: "ok", service: "CallTest API", version: "1.0.0" };
  });

  // Module Routes
  app.register(legalRoutes);
  app.register(healthRoutes);
  app.register(authRoutes);
  app.register(appRoutes);
  app.register(campaignRoutes);
  app.register(testerDashboardRoutes);
  app.register(campaignTesterRoutes);
  app.register(missionRoutes);
  app.register(activityRoutes);
  app.register(campaignHealthRoutes);
  app.register(matchingRoutes);
  app.register(trustRoutes);
  app.register(fraudRoutes);
  app.register(notificationRoutes);
  app.register(installationRoutes);
  app.register(evidenceRoutes);
  app.register(rewardRoutes);
  app.register(adminRoutes);
  app.register(reportRoutes);

  // Global Error Handler
  app.setErrorHandler(
    (error: FastifyError | AppError | Error, request, reply) => {
      request.log.error({ err: error, reqId: request.id }, "Request error occurred");

      const requestId = request.id;

      if (error instanceof AppError) {
        return reply.code(error.statusCode).send({
          statusCode: error.statusCode,
          code: error.code,
          message: error.message,
          details: env.NODE_ENV === "production" ? undefined : error.details,
          requestId,
        });
      }

      const fastifyErr = error as FastifyError;
      if (fastifyErr.validation) {
        return reply.code(400).send({
          statusCode: 400,
          code: "VALIDATION_ERROR",
          message: "Invalid request payload or parameters",
          details: env.NODE_ENV === "production" ? undefined : fastifyErr.validation,
          requestId,
        });
      }

      return reply.code(500).send({
        statusCode: 500,
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected internal server error occurred",
        requestId,
      });
    },
  );

  return app;
}
