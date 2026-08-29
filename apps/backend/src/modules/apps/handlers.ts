import { FastifyRequest, FastifyReply } from "fastify";
import { AppService } from "./service.js";
import { AuthenticatedUser } from "../../core/middlewares/auth-guard.js";
import {
  CreateAppRequest,
  UpdateAppRequest,
  UpdateAppSdkStatusRequest,
  AppParams,
} from "./schemas.js";

export async function createAppHandler(
  request: FastifyRequest<{ Body: CreateAppRequest }>,
  reply: FastifyReply,
) {
  const user = request.user as AuthenticatedUser;
  const app = await AppService.createApp(user.id, request.body, {
    ipAddress: request.ip,
    userAgent: request.headers["user-agent"],
  });

  return reply.code(201).send({
    id: app.id,
    developerId: app.developerId,
    name: app.name,
    packageName: app.packageName,
    platform: app.platform,
    status: app.status,
    hasCallTestSdk: app.hasCallTestSdk,
    sdkIntegrationStatus: app.sdkIntegrationStatus,
    description: app.description,
    playStoreUrl: app.playStoreUrl,
    googleGroupUrl: app.googleGroupUrl,
    apiKey: app.apiKey,
    createdAt: app.createdAt.toISOString(),
    updatedAt: app.updatedAt.toISOString(),
  });
}

export async function listAppsHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const user = request.user as AuthenticatedUser;
  const apps = await AppService.listApps(user.id, user.role);

  return reply.code(200).send(
    apps.map((app) => ({
      id: app.id,
      developerId: app.developerId,
      name: app.name,
      packageName: app.packageName,
      platform: app.platform,
      status: app.status,
      hasCallTestSdk: app.hasCallTestSdk,
      sdkIntegrationStatus: app.sdkIntegrationStatus,
      description: app.description,
      playStoreUrl: app.playStoreUrl,
      googleGroupUrl: app.googleGroupUrl,
      apiKey: app.apiKey,
      createdAt: app.createdAt.toISOString(),
      updatedAt: app.updatedAt.toISOString(),
    })),
  );
}

export async function getAppByIdHandler(
  request: FastifyRequest<{ Params: AppParams }>,
  reply: FastifyReply,
) {
  const user = request.user as AuthenticatedUser;
  const app = await AppService.getAppById(request.params.id, user.id, user.role);

  return reply.code(200).send({
    id: app.id,
    developerId: app.developerId,
    name: app.name,
    packageName: app.packageName,
    platform: app.platform,
    status: app.status,
    hasCallTestSdk: app.hasCallTestSdk,
    sdkIntegrationStatus: app.sdkIntegrationStatus,
    description: app.description,
    playStoreUrl: app.playStoreUrl,
    googleGroupUrl: app.googleGroupUrl,
    apiKey: app.apiKey,
    createdAt: app.createdAt.toISOString(),
    updatedAt: app.updatedAt.toISOString(),
  });
}

export async function updateAppHandler(
  request: FastifyRequest<{ Params: AppParams; Body: UpdateAppRequest }>,
  reply: FastifyReply,
) {
  const user = request.user as AuthenticatedUser;
  const app = await AppService.updateApp(
    request.params.id,
    user.id,
    user.role,
    request.body,
    {
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
    },
  );

  return reply.code(200).send({
    id: app.id,
    developerId: app.developerId,
    name: app.name,
    packageName: app.packageName,
    platform: app.platform,
    status: app.status,
    hasCallTestSdk: app.hasCallTestSdk,
    sdkIntegrationStatus: app.sdkIntegrationStatus,
    description: app.description,
    playStoreUrl: app.playStoreUrl,
    googleGroupUrl: app.googleGroupUrl,
    apiKey: app.apiKey,
    createdAt: app.createdAt.toISOString(),
    updatedAt: app.updatedAt.toISOString(),
  });
}

export async function updateAppSdkStatusHandler(
  request: FastifyRequest<{ Params: AppParams; Body: UpdateAppSdkStatusRequest }>,
  reply: FastifyReply,
) {
  const user = request.user as AuthenticatedUser;
  const app = await AppService.updateSdkStatus(
    request.params.id,
    user.id,
    user.role,
    request.body.sdkIntegrationStatus,
    {
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
    },
  );

  return reply.code(200).send({
    id: app.id,
    developerId: app.developerId,
    name: app.name,
    packageName: app.packageName,
    platform: app.platform,
    status: app.status,
    hasCallTestSdk: app.hasCallTestSdk,
    sdkIntegrationStatus: app.sdkIntegrationStatus,
    description: app.description,
    playStoreUrl: app.playStoreUrl,
    googleGroupUrl: app.googleGroupUrl,
    apiKey: app.apiKey,
    createdAt: app.createdAt.toISOString(),
    updatedAt: app.updatedAt.toISOString(),
  });
}

export async function deleteAppHandler(
  request: FastifyRequest<{ Params: AppParams }>,
  reply: FastifyReply,
) {
  const user = request.user as AuthenticatedUser;
  const result = await AppService.deleteApp(request.params.id, user.id, user.role, {
    ipAddress: request.ip,
    userAgent: request.headers["user-agent"],
  });

  return reply.code(200).send({
    message: result.message,
  });
}
