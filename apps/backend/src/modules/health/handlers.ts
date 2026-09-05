import { FastifyReply, FastifyRequest } from "fastify";
import { DatabaseClient } from "../../core/database/prisma.js";
import { RedisClient } from "../../core/redis/client.js";
import { HealthLiveResponse, HealthReadyResponse } from "./schemas.js";

export async function getLivenessHandler(
  _request: FastifyRequest,
  reply: FastifyReply,
): Promise<HealthLiveResponse> {
  return reply.code(200).send({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}

export async function getReadinessHandler(
  _request: FastifyRequest,
  reply: FastifyReply,
): Promise<HealthReadyResponse> {
  const isDbOk = await DatabaseClient.ping();
  const isRedisOk = await RedisClient.ping();

  const allHealthy = isDbOk && isRedisOk;
  const statusCode = allHealthy ? 200 : 503;

  return reply.code(statusCode).send({
    status: allHealthy ? "ok" : "error",
    timestamp: new Date().toISOString(),
    services: {
      database: isDbOk ? "ok" : "error",
      redis: isRedisOk ? "ok" : "error",
    },
  });
}

export async function getStartupHandler(
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  const uptime = process.uptime();
  return reply.code(200).send({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(uptime),
  });
}
