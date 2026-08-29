import { FastifyRequest, FastifyReply } from "fastify";
import { RewardService } from "./service.js";
import { RewardHistoryQuery } from "./schemas.js";

export async function getMyRewardsSummaryHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const userId = request.user.id;
  const summary = await RewardService.getUserRewardsSummary(userId);
  return reply.status(200).send(summary);
}

export async function getMyRewardHistoryHandler(
  request: FastifyRequest<{ Querystring: RewardHistoryQuery }>,
  reply: FastifyReply,
) {
  const userId = request.user.id;
  const history = await RewardService.getRewardHistory(userId, request.query);
  return reply.status(200).send(history);
}
