import { FastifyRequest, FastifyReply } from "fastify";
import { AuthService } from "./service.js";
import { UserRole } from "@calltest/shared-types";
import { AuthenticatedUser } from "../../core/middlewares/auth-guard.js";
import {
  RegisterRequest,
  LoginRequest,
  RefreshTokenRequest,
  LogoutRequest,
} from "./schemas.js";

export async function registerHandler(
  request: FastifyRequest<{ Body: RegisterRequest }>,
  reply: FastifyReply,
) {
  const user = await AuthService.register(request.body, {
    ipAddress: request.ip,
    userAgent: request.headers["user-agent"],
  });

  const accessToken = request.server.jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role as unknown as UserRole,
    },
    { expiresIn: "15m" },
  );

  const refreshToken = await AuthService.createRefreshToken(user.id);

  return reply.code(201).send({
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role as unknown as UserRole,
      status: user.status,
      trustScore: user.trustScore,
      rank: user.rank,
      xpBalance: user.xpBalance,
      goldBalance: user.goldBalance,
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
    },
  });
}

export async function loginHandler(
  request: FastifyRequest<{ Body: LoginRequest }>,
  reply: FastifyReply,
) {
  const user = await AuthService.login(request.body, {
    ipAddress: request.ip,
    userAgent: request.headers["user-agent"],
  });

  const accessToken = request.server.jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role as unknown as UserRole,
    },
    { expiresIn: "15m" },
  );

  const refreshToken = await AuthService.createRefreshToken(user.id);

  return reply.code(200).send({
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role as unknown as UserRole,
      status: user.status,
      trustScore: user.trustScore,
      rank: user.rank,
      xpBalance: user.xpBalance,
      goldBalance: user.goldBalance,
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
    },
  });
}

export async function refreshTokenHandler(
  request: FastifyRequest<{ Body: RefreshTokenRequest }>,
  reply: FastifyReply,
) {
  const { user, newRefreshToken } = await AuthService.rotateRefreshToken(
    request.body.refreshToken,
    {
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
    },
  );

  const accessToken = request.server.jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role as unknown as UserRole,
    },
    { expiresIn: "15m" },
  );

  return reply.code(200).send({
    accessToken,
    refreshToken: newRefreshToken,
  });
}

export async function logoutHandler(
  request: FastifyRequest<{ Body: LogoutRequest }>,
  reply: FastifyReply,
) {
  const user = request.user as AuthenticatedUser | undefined;
  const userId = user?.id;
  await AuthService.logout(request.body?.refreshToken, userId, {
    ipAddress: request.ip,
    userAgent: request.headers["user-agent"],
  });

  return reply.code(200).send({
    message: "Logged out successfully",
  });
}

export async function getMeHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const userAuth = request.user as AuthenticatedUser;
  const user = await AuthService.getMe(userAuth.id);

  return reply.code(200).send({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role as unknown as UserRole,
    status: user.status,
    trustScore: user.trustScore,
    rank: user.rank,
    xpBalance: user.xpBalance,
    goldBalance: user.goldBalance,
    createdAt: user.createdAt.toISOString(),
    lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
  });
}

export async function deleteAccountHandler(
  request: FastifyRequest<{ Body?: { reason?: string } }>,
  reply: FastifyReply,
) {
  const userAuth = request.user as AuthenticatedUser;
  const result = await AuthService.deleteAccount(userAuth.id, {
    reason: request.body?.reason,
    ipAddress: request.ip,
    userAgent: request.headers["user-agent"],
  });

  return reply.code(200).send(result);
}

