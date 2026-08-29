import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildApp } from "../../app.js";
import { DatabaseClient } from "../../core/database/prisma.js";
import { RedisClient } from "../../core/redis/client.js";

describe("Health Endpoints", () => {
  const app = buildApp();

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("GET /health/live should return 200 with status ok", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/health/live",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe("ok");
    expect(body.timestamp).toBeDefined();
  });

  it("GET /health/ready should return 200 when database and redis are healthy", async () => {
    vi.spyOn(DatabaseClient, "ping").mockResolvedValue(true);
    vi.spyOn(RedisClient, "ping").mockResolvedValue(true);

    const response = await app.inject({
      method: "GET",
      url: "/health/ready",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe("ok");
    expect(body.services.database).toBe("ok");
    expect(body.services.redis).toBe("ok");
  });

  it("GET /health/ready should return 503 when any service is down", async () => {
    vi.spyOn(DatabaseClient, "ping").mockResolvedValue(false);
    vi.spyOn(RedisClient, "ping").mockResolvedValue(true);

    const response = await app.inject({
      method: "GET",
      url: "/health/ready",
    });

    expect(response.statusCode).toBe(503);
    const body = JSON.parse(response.body);
    expect(body.status).toBe("error");
    expect(body.services.database).toBe("error");
    expect(body.services.redis).toBe("ok");
  });
});
