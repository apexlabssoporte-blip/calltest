import { FastifyRequest, FastifyReply } from "fastify";
import { ReportService } from "./service.js";
import {
  CreateReportBody,
  DeveloperReviewBody,
  EscalateReportBody,
  FinalizeReportBody,
} from "./schemas.js";
import { UserRole } from "@calltest/shared-types";

export async function createReportHandler(
  request: FastifyRequest<{
    Params: { campaignId: string };
    Body: CreateReportBody;
  }>,
  reply: FastifyReply,
) {
  const testerId = request.user.id;
  const { campaignId } = request.params;
  const report = await ReportService.createReport(
    testerId,
    campaignId,
    request.body,
    request.ip,
    request.headers["user-agent"],
  );

  return reply.status(201).send(report);
}

export async function listCampaignReportsHandler(
  request: FastifyRequest<{
    Params: { campaignId: string };
  }>,
  reply: FastifyReply,
) {
  const userId = request.user.id;
  const role = request.user.role as UserRole;
  const { campaignId } = request.params;

  const result = await ReportService.listCampaignReports(campaignId, userId, role);
  return reply.send(result);
}

export async function getReportByIdHandler(
  request: FastifyRequest<{
    Params: { id: string };
  }>,
  reply: FastifyReply,
) {
  const userId = request.user.id;
  const role = request.user.role as UserRole;
  const { id } = request.params;

  const report = await ReportService.getReportById(id, userId, role);
  return reply.send(report);
}

export async function developerReviewHandler(
  request: FastifyRequest<{
    Params: { id: string };
    Body: DeveloperReviewBody;
  }>,
  reply: FastifyReply,
) {
  const developerId = request.user.id;
  const { id } = request.params;
  const { decision, reason } = request.body;

  const updated = await ReportService.reviewReportByDeveloper(
    id,
    developerId,
    decision,
    reason,
    request.ip,
    request.headers["user-agent"],
  );

  return reply.send(updated);
}

export async function escalateReportHandler(
  request: FastifyRequest<{
    Params: { id: string };
    Body: EscalateReportBody;
  }>,
  reply: FastifyReply,
) {
  const userId = request.user.id;
  const role = request.user.role as UserRole;
  const { id } = request.params;
  const { reason } = request.body;

  const updated = await ReportService.escalateReport(
    id,
    userId,
    role,
    reason,
    request.ip,
    request.headers["user-agent"],
  );

  return reply.send(updated);
}

export async function getAiReviewHandler(
  request: FastifyRequest<{
    Params: { id: string };
  }>,
  reply: FastifyReply,
) {
  const userId = request.user.id;
  const role = request.user.role as UserRole;
  const { id } = request.params;

  const aiReview = await ReportService.getAiReviewByReportId(id, userId, role);
  return reply.send(aiReview);
}

export async function listPendingAdminReportsHandler(
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  const result = await ReportService.listPendingAdminReports();
  return reply.send(result);
}

export async function listReportClustersHandler(
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  const result = await ReportService.listReportClusters();
  return reply.send(result);
}

export async function finalizeReportHandler(
  request: FastifyRequest<{
    Params: { id: string };
    Body: FinalizeReportBody;
  }>,
  reply: FastifyReply,
) {
  const adminId = request.user.id;
  const { id } = request.params;
  const { decision, reason } = request.body;

  const updated = await ReportService.finalizeReportByHuman(
    id,
    adminId,
    decision,
    reason,
    request.ip,
    request.headers["user-agent"],
  );

  return reply.send(updated);
}
