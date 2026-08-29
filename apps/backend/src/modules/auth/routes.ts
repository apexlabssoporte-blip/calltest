import { FastifyInstance } from "fastify";
import {
  RegisterRequestSchema,
  LoginRequestSchema,
  RefreshTokenRequestSchema,
  LogoutRequestSchema,
  AuthResponseSchema,
  RefreshResponseSchema,
  UserPublicSchema,
  MessageResponseSchema,
} from "./schemas.js";
import {
  registerHandler,
  loginHandler,
  refreshTokenHandler,
  logoutHandler,
  getMeHandler,
  deleteAccountHandler,
} from "./handlers.js";
import { authenticate } from "../../core/middlewares/auth-guard.js";

export async function authRoutes(app: FastifyInstance) {
  // POST /auth/register
  app.post(
    "/auth/register",
    {
      config: {
        rateLimit: {
          max: 15,
          timeWindow: "1 minute",
        },
      },
      schema: {
        tags: ["Auth"],
        summary: "Register a new user account (TESTER, DEVELOPER, or BOTH)",
        body: RegisterRequestSchema,
        response: {
          201: AuthResponseSchema,
        },
      },
    },
    registerHandler,
  );

  // POST /auth/login
  app.post(
    "/auth/login",
    {
      config: {
        rateLimit: {
          max: 15,
          timeWindow: "1 minute",
        },
      },
      schema: {
        tags: ["Auth"],
        summary: "Authenticate user and issue JWT access and refresh tokens",
        body: LoginRequestSchema,
        response: {
          200: AuthResponseSchema,
        },
      },
    },
    loginHandler,
  );

  // POST /auth/refresh
  app.post(
    "/auth/refresh",
    {
      config: {
        rateLimit: {
          max: 30,
          timeWindow: "1 minute",
        },
      },
      schema: {
        tags: ["Auth"],
        summary: "Rotate refresh token and issue a new access token",
        body: RefreshTokenRequestSchema,
        response: {
          200: RefreshResponseSchema,
        },
      },
    },
    refreshTokenHandler,
  );

  // POST /auth/logout
  app.post(
    "/auth/logout",
    {
      schema: {
        tags: ["Auth"],
        summary: "Revoke refresh token and log out",
        body: LogoutRequestSchema,
        response: {
          200: MessageResponseSchema,
        },
      },
    },
    logoutHandler,
  );

  // GET /me
  app.get(
    "/me",
    {
      preHandler: [authenticate],
      schema: {
        tags: ["Auth"],
        summary: "Get current authenticated user profile",
        security: [{ bearerAuth: [] }],
        response: {
          200: UserPublicSchema,
        },
      },
    },
    getMeHandler,
  );

  // DELETE /me/account
  app.delete(
    "/me/account",
    {
      preHandler: [authenticate],
      schema: {
        tags: ["Auth"],
        summary: "Delete user account and anonymize PII for privacy compliance",
        security: [{ bearerAuth: [] }],
        response: {
          200: MessageResponseSchema,
        },
      },
    },
    deleteAccountHandler as any,
  );
}
