import { Type, Static } from "@sinclair/typebox";
import {
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
  NotificationType,
} from "@calltest/shared-types";

export const GetNotificationsQuerySchema = Type.Object({
  page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 20 })),
  unreadOnly: Type.Optional(Type.Boolean({ default: false })),
});

export type GetNotificationsQuery = Static<typeof GetNotificationsQuerySchema>;

export const NotificationItemResponseSchema = Type.Object({
  id: Type.String({ format: "uuid" }),
  userId: Type.String({ format: "uuid" }),
  type: Type.Enum(NotificationType),
  title: Type.String(),
  body: Type.String(),
  data: Type.Optional(Type.Any()),
  status: Type.Enum(NotificationStatus),
  priority: Type.Enum(NotificationPriority),
  channel: Type.Enum(NotificationChannel),
  readAt: Type.Union([Type.String(), Type.Null()]),
  createdAt: Type.String(),
});

export type NotificationItemResponse = Static<typeof NotificationItemResponseSchema>;

export const PaginatedNotificationsResponseSchema = Type.Object({
  notifications: Type.Array(NotificationItemResponseSchema),
  total: Type.Integer(),
  page: Type.Integer(),
  limit: Type.Integer(),
  totalPages: Type.Integer(),
});

export type PaginatedNotificationsResponse = Static<typeof PaginatedNotificationsResponseSchema>;

export const UnreadCountResponseSchema = Type.Object({
  unreadCount: Type.Integer(),
});

export type UnreadCountResponse = Static<typeof UnreadCountResponseSchema>;

export const MarkNotificationReadParamsSchema = Type.Object({
  id: Type.String({ format: "uuid" }),
});

export type MarkNotificationReadParams = Static<typeof MarkNotificationReadParamsSchema>;

export const MarkNotificationReadResponseSchema = Type.Object({
  id: Type.String({ format: "uuid" }),
  status: Type.Enum(NotificationStatus),
  readAt: Type.String(),
});

export type MarkNotificationReadResponse = Static<typeof MarkNotificationReadResponseSchema>;

export const MarkAllReadResponseSchema = Type.Object({
  count: Type.Integer(),
  markedAt: Type.String(),
});

export type MarkAllReadResponse = Static<typeof MarkAllReadResponseSchema>;

export const NotificationPreferencesResponseSchema = Type.Object({
  campaignNotifications: Type.Boolean(),
  missionNotifications: Type.Boolean(),
  trustNotifications: Type.Boolean(),
  systemNotifications: Type.Boolean(),
  pushNotifications: Type.Boolean(),
});

export type NotificationPreferencesResponse = Static<typeof NotificationPreferencesResponseSchema>;

export const UpdateNotificationPreferencesBodySchema = Type.Object({
  campaignNotifications: Type.Optional(Type.Boolean()),
  missionNotifications: Type.Optional(Type.Boolean()),
  trustNotifications: Type.Optional(Type.Boolean()),
  systemNotifications: Type.Optional(Type.Boolean()),
  pushNotifications: Type.Optional(Type.Boolean()),
});

export type UpdateNotificationPreferencesBody = Static<typeof UpdateNotificationPreferencesBodySchema>;

export const RegisterDeviceTokenBodySchema = Type.Object({
  token: Type.String({ minLength: 10 }),
  platform: Type.Optional(Type.String({ default: "android" })),
});

export type RegisterDeviceTokenBody = Static<typeof RegisterDeviceTokenBodySchema>;
