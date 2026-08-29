import { Type, Static } from "@sinclair/typebox";
import { AppPlatform, AppStatus, SdkIntegrationStatus } from "@calltest/shared-types";

export const CreateAppRequestSchema = Type.Object({
  name: Type.String({ minLength: 2, maxLength: 100 }),
  packageName: Type.String({ minLength: 3, maxLength: 255 }),
  description: Type.Optional(Type.String({ maxLength: 2000 })),
  playStoreUrl: Type.Optional(Type.String({ format: "uri" })),
  googleGroupUrl: Type.Optional(Type.String({ format: "uri" })),
  hasCallTestSdk: Type.Optional(Type.Boolean()),
  sdkIntegrationStatus: Type.Optional(Type.Enum(SdkIntegrationStatus)),
});

export type CreateAppRequest = Static<typeof CreateAppRequestSchema>;

export const UpdateAppRequestSchema = Type.Object({
  name: Type.Optional(Type.String({ minLength: 2, maxLength: 100 })),
  packageName: Type.Optional(Type.String({ minLength: 3, maxLength: 255 })),
  description: Type.Optional(Type.String({ maxLength: 2000 })),
  playStoreUrl: Type.Optional(Type.String({ format: "uri" })),
  googleGroupUrl: Type.Optional(Type.String({ format: "uri" })),
  hasCallTestSdk: Type.Optional(Type.Boolean()),
  sdkIntegrationStatus: Type.Optional(Type.Enum(SdkIntegrationStatus)),
  status: Type.Optional(
    Type.Union([
      Type.Literal(AppStatus.DRAFT),
      Type.Literal(AppStatus.ACTIVE),
      Type.Literal(AppStatus.PAUSED),
      Type.Literal(AppStatus.PUBLIC),
    ]),
  ),
});

export type UpdateAppRequest = Static<typeof UpdateAppRequestSchema>;

export const UpdateAppSdkStatusRequestSchema = Type.Object({
  sdkIntegrationStatus: Type.Enum(SdkIntegrationStatus),
});

export type UpdateAppSdkStatusRequest = Static<typeof UpdateAppSdkStatusRequestSchema>;

export const AppParamsSchema = Type.Object({
  id: Type.String({ format: "uuid" }),
});

export type AppParams = Static<typeof AppParamsSchema>;

export const AppResponseSchema = Type.Object({
  id: Type.String({ format: "uuid" }),
  developerId: Type.String({ format: "uuid" }),
  name: Type.String(),
  packageName: Type.String(),
  platform: Type.Enum(AppPlatform),
  status: Type.Enum(AppStatus),
  hasCallTestSdk: Type.Optional(Type.Boolean()),
  sdkIntegrationStatus: Type.Optional(Type.Enum(SdkIntegrationStatus)),
  description: Type.Union([Type.String(), Type.Null()]),
  playStoreUrl: Type.Union([Type.String(), Type.Null()]),
  googleGroupUrl: Type.Union([Type.String(), Type.Null()]),
  apiKey: Type.String(),
  createdAt: Type.String(),
  updatedAt: Type.String(),
});

export type AppResponse = Static<typeof AppResponseSchema>;

export const AppListResponseSchema = Type.Array(AppResponseSchema);
