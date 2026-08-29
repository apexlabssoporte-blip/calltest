import { FastifyInstance } from "fastify";
import {
  GetNotificationsQuerySchema,
  PaginatedNotificationsResponseSchema,
  UnreadCountResponseSchema,
  MarkNotificationReadParamsSchema,
  MarkNotificationReadResponseSchema,
  MarkAllReadResponseSchema,
  NotificationPreferencesResponseSchema,
  UpdateNotificationPreferencesBodySchema,
  RegisterDeviceTokenBodySchema,
} from "./schemas.js";
import {
  getNotificationsHandler,
  getUnreadCountHandler,
  markNotificationReadHandler,
  markAllNotificationsReadHandler,
  getNotificationPreferencesHandler,
  updateNotificationPreferencesHandler,
  registerDeviceTokenHandler,
} from "./handlers.js";
import { authenticate } from "../../core/middlewares/auth-guard.js";

export async function notificationRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  // GET /notifications
  app.get(
    "/notifications",
    {
      schema: {
        tags: ["Notifications"],
        summary: "Get paginated user notifications with bounded limits",
        security: [{ bearerAuth: [] }],
        querystring: GetNotificationsQuerySchema,
        response: {
          200: PaginatedNotificationsResponseSchema,
        },
      },
    },
    getNotificationsHandler as any,
  );

  // GET /notifications/unread-count
  app.get(
    "/notifications/unread-count",
    {
      schema: {
        tags: ["Notifications"],
        summary: "Get total unread notifications count",
        security: [{ bearerAuth: [] }],
        response: {
          200: UnreadCountResponseSchema,
        },
      },
    },
    getUnreadCountHandler as any,
  );

  // POST /notifications/:id/read
  app.post(
    "/notifications/:id/read",
    {
      schema: {
        tags: ["Notifications"],
        summary: "Mark a single notification as read (IDOR protected)",
        security: [{ bearerAuth: [] }],
        params: MarkNotificationReadParamsSchema,
        response: {
          200: MarkNotificationReadResponseSchema,
        },
      },
    },
    markNotificationReadHandler as any,
  );

  // POST /notifications/read-all
  app.post(
    "/notifications/read-all",
    {
      schema: {
        tags: ["Notifications"],
        summary: "Mark all unread notifications as read",
        security: [{ bearerAuth: [] }],
        response: {
          200: MarkAllReadResponseSchema,
        },
      },
    },
    markAllNotificationsReadHandler as any,
  );

  // GET /notifications/preferences
  app.get(
    "/notifications/preferences",
    {
      schema: {
        tags: ["Notifications"],
        summary: "Get user notification preferences",
        security: [{ bearerAuth: [] }],
        response: {
          200: NotificationPreferencesResponseSchema,
        },
      },
    },
    getNotificationPreferencesHandler as any,
  );

  // PATCH /notifications/preferences
  app.patch(
    "/notifications/preferences",
    {
      schema: {
        tags: ["Notifications"],
        summary: "Update user notification preferences",
        security: [{ bearerAuth: [] }],
        body: UpdateNotificationPreferencesBodySchema,
        response: {
          200: NotificationPreferencesResponseSchema,
        },
      },
    },
    updateNotificationPreferencesHandler as any,
  );

  // POST /notifications/device-token
  app.post(
    "/notifications/device-token",
    {
      schema: {
        tags: ["Notifications"],
        summary: "Register client device push token securely",
        security: [{ bearerAuth: [] }],
        body: RegisterDeviceTokenBodySchema,
      },
    },
    registerDeviceTokenHandler as any,
  );
}
