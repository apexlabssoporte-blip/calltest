import { FastifyInstance } from "fastify";
import {
  SubmitEvidenceBodySchema,
  RejectEvidenceBodySchema,
  MissionEvidenceResponseSchema,
  MissionEvidenceListResponseSchema,
} from "./schemas.js";
import {
  submitEvidenceHandler,
  approveEvidenceHandler,
  rejectEvidenceHandler,
  listCampaignEvidencesHandler,
  getEvidenceByIdHandler,
  listTesterMyEvidencesHandler,
} from "./handlers.js";
import { authenticate } from "../../core/middlewares/auth-guard.js";
import { requireRole } from "../../core/middlewares/rbac-guard.js";
import { UserRole } from "@calltest/shared-types";
import { Type } from "@sinclair/typebox";

export async function evidenceRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  // POST /mission-attempts/:attemptId/evidence (Tester)
  app.post(
    "/mission-attempts/:attemptId/evidence",
    {
      config: {
        rateLimit: {
          max: 20,
          timeWindow: "1 minute",
        },
      },
      schema: {
        tags: ["Evidence"],
        summary: "Upload screenshot evidence for a mission attempt",
        security: [{ bearerAuth: [] }],
        params: Type.Object({
          attemptId: Type.String({ format: "uuid" }),
        }),
        body: SubmitEvidenceBodySchema,
        response: {
          201: MissionEvidenceResponseSchema,
        },
      },
    },
    submitEvidenceHandler as any,
  );

  // GET /campaigns/:campaignId/evidence (Developer / Admin)
  app.get(
    "/campaigns/:campaignId/evidence",
    {
      preHandler: [requireRole(UserRole.DEVELOPER)],
      schema: {
        tags: ["Evidence"],
        summary: "List all evidence submissions for a campaign (Developer view)",
        security: [{ bearerAuth: [] }],
        params: Type.Object({
          campaignId: Type.String({ format: "uuid" }),
        }),
        response: {
          200: MissionEvidenceListResponseSchema,
        },
      },
    },
    listCampaignEvidencesHandler as any,
  );

  // GET /evidence/:id (Developer / Tester owner / Admin)
  app.get(
    "/evidence/:id",
    {
      schema: {
        tags: ["Evidence"],
        summary: "Get specific evidence details and review status",
        security: [{ bearerAuth: [] }],
        params: Type.Object({
          id: Type.String({ format: "uuid" }),
        }),
        response: {
          200: MissionEvidenceResponseSchema,
        },
      },
    },
    getEvidenceByIdHandler as any,
  );

  // POST /evidence/:id/approve (Developer / Admin)
  app.post(
    "/evidence/:id/approve",
    {
      preHandler: [requireRole(UserRole.DEVELOPER)],
      schema: {
        tags: ["Evidence"],
        summary: "Approve mission screenshot evidence",
        security: [{ bearerAuth: [] }],
        params: Type.Object({
          id: Type.String({ format: "uuid" }),
        }),
        response: {
          200: MissionEvidenceResponseSchema,
        },
      },
    },
    approveEvidenceHandler as any,
  );

  // POST /evidence/:id/reject (Developer / Admin)
  app.post(
    "/evidence/:id/reject",
    {
      preHandler: [requireRole(UserRole.DEVELOPER)],
      schema: {
        tags: ["Evidence"],
        summary: "Reject mission screenshot evidence with mandatory reason",
        security: [{ bearerAuth: [] }],
        params: Type.Object({
          id: Type.String({ format: "uuid" }),
        }),
        body: RejectEvidenceBodySchema,
        response: {
          200: MissionEvidenceResponseSchema,
        },
      },
    },
    rejectEvidenceHandler as any,
  );

  // GET /me/campaigns/:campaignId/evidence (Tester's own evidences)
  app.get(
    "/me/campaigns/:campaignId/evidence",
    {
      schema: {
        tags: ["Evidence"],
        summary: "List authenticated tester's own evidence submissions in a campaign",
        security: [{ bearerAuth: [] }],
        params: Type.Object({
          campaignId: Type.String({ format: "uuid" }),
        }),
        response: {
          200: MissionEvidenceListResponseSchema,
        },
      },
    },
    listTesterMyEvidencesHandler as any,
  );
}
