import { FastifyRequest, FastifyReply } from "fastify";
import { InstallationService } from "./service.js";
import { AuthenticatedUser } from "../../core/middlewares/auth-guard.js";
import {
  ClaimInstallationRequest,
  SdkInstallationEventRequest,
} from "./schemas.js";

export async function claimInstallationHandler(
  request: FastifyRequest<{ Body: ClaimInstallationRequest }>,
  reply: FastifyReply,
) {
  const user = request.user as AuthenticatedUser;
  const record = await InstallationService.claimInstallation(
    request.body.campaignId,
    user.id,
    {
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
    },
  );

  return reply.code(200).send({
    id: record.id,
    campaignId: record.campaignId,
    appId: record.appId,
    testerId: record.testerId,
    installationId: record.installationId,
    status: record.status,
    verificationMethod: record.verificationMethod,
    firstDetectedAt: record.firstDetectedAt ? record.firstDetectedAt.toISOString() : null,
    firstOpenedAt: record.firstOpenedAt ? record.firstOpenedAt.toISOString() : null,
    lastSeenAt: record.lastSeenAt ? record.lastSeenAt.toISOString() : null,
    claimedAt: record.claimedAt ? record.claimedAt.toISOString() : null,
    verifiedAt: record.verifiedAt ? record.verifiedAt.toISOString() : null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  });
}

export async function processSdkInstallationEventHandler(
  request: FastifyRequest<{ Body: SdkInstallationEventRequest }>,
  reply: FastifyReply,
) {
  const user = request.user as AuthenticatedUser;
  const record = await InstallationService.processSdkEvent(
    request.body.campaignId,
    request.body.appId,
    user.id,
    request.body.eventType,
    request.body.installationId,
    {
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
    },
  );

  return reply.code(200).send({
    id: record.id,
    campaignId: record.campaignId,
    appId: record.appId,
    testerId: record.testerId,
    installationId: record.installationId,
    status: record.status,
    verificationMethod: record.verificationMethod,
    firstDetectedAt: record.firstDetectedAt ? record.firstDetectedAt.toISOString() : null,
    firstOpenedAt: record.firstOpenedAt ? record.firstOpenedAt.toISOString() : null,
    lastSeenAt: record.lastSeenAt ? record.lastSeenAt.toISOString() : null,
    claimedAt: record.claimedAt ? record.claimedAt.toISOString() : null,
    verifiedAt: record.verifiedAt ? record.verifiedAt.toISOString() : null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  });
}

export async function getInstallationStatusHandler(
  request: FastifyRequest<{ Params: { campaignId: string } }>,
  reply: FastifyReply,
) {
  const user = request.user as AuthenticatedUser;
  const status = await InstallationService.getInstallationStatus(
    request.params.campaignId,
    user.id,
  );

  return reply.code(200).send(status);
}
