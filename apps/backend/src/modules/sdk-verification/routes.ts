import { FastifyInstance } from "fastify";
import {
  SdkHandshakeRequest,
  SdkHandshakeRequestSchema,
  SdkHandshakeResponseSchema,
} from "./schemas.js";
import { SdkVerificationService } from "./service.js";

export async function sdkVerificationRoutes(app: FastifyInstance) {
  app.post<{ Body: SdkHandshakeRequest }>(
    "/sdk/handshake",
    {
      config: {
        rateLimit: { max: 30, timeWindow: "1 minute" },
      },
      schema: {
        tags: ["SDK"],
        summary: "Verify that the CallTest SDK is installed in its registered Android app",
        body: SdkHandshakeRequestSchema,
        response: { 200: SdkHandshakeResponseSchema },
      },
    },
    async (request, reply) => {
      const result = await SdkVerificationService.verifyHandshake(request.body);
      return reply.code(200).send(result);
    },
  );
}
