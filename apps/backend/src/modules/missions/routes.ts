import { FastifyInstance } from "fastify";
import {
  CreateMissionRequestSchema,
  UpdateMissionRequestSchema,
  ApproveMissionRequestSchema,
  RejectMissionRequestSchema,
  GenerateMissionsRequestSchema,
  SubmitAttemptRequestSchema,
  DifficultyFeedbackRequestSchema,
  QualityFeedbackRequestSchema,
  CampaignMissionsParamsSchema,
  MissionParamsSchema,
  StartAttemptParamsSchema,
  AttemptParamsSchema,
  TesterMissionsParamsSchema,
  MissionResponseSchema,
  MissionListResponseSchema,
  MissionAttemptResponseSchema,
  MissionAttemptListResponseSchema,
} from "./schemas.js";
import {
  createMissionHandler,
  generateMissionsHandler,
  listCampaignMissionsHandler,
  getMissionByIdHandler,
  updateMissionHandler,
  approveMissionHandler,
  rejectMissionHandler,
  startAttemptHandler,
  submitAttemptHandler,
  listTesterMissionsHandler,
  recordDifficultyFeedbackHandler,
  recordQualityFeedbackHandler,
  getDailyMissionsInboxHandler,
} from "./handlers.js";
import { authenticate } from "../../core/middlewares/auth-guard.js";
import { requireRole } from "../../core/middlewares/rbac-guard.js";
import { UserRole } from "@calltest/shared-types";

