import { FastifyRequest, FastifyReply } from "fastify";
import { NotificationRepository } from "./repository.js";
import { AuthenticatedUser } from "../../core/middlewares/auth-guard.js";
import {
  GetNotificationsQuery,
  MarkNotificationReadParams,
  UpdateNotificationPreferencesBody,
  RegisterDeviceTokenBody,
} from "./schemas.js";

export async function getNotificationsHandler(
  request: FastifyRequest<{ Querystring: GetNotificationsQuery }>,
  reply: FastifyReply,
) {
  const user = request.user as AuthenticatedUser;
  const result = await NotificationRepository.getUserNotifications(user.id, {
    page: request.query.page,
    limit: request.query.limit,
    unreadOnly: request.query.unreadOnly,
  });

  return reply.code(200).send({
    notifications: result.notifications.map((n) => ({
      id: n.id,
      userId: n.userId,
      type: n.type,
      title: n.title,
      body: n.body,
      data: n.data || undefined,
      status: n.status,
      priority: n.priority,
      channel: n.channel,
      readAt: n.readAt ? n.readAt.toISOString() : null,
      createdAt: n.createdAt.toISOString(),
    })),
    total: result.total,
    page: result.page,
    limit: result.limit,
    totalPages: result.totalPages,
  });
}

export async function getUnreadCountHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const user = request.user as AuthenticatedUser;
  const count = await NotificationRepository.getUnreadCount(user.id);

  return reply.code(200).send({ unreadCount: count });
}

export async function markNotificationReadHandler(
  request: FastifyRequest<{ Params: MarkNotificationReadParams }>,
  reply: FastifyReply,
) {
  const user = request.user as AuthenticatedUser;
  const notification = await NotificationRepository.markAsRead(
    request.params.id,
    user.id,
  );

  return reply.code(200).send({
    id: notification.id,
    status: notification.status,
    readAt: notification.readAt ? notification.readAt.toISOString() : new Date().toISOString(),
  });
}

export async function markAllNotificationsReadHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const user = request.user as AuthenticatedUser;
  const result = await NotificationRepository.markAllAsRead(user.id);

  return reply.code(200).send({
    count: result.count,
    markedAt: result.markedAt.toISOString(),
  });
}

export async function getNotificationPreferencesHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const user = request.user as AuthenticatedUser;
  const prefs = await NotificationRepository.getPreferences(user.id);

  return reply.code(200).send({
    campaignNotifications: prefs.campaignNotifications,
    missionNotifications: prefs.missionNotifications,
    trustNotifications: prefs.trustNotifications,
    systemNotifications: prefs.systemNotifications,
    pushNotifications: prefs.pushNotifications,
  });
}

export async function updateNotificationPreferencesHandler(
  request: FastifyRequest<{ Body: UpdateNotificationPreferencesBody }>,
  reply: FastifyReply,
) {
  const user = request.user as AuthenticatedUser;
  const updated = await NotificationRepository.updatePreferences(
    user.id,
    request.body,
  );

  return reply.code(200).send({
    campaignNotifications: updated.campaignNotifications,
    missionNotifications: updated.missionNotifications,
    trustNotifications: updated.trustNotifications,
    systemNotifications: updated.systemNotifications,
    pushNotifications: updated.pushNotifications,
  });
}

export async function registerDeviceTokenHandler(
  request: FastifyRequest<{ Body: RegisterDeviceTokenBody }>,
  reply: FastifyReply,
) {
  const user = request.user as AuthenticatedUser;
  await NotificationRepository.registerDeviceToken(
    user.id,
    request.body.token,
    request.body.platform,
  );

  return reply.code(200).send({ success: true });
}
