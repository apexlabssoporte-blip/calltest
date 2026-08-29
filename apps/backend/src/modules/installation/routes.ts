import { FastifyInstance } from "fastify";
import {
  ClaimInstallationRequestSchema,
  SdkInstallationEventRequestSchema,
  InstallationRecordResponseSchema,
} from "./schemas.js";
import {
  claimInstallationHandler,
  processSdkInstallationEventHandler,
  getInstallationStatusHandler,
} from "./handlers.js";
import { authenticate } from "../../core/middlewares/auth-guard.js";
import { Type } from "@sinclair/typebox";

export async function installationRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  // POST /campaigns/install/claim
  app.post(
    "/campaigns/install/claim",
    {
      schema: {
        tags: ["Installation"],
        summary: "Claim manual installation of app without SDK (Sets INSTALL_CLAIMED)",
        security: [{ bearerAuth: [] }],
        body: ClaimInstallationRequestSchema,
        response: {
          200: InstallationRecordResponseSchema,
        },
      },
    },
    claimInstallationHandler,
  );

  // POST /campaigns/install/sdk-event
  app.post(
    "/campaigns/install/sdk-event",
    {
      schema: {
        tags: ["Installation"],
        summary: "Ingest SDK installation or first open technical telemetry",
        security: [{ bearerAuth: [] }],
        body: SdkInstallationEventRequestSchema,
        response: {
          200: InstallationRecordResponseSchema,
        },
      },
    },
    processSdkInstallationEventHandler,
  );

  // GET /campaigns/:campaignId/install/status
  app.get(
    "/campaigns/:campaignId/install/status",
    {
      schema: {
        tags: ["Installation"],
        summary: "Get current installation status for authenticated tester in a campaign",
        security: [{ bearerAuth: [] }],
        params: Type.Object({
          campaignId: Type.String({ format: "uuid" }),
        }),
      },
    },
    getInstallationStatusHandler as any,
  );
}