export async function missionRoutes(app: FastifyInstance) {
  // All mission routes require authentication
  app.addHook("preHandler", authenticate);

  // POST /campaigns/:campaignId/missions
  app.post(
    "/campaigns/:campaignId/missions",
    {
      preHandler: [requireRole(UserRole.DEVELOPER)],
      schema: {
        tags: ["Missions"],
        summary: "Create a new mission for a campaign",
        security: [{ bearerAuth: [] }],
        params: CampaignMissionsParamsSchema,
        body: CreateMissionRequestSchema,
        response: {
          201: MissionResponseSchema,
        },
      },
    },
    createMissionHandler as any,
  );

  // POST /campaigns/:campaignId/missions/generate
  app.post(
    "/campaigns/:campaignId/missions/generate",
    {
      preHandler: [requireRole(UserRole.DEVELOPER)],
      schema: {
        tags: ["Missions"],
        summary: "Generate mission drafts via MissionGenerator (Starts in PENDING_REVIEW)",
        security: [{ bearerAuth: [] }],
        params: CampaignMissionsParamsSchema,
        body: GenerateMissionsRequestSchema,
        response: {
          201: MissionListResponseSchema,
        },
      },
    },
    generateMissionsHandler as any,
  );

  // GET /campaigns/:campaignId/missions
  app.get(
    "/campaigns/:campaignId/missions",
    {
      schema: {
        tags: ["Missions"],
        summary: "List all missions in a campaign",
        security: [{ bearerAuth: [] }],
        params: CampaignMissionsParamsSchema,
        response: {
          200: MissionListResponseSchema,
        },
      },
    },
    listCampaignMissionsHandler as any,
  );

  // GET /missions/:id
  app.get(
    "/missions/:id",
    {
      schema: {
        tags: ["Missions"],
        summary: "Get mission details by ID",
        security: [{ bearerAuth: [] }],
        params: MissionParamsSchema,
        response: {
          200: MissionResponseSchema,
        },
      },
    },
    getMissionByIdHandler as any,
  );

  // PATCH /missions/:id
  app.patch(
    "/missions/:id",
    {
      preHandler: [requireRole(UserRole.DEVELOPER)],
      schema: {
        tags: ["Missions"],
        summary: "Update mission details",
        security: [{ bearerAuth: [] }],
        params: MissionParamsSchema,
        body: UpdateMissionRequestSchema,
        response: {
          200: MissionResponseSchema,
        },
      },
    },
    updateMissionHandler as any,
  );

  // POST /missions/:id/approve
  app.post(
    "/missions/:id/approve",
    {
      preHandler: [requireRole(UserRole.DEVELOPER)],
      schema: {
        tags: ["Missions"],
        summary: "Approve a mission to ACTIVE status",
        security: [{ bearerAuth: [] }],
        params: MissionParamsSchema,
        body: ApproveMissionRequestSchema,
        response: {
          200: MissionResponseSchema,
        },
      },
    },
    approveMissionHandler as any,
  );

  // POST /missions/:id/reject
  app.post(
    "/missions/:id/reject",
    {
      preHandler: [requireRole(UserRole.DEVELOPER)],
      schema: {
        tags: ["Missions"],
        summary: "Reject a mission with reason",
        security: [{ bearerAuth: [] }],
        params: MissionParamsSchema,
        body: RejectMissionRequestSchema,
        response: {
          200: MissionResponseSchema,
        },
      },
    },
    rejectMissionHandler as any,
  );

  // POST /missions/:missionId/start (Tester starts an attempt)
  app.post(
    "/missions/:missionId/start",
    {
      preHandler: [requireRole(UserRole.TESTER)],
      schema: {
        tags: ["MissionAttempts"],
        summary: "Start or resume a mission attempt (Idempotent)",
        security: [{ bearerAuth: [] }],
        params: StartAttemptParamsSchema,
        response: {
          201: MissionAttemptResponseSchema,
        },
      },
    },
    startAttemptHandler as any,
  );

  // POST /mission-attempts/:id/submit (Tester submits completion)
  app.post(
    "/mission-attempts/:id/submit",
    {
      preHandler: [requireRole(UserRole.TESTER)],
      schema: {
        tags: ["MissionAttempts"],
        summary: "Submit a mission attempt (Strictly idempotent)",
        security: [{ bearerAuth: [] }],
        params: AttemptParamsSchema,
        body: SubmitAttemptRequestSchema,
        response: {
          200: MissionAttemptResponseSchema,
        },
      },
    },
    submitAttemptHandler as any,
  );

  // GET /campaign-testers/:testerId/missions
  app.get(
    "/campaign-testers/:testerId/missions",
    {
      schema: {
        tags: ["MissionAttempts"],
        summary: "List all mission attempts for a tester",
        security: [{ bearerAuth: [] }],
        params: TesterMissionsParamsSchema,
        response: {
          200: MissionAttemptListResponseSchema,
        },
      },
    },
    listTesterMissionsHandler as any,
  );

  // POST /mission-attempts/:id/difficulty
  app.post(
    "/mission-attempts/:id/difficulty",
    {
      preHandler: [requireRole(UserRole.TESTER)],
      schema: {
        tags: ["MissionFeedback"],
        summary: "Submit perceived difficulty rating for a completed mission",
        security: [{ bearerAuth: [] }],
        params: AttemptParamsSchema,
        body: DifficultyFeedbackRequestSchema,
      },
    },
    recordDifficultyFeedbackHandler as any,
  );

  // POST /mission-attempts/:id/quality-feedback
  app.post(
    "/mission-attempts/:id/quality-feedback",
    {
      preHandler: [requireRole(UserRole.TESTER)],
      schema: {
        tags: ["MissionFeedback"],
        summary: "Submit qualitative feedback (TOO_COMPLEX, CONFUSING, etc.)",
        security: [{ bearerAuth: [] }],
        params: AttemptParamsSchema,
        body: QualityFeedbackRequestSchema,
      },
    },
    recordQualityFeedbackHandler as any,
  );

  // GET /missions/today
  app.get(
    "/missions/today",
    {
      schema: {
        tags: ["Missions"],
        summary: "Get aggregated daily missions inbox across all active campaigns for the authenticated tester",
        security: [{ bearerAuth: [] }],
      },
    },
    getDailyMissionsInboxHandler as any,
  );

  // GET /me/missions/today
  app.get(
    "/me/missions/today",
    {
      schema: {
        tags: ["Missions"],
        summary: "Get aggregated daily missions inbox (alias for /missions/today)",
        security: [{ bearerAuth: [] }],
      },
    },
    getDailyMissionsInboxHandler as any,
  );
}
