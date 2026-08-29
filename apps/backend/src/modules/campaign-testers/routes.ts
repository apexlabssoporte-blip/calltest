import { FastifyInstance } from "fastify";
import {
  CampaignTesterParamsSchema,
  CampaignTesterDetailParamsSchema,
  AddTesterToCampaignSchema,
  RemoveTesterFromCampaignSchema,
  CampaignTesterResponseSchema,
  CampaignTesterListResponseSchema,
  AvailableCampaignListResponseSchema,
  TesterParticipationListResponseSchema,
  TesterParticipationDetailSchema,
} from "./schemas.js";
import {
  listCampaignTestersHandler,
  getCampaignTesterHandler,
  addTesterToCampaignHandler,
  removeTesterFromCampaignHandler,
  joinCampaignHandler,
  listAvailableCampaignsHandler,
  listMyCampaignsHandler,
  getMyCampaignDetailHandler,
} from "./handlers.js";
import { authenticate } from "../../core/middlewares/auth-guard.js";
import { requireRole } from "../../core/middlewares/rbac-guard.js";
import { UserRole } from "@calltest/shared-types";

export async function campaignTesterRoutes(app: FastifyInstance) {
  // All campaign testers routes require authentication
  app.addHook("preHandler", authenticate);

  // GET /campaigns/available (Tester discovery of eligible campaigns)
  app.get(
    "/campaigns/available",
    {
      schema: {
        tags: ["CampaignTesters"],
        summary: "List eligible campaigns available for tester discovery and enrollment",
        security: [{ bearerAuth: [] }],
        response: {
          200: AvailableCampaignListResponseSchema,
        },
      },
    },
    listAvailableCampaignsHandler as any,
  );

  // GET /me/campaigns (Tester list of enrolled campaigns)
  app.get(
    "/me/campaigns",
    {
      schema: {
        tags: ["CampaignTesters"],
        summary: "List all campaigns in which the authenticated tester participates",
        security: [{ bearerAuth: [] }],
        response: {
          200: TesterParticipationListResponseSchema,
        },
      },
    },
    listMyCampaignsHandler as any,
  );

  // GET /me/campaigns/:campaignId (Tester single campaign participation detail)
  app.get(
    "/me/campaigns/:campaignId",
    {
      schema: {
        tags: ["CampaignTesters"],
        summary: "Get comprehensive participation and mission detail for tester in a campaign",
        security: [{ bearerAuth: [] }],
        params: CampaignTesterParamsSchema,
        response: {
          200: TesterParticipationDetailSchema,
        },
      },
    },
    getMyCampaignDetailHandler as any,
  );

  // POST /campaigns/:campaignId/join (Tester self-enrollment)
  app.post(
    "/campaigns/:campaignId/join",
    {
      schema: {
        tags: ["CampaignTesters"],
        summary: "Tester joins an eligible closed testing campaign",
        security: [{ bearerAuth: [] }],
        params: CampaignTesterParamsSchema,
        response: {
          201: CampaignTesterResponseSchema,
        },
      },
    },
    joinCampaignHandler as any,
  );

  // GET /campaigns/:campaignId/testers
  app.get(
    "/campaigns/:campaignId/testers",
    {
      schema: {
        tags: ["CampaignTesters"],
        summary: "List testers participating in a campaign",
        security: [{ bearerAuth: [] }],
        params: CampaignTesterParamsSchema,
        response: {
          200: CampaignTesterListResponseSchema,
        },
      },
    },
    listCampaignTestersHandler as any,
  );

  // GET /campaigns/:campaignId/testers/:testerId
  app.get(
    "/campaigns/:campaignId/testers/:testerId",
    {
      schema: {
        tags: ["CampaignTesters"],
        summary: "Get single tester participation details in a campaign",
        security: [{ bearerAuth: [] }],
        params: CampaignTesterDetailParamsSchema,
        response: {
          200: CampaignTesterResponseSchema,
        },
      },
    },
    getCampaignTesterHandler as any,
  );

  // POST /campaigns/:campaignId/testers (Administrative / Developer membership assignment)
  app.post(
    "/campaigns/:campaignId/testers",
    {
      preHandler: [requireRole(UserRole.DEVELOPER)],
      schema: {
        tags: ["CampaignTesters"],
        summary: "Add a tester to a campaign (Administrative assignment)",
        security: [{ bearerAuth: [] }],
        params: CampaignTesterParamsSchema,
        body: AddTesterToCampaignSchema,
        response: {
          201: CampaignTesterResponseSchema,
        },
      },
    },
    addTesterToCampaignHandler as any,
  );

  // DELETE /campaigns/:campaignId/testers/:testerId
  app.delete(
    "/campaigns/:campaignId/testers/:testerId",
    {
      preHandler: [requireRole(UserRole.DEVELOPER)],
      schema: {
        tags: ["CampaignTesters"],
        summary: "Remove a tester from a campaign",
        security: [{ bearerAuth: [] }],
        params: CampaignTesterDetailParamsSchema,
        body: RemoveTesterFromCampaignSchema,
        response: {
          200: CampaignTesterResponseSchema,
        },
      },
    },
    removeTesterFromCampaignHandler as any,
  );
}
