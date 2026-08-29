import { FastifyRequest, FastifyReply } from "fastify";
import { AdminService } from "./service.js";
import {
  AdminEvidenceApproveRequest,
  AdminEvidenceListQuery,
  AdminEvidenceRejectRequest,
  AdminUserActionRequest,
  AdminUserListQuery,
  CreateOperationalReview,
  UpdateOperationalReview,
} from "./schemas.js";

// Users
export async function getAdminUsersHandler(
  request: FastifyRequest<{ Querystring: AdminUserListQuery }>,
  reply: FastifyReply,
) {
  const result = await AdminService.getUsers(request.query);
  return reply.status(200).send(result);
}

export async function getAdminUserDetailHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const user = await AdminService.getUserDetail(request.params.id);
  return reply.status(200).send(user);
}

export async function suspendUserHandler(
  request: FastifyRequest<{ Params: { id: string }; Body: AdminUserActionRequest }>,
  reply: FastifyReply,
) {
  const adminId = request.user.id;
  const updated = await AdminService.suspendUser(
    request.params.id,
    adminId,
    request.body.reason,
    request.ip,
    request.headers["user-agent"],
  );
  return reply.status(200).send(updated);
}

export async function unsuspendUserHandler(
  request: FastifyRequest<{ Params: { id: string }; Body: AdminUserActionRequest }>,
  reply: FastifyReply,
) {
  const adminId = request.user.id;
  const updated = await AdminService.unsuspendUser(
    request.params.id,
    adminId,
    request.body.reason,
    request.ip,
    request.headers["user-agent"],
  );
  return reply.status(200).send(updated);
}

export async function banUserHandler(
  request: FastifyRequest<{ Params: { id: string }; Body: AdminUserActionRequest }>,
  reply: FastifyReply,
) {
  const adminId = request.user.id;
  const updated = await AdminService.banUser(
    request.params.id,
    adminId,
    request.body.reason,
    request.ip,
    request.headers["user-agent"],
  );
  return reply.status(200).send(updated);
}

export async function unbanUserHandler(
  request: FastifyRequest<{ Params: { id: string }; Body: AdminUserActionRequest }>,
  reply: FastifyReply,
) {
  const adminId = request.user.id;
  const updated = await AdminService.unbanUser(
    request.params.id,
    adminId,
    request.body.reason,
    request.ip,
    request.headers["user-agent"],
  );
  return reply.status(200).send(updated);
}

// Evidence Review
export async function getAdminPendingEvidenceHandler(
  request: FastifyRequest<{ Querystring: AdminEvidenceListQuery }>,
  reply: FastifyReply,
) {
  const result = await AdminService.getPendingEvidence(request.query);
  return reply.status(200).send(result);
}

export async function approveAdminEvidenceHandler(
  request: FastifyRequest<{ Params: { id: string }; Body?: AdminEvidenceApproveRequest }>,
  reply: FastifyReply,
) {
  const adminId = request.user.id;
  const result = await AdminService.approveEvidence(
    request.params.id,
    adminId,
    { ipAddress: request.ip, userAgent: request.headers["user-agent"] },
  );
  return reply.status(200).send(result);
}

export async function rejectAdminEvidenceHandler(
  request: FastifyRequest<{ Params: { id: string }; Body: AdminEvidenceRejectRequest }>,
  reply: FastifyReply,
) {
  const adminId = request.user.id;
  const result = await AdminService.rejectEvidence(
    request.params.id,
    adminId,
    request.body.reason,
  );
  return reply.status(200).send(result);
}

// Operational Reviews / Disputes
export async function createOperationalReviewHandler(
  request: FastifyRequest<{ Body: CreateOperationalReview }>,
  reply: FastifyReply,
) {
  const userId = request.user.id;
  const review = await AdminService.createReviewDispute(userId, request.body);
  return reply.status(201).send(review);
}

export async function updateOperationalReviewHandler(
  request: FastifyRequest<{ Params: { id: string }; Body: UpdateOperationalReview }>,
  reply: FastifyReply,
) {
  const adminId = request.user.id;
  const updated = await AdminService.updateReviewDispute(
    request.params.id,
    adminId,
    request.body,
  );
  return reply.status(200).send(updated);
}

export async function getOperationalReviewHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const review = await AdminService.getReviewDispute(request.params.id);
  return reply.status(200).send(review);
}
