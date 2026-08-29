import { FastifyRequest, FastifyReply } from "fastify";
import { EvidenceService } from "./service.js";
import { AuthenticatedUser } from "../../core/middlewares/auth-guard.js";
import {
  SubmitEvidenceBody,
  RejectEvidenceBody,
} from "./schemas.js";
import { EvidenceStatus } from "@calltest/shared-types";

export async function submitEvidenceHandler(
  request: FastifyRequest<{
    Params: { attemptId: string };
    Body: SubmitEvidenceBody;
  }>,
  reply: FastifyReply,
) {
  const user = request.user as AuthenticatedUser;
  const evidence = await EvidenceService.submitEvidence(
    request.params.attemptId,
    user.id,
    request.body.imageBase64,
    request.body.filename,
    request.body.mimeType,
    {
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
    },
  );

  return reply.code(201).send({
    id: evidence.id,
    missionAttemptId: evidence.missionAttemptId,
    campaignId: evidence.campaignId,
    testerId: evidence.testerId,
    missionId: evidence.missionId,
    fileReference: evidence.fileReference,
    mimeType: evidence.mimeType,
    fileSize: evidence.fileSize,
    sha256: evidence.sha256,
    status: evidence.status,
    submittedAt: evidence.submittedAt.toISOString(),
    reviewedAt: evidence.reviewedAt ? evidence.reviewedAt.toISOString() : null,
    reviewedById: evidence.reviewedById,
    rejectionReason: evidence.rejectionReason,
    rejectionComment: evidence.rejectionComment,
    createdAt: evidence.createdAt.toISOString(),
    updatedAt: evidence.updatedAt.toISOString(),
  });
}

export async function approveEvidenceHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const user = request.user as AuthenticatedUser;
  const evidence = await EvidenceService.approveEvidence(
    request.params.id,
    user.id,
    user.role,
    {
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
    },
  );

  return reply.code(200).send({
    id: evidence.id,
    missionAttemptId: evidence.missionAttemptId,
    campaignId: evidence.campaignId,
    testerId: evidence.testerId,
    missionId: evidence.missionId,
    fileReference: evidence.fileReference,
    mimeType: evidence.mimeType,
    fileSize: evidence.fileSize,
    sha256: evidence.sha256,
    status: evidence.status,
    submittedAt: evidence.submittedAt.toISOString(),
    reviewedAt: evidence.reviewedAt ? evidence.reviewedAt.toISOString() : null,
    reviewedById: evidence.reviewedById,
    rejectionReason: evidence.rejectionReason,
    rejectionComment: evidence.rejectionComment,
    createdAt: evidence.createdAt.toISOString(),
    updatedAt: evidence.updatedAt.toISOString(),
  });
}

export async function rejectEvidenceHandler(
  request: FastifyRequest<{
    Params: { id: string };
    Body: RejectEvidenceBody;
  }>,
  reply: FastifyReply,
) {
  const user = request.user as AuthenticatedUser;
  const evidence = await EvidenceService.rejectEvidence(
    request.params.id,
    user.id,
    user.role,
    request.body.reason,
    request.body.comment,
    {
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
    },
  );

  return reply.code(200).send({
    id: evidence.id,
    missionAttemptId: evidence.missionAttemptId,
    campaignId: evidence.campaignId,
    testerId: evidence.testerId,
    missionId: evidence.missionId,
    fileReference: evidence.fileReference,
    mimeType: evidence.mimeType,
    fileSize: evidence.fileSize,
    sha256: evidence.sha256,
    status: evidence.status,
    submittedAt: evidence.submittedAt.toISOString(),
    reviewedAt: evidence.reviewedAt ? evidence.reviewedAt.toISOString() : null,
    reviewedById: evidence.reviewedById,
    rejectionReason: evidence.rejectionReason,
    rejectionComment: evidence.rejectionComment,
    createdAt: evidence.createdAt.toISOString(),
    updatedAt: evidence.updatedAt.toISOString(),
  });
}

export async function listCampaignEvidencesHandler(
  request: FastifyRequest<{
    Params: { campaignId: string };
    Querystring: { status?: EvidenceStatus };
  }>,
  reply: FastifyReply,
) {
  const user = request.user as AuthenticatedUser;
  const evidences = await EvidenceService.listCampaignEvidences(
    request.params.campaignId,
    user.id,
    user.role,
    request.query.status,
  );

  return reply.code(200).send(
    evidences.map((e) => ({
      id: e.id,
      missionAttemptId: e.missionAttemptId,
      campaignId: e.campaignId,
      testerId: e.testerId,
      missionId: e.missionId,
      fileReference: e.fileReference,
      mimeType: e.mimeType,
      fileSize: e.fileSize,
      sha256: e.sha256,
      status: e.status,
      submittedAt: e.submittedAt.toISOString(),
      reviewedAt: e.reviewedAt ? e.reviewedAt.toISOString() : null,
      reviewedById: e.reviewedById,
      rejectionReason: e.rejectionReason,
      rejectionComment: e.rejectionComment,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    })),
  );
}

export async function getEvidenceByIdHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const user = request.user as AuthenticatedUser;
  const evidence = await EvidenceService.getEvidenceById(
    request.params.id,
    user.id,
    user.role,
  );

  return reply.code(200).send({
    id: evidence.id,
    missionAttemptId: evidence.missionAttemptId,
    campaignId: evidence.campaignId,
    testerId: evidence.testerId,
    missionId: evidence.missionId,
    fileReference: evidence.fileReference,
    mimeType: evidence.mimeType,
    fileSize: evidence.fileSize,
    sha256: evidence.sha256,
    status: evidence.status,
    submittedAt: evidence.submittedAt.toISOString(),
    reviewedAt: evidence.reviewedAt ? evidence.reviewedAt.toISOString() : null,
    reviewedById: evidence.reviewedById,
    rejectionReason: evidence.rejectionReason,
    rejectionComment: evidence.rejectionComment,
    createdAt: evidence.createdAt.toISOString(),
    updatedAt: evidence.updatedAt.toISOString(),
  });
}

export async function listTesterMyEvidencesHandler(
  request: FastifyRequest<{ Params: { campaignId: string } }>,
  reply: FastifyReply,
) {
  const user = request.user as AuthenticatedUser;
  const evidences = await EvidenceService.listTesterEvidences(
    request.params.campaignId,
    user.id,
  );

  return reply.code(200).send(
    evidences.map((e) => ({
      id: e.id,
      missionAttemptId: e.missionAttemptId,
      campaignId: e.campaignId,
      testerId: e.testerId,
      missionId: e.missionId,
      fileReference: e.fileReference,
      mimeType: e.mimeType,
      fileSize: e.fileSize,
      sha256: e.sha256,
      status: e.status,
      submittedAt: e.submittedAt.toISOString(),
      reviewedAt: e.reviewedAt ? e.reviewedAt.toISOString() : null,
      reviewedById: e.reviewedById,
      rejectionReason: e.rejectionReason,
      rejectionComment: e.rejectionComment,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    })),
  );
}
