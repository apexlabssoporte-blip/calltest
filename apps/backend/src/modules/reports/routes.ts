import { FastifyInstance } from "fastify";
import { Type } from "@sinclair/typebox";
import {
  CreateReportBodySchema,
  DeveloperReviewBodySchema,
  EscalateReportBodySchema,
  FinalizeReportBodySchema,
  TesterReportResponseSchema,
  TesterReportListResponseSchema,
  ReportClusterListResponseSchema,
  AiReviewResponseSchema,
} from "./schemas.js";
import {
  createReportHandler,
  listCampaignReportsHandler,
  getReportByIdHandler,
  developerReviewHandler,
  escalateReportHandler,
  getAiReviewHandler,
  listPendingAdminReportsHandler,
  listReportClustersHandler,
  finalizeReportHandler,
} from "./handlers.js";
import { authenticate } from "../../core/middlewares/auth-guard.js";
import { requireRole } from "../../core/middlewares/rbac-guard.js";
import { UserRole } from "@calltest/shared-types";

export async function reportRoutes(app: FastifyInstance) {
  // 1. Tester creates a bug report for an active campaign
  app.post(
    "/campaigns/:campaignId/reports",
    {
      preHandler: [authenticate, requireRole(UserRole.TESTER)],
      schema: {
        tags: ["Reports"],
        summary: "Submit a new bug report for an active campaign",
        security: [{ bearerAuth: [] }],
        params: Type.Object({
          campaignId: Type.String({ format: "uuid" }),
        }),
        body: CreateReportBodySchema,
        response: {
          201: TesterReportResponseSchema,
        },
      },
    },
    createReportHandler as any,
  );

  // 2. Developer lists reports for a campaign
  app.get(
    "/campaigns/:campaignId/reports",
    {
      preHandler: [authenticate, requireRole(UserRole.DEVELOPER)],
      schema: {
        tags: ["Reports"],
        summary: "List all tester reports for a campaign (Developer view)",
        security: [{ bearerAuth: [] }],
        params: Type.Object({
          campaignId: Type.String({ format: "uuid" }),
        }),
        response: {
          200: TesterReportListResponseSchema,
        },
      },
    },
    listCampaignReportsHandler as any,
  );

  // 3. Get single report details by ID
  app.get(
    "/reports/:id",
    {
      preHandler: [authenticate],
      schema: {
        tags: ["Reports"],
        summary: "Get report details by ID",
        security: [{ bearerAuth: [] }],
        params: Type.Object({
          id: Type.String({ format: "uuid" }),
        }),
        response: {
          200: TesterReportResponseSchema,
        },
      },
    },
    getReportByIdHandler as any,
  );

  // 4. Developer reviews report
  app.post(
    "/reports/:id/developer-review",
    {
      preHandler: [authenticate, requireRole(UserRole.DEVELOPER)],
      schema: {
        tags: ["Reports"],
        summary: "Developer reviews and evaluates a tester report",
        security: [{ bearerAuth: [] }],
        params: Type.Object({
          id: Type.String({ format: "uuid" }),
        }),
        body: DeveloperReviewBodySchema,
        response: {
          200: TesterReportResponseSchema,
        },
      },
    },
    developerReviewHandler as any,
  );

  // 5. Escalate a report
  app.post(
    "/reports/:id/escalate",
    {
      preHandler: [authenticate],
      schema: {
        tags: ["Reports"],
        summary: "Escalate a report for AI second opinion and human review",
        security: [{ bearerAuth: [] }],
        params: Type.Object({
          id: Type.String({ format: "uuid" }),
        }),
        body: EscalateReportBodySchema,
        response: {
          200: TesterReportResponseSchema,
        },
      },
    },
    escalateReportHandler as any,
  );

  // 6. Inspect AI Review for a report
  app.get(
    "/reports/:id/ai-review",
    {
      preHandler: [authenticate],
      schema: {
        tags: ["Reports"],
        summary: "Get AI structured second opinion review for a report",
        security: [{ bearerAuth: [] }],
        params: Type.Object({
          id: Type.String({ format: "uuid" }),
        }),
        response: {
          200: AiReviewResponseSchema,
        },
      },
    },
    getAiReviewHandler as any,
  );

  // 7. Admin: List pending escalated reports
  app.get(
    "/admin/reports/pending",
    {
      preHandler: [authenticate, requireRole(UserRole.ADMIN)],
      schema: {
        tags: ["Admin Reports"],
        summary: "List all pending escalated reports for admin human review",
        security: [{ bearerAuth: [] }],
        response: {
          200: TesterReportListResponseSchema,
        },
      },
    },
    listPendingAdminReportsHandler as any,
  );

  // 8. Admin: List report clusters
  app.get(
    "/admin/report-clusters",
    {
      preHandler: [authenticate, requireRole(UserRole.ADMIN)],
      schema: {
        tags: ["Admin Reports"],
        summary: "List all report clusters across campaigns",
        security: [{ bearerAuth: [] }],
        response: {
          200: ReportClusterListResponseSchema,
        },
      },
    },
    listReportClustersHandler as any,
  );

  // 9. Admin: Finalize report
  app.post(
    "/admin/reports/:id/finalize",
    {
      preHandler: [authenticate, requireRole(UserRole.ADMIN)],
      schema: {
        tags: ["Admin Reports"],
        summary: "Admin human final decision on escalated report",
        security: [{ bearerAuth: [] }],
        params: Type.Object({
          id: Type.String({ format: "uuid" }),
        }),
        body: FinalizeReportBodySchema,
        response: {
          200: TesterReportResponseSchema,
        },
      },
    },
    finalizeReportHandler as any,
  );
}
