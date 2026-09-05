import { buildApp } from "./app.js";
import { env, validateProductionEnv } from "./core/config/env.js";
import { DatabaseClient } from "./core/database/prisma.js";
import { RedisClient } from "./core/redis/client.js";

async function startServer() {
  const productionValidation = validateProductionEnv(env);
  if (!productionValidation.isValid) {
    throw new Error(
      `Unsafe production configuration:\n- ${productionValidation.errors.join("\n- ")}`,
    );
  }

  const app = buildApp();

  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal}. Gracefully shutting down...`);
    try {
      await app.close();
      await DatabaseClient.disconnect();
      await RedisClient.disconnect();
      app.log.info("Server closed successfully.");
      process.exit(0);
    } catch (err) {
      app.log.error(err, "Error during graceful shutdown");
      process.exit(1);
    }
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    app.log.info(
      `🚀 CallTest Backend listening on http://${env.HOST}:${env.PORT}`,
    );
    app.log.info(
      `📖 OpenAPI Docs available at http://${env.HOST}:${env.PORT}/docs`,
    );
  } catch (err) {
    app.log.error(err, "Failed to start server");
    process.exit(1);
  }
}

startServer();
