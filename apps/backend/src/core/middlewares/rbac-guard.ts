import { FastifyRequest, FastifyReply } from "fastify";
import { ForbiddenError, NotFoundError, UnauthorizedError } from "../errors/app-error.js";
import { UserRole } from "@calltest/shared-types";
import { prisma } from "../database/prisma.js";
import { AuthenticatedUser } from "./auth-guard.js";

/**
 * Checks if a user's role satisfies the target required role.
 * - BOTH satisfies both DEVELOPER and TESTER.
 * - ADMIN satisfies all roles.
 */
export function hasRolePermission(userRole: UserRole, targetRole: UserRole): boolean {
  if (userRole === UserRole.ADMIN) {
    return true;
  }

  if (targetRole === UserRole.DEVELOPER) {
    return userRole === UserRole.DEVELOPER || userRole === UserRole.BOTH;
  }

  if (targetRole === UserRole.TESTER) {
    return userRole === UserRole.TESTER || userRole === UserRole.BOTH;
  }

  if (targetRole === UserRole.BOTH) {
    return userRole === UserRole.BOTH;
  }

  if ((targetRole as string) === UserRole.ADMIN) {
    return (userRole as string) === UserRole.ADMIN;
  }

  return false;
}

/**
 * Fastify preHandler middleware factory to enforce role-based access control.
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const user = request.user as AuthenticatedUser | undefined;
    if (!user) {
      throw new UnauthorizedError("Authentication required");
    }

    const userRole = user.role;

    // Check if the user meets any of the allowed role specifications
    const isAllowed = allowedRoles.some((targetRole) => hasRolePermission(userRole, targetRole));

    if (!isAllowed) {
      throw new ForbiddenError(
        `Access denied. Requires one of roles: [${allowedRoles.join(", ")}]. Current role: ${userRole}`,
      );
    }
  };
}

/**
 * App ownership guard - prevents IDOR attacks.
 * Verifies that the app belongs to the requesting developer (or user is ADMIN).
 */
export async function verifyAppOwnership(
  appId: string,
  userId: string,
  userRole: UserRole,
) {
  const app = await prisma.app.findUnique({
    where: { id: appId },
  });

  if (!app) {
    throw new NotFoundError("App not found");
  }

  if (userRole !== UserRole.ADMIN && app.developerId !== userId) {
    throw new ForbiddenError("You do not have permission to access or modify this app");
  }

  return app;
}

/**
 * Campaign ownership guard - prevents IDOR attacks.
 * Verifies that the campaign belongs to an app owned by the requesting developer (or user is ADMIN).
 */
export async function verifyCampaignOwnership(
  campaignId: string,
  userId: string,
  userRole: UserRole,
) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      app: true,
    },
  });

  if (!campaign) {
    throw new NotFoundError("Campaign not found");
  }

  if (userRole !== UserRole.ADMIN && campaign.app.developerId !== userId) {
    throw new ForbiddenError("You do not have permission to access or modify this campaign");
  }

  return campaign;
}
