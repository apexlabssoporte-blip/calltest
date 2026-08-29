import { FastifyInstance } from "fastify";
import { authenticate } from "../../core/middlewares/auth-guard.js";
import {
  RewardHistoryQuerySchema,
  RewardHistoryResponseSchema,
  UserRewardsSummaryResponseSchema,
} from "./schemas.js";
import {
  getMyRewardHistoryHandler,
  getMyRewardsSummaryHandler,
} from "./handlers.js";

export async function rewardRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  // GET /me/rewards
  app.get(
    "/me/rewards",
    {
      schema: {
        tags: ["Rewards"],
        summary: "Get current user reward profile, total XP, total Gold, and summary",
        security: [{ bearerAuth: [] }],
        response: {
          200: UserRewardsSummaryResponseSchema,
        },
      },
    },
    getMyRewardsSummaryHandler as any,
  );

  // GET /me/rewards/history
  app.get(
    "/me/rewards/history",
    {
      schema: {
        tags: ["Rewards"],
        summary: "Get paginated reward ledger history for the current user",
        security: [{ bearerAuth: [] }],
        querystring: RewardHistoryQuerySchema,
        response: {
          200: RewardHistoryResponseSchema,
        },
      },
    },
    getMyRewardHistoryHandler as any,
  );
}
