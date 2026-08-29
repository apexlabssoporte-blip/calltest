import { Redis } from "ioredis";
import { env } from "../config/env.js";

export class RedisClient {
  private static instance: Redis | null = null;

  public static getInstance(): Redis {
    if (!RedisClient.instance) {
      RedisClient.instance = new Redis({
        host: env.REDIS_HOST,
        port: env.REDIS_PORT,
        password: env.REDIS_PASSWORD || undefined,
        maxRetriesPerRequest: 1,
        lazyConnect: true,
        retryStrategy(times) {
          if (times > 3) {
            return null; // Stop retrying after 3 attempts
          }
          return Math.min(times * 200, 1000);
        },
      });
    }
    return RedisClient.instance;
  }

  public static async ping(): Promise<boolean> {
    try {
      const client = RedisClient.getInstance();
      if (
        client.status !== "ready" &&
        client.status !== "connecting" &&
        client.status !== "connect"
      ) {
        await client.connect();
      }
      const response = await client.ping();
      return response === "PONG";
    } catch {
      return false;
    }
  }

  public static async disconnect(): Promise<void> {
    if (RedisClient.instance) {
      RedisClient.instance.disconnect();
      RedisClient.instance = null;
    }
  }
}

export const redis = RedisClient.getInstance();
