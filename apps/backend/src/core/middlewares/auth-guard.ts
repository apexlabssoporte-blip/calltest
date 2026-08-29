import { FastifyRequest, FastifyReply } from "fastify";
import { UnauthorizedError, ForbiddenError } from "../errors/app-error.js";
import { prisma } from "../database/prisma.js";
import { UserRole, UserStatus } from "@calltest/shared-types";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  displayName: string;
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      sub: string;
      email: string;
      role: UserRole;
    };
    user: AuthenticatedUser;
  }
}

/**
 * Authentication middleware hook that verifies JWT and validates user status.
 * Rejects SUSPENDED, BANNED, or DELETED users on every authenticated request.
 */
export async function authenticate(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  try {
    const decoded = await request.jwtVerify<{
      sub: string;
      email?: string;
      role?: UserRole;
    }>();

    if (!decoded || !decoded.sub) {
      throw new UnauthorizedError("Invalid token payload");
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        displayName: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError("User not found");
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new ForbiddenError("Account is suspended");
    }

    if (user.status === UserStatus.BANNED) {
      throw new ForbiddenError("Account is banned");
    }

    if (user.status === UserStatus.DELETED) {
      throw new UnauthorizedError("Account has been deleted");
    }

    request.user = {
      id: user.id,
      email: user.email,
      role: user.role as UserRole,
      status: user.status as UserStatus,
      displayName: user.displayName,
    };
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
      throw error;
    }
    throw new UnauthorizedError("Authentication required or token expired");
  }
}
