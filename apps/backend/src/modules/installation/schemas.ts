import { Type, Static } from "@sinclair/typebox";
import {
  InstallationStatus,
  InstallationVerificationMethod,
} from "@calltest/shared-types";

export const ClaimInstallationRequestSchema = Type.Object({
  campaignId: Type.String({ format: "uuid" }),
});

export type ClaimInstallationRequest = Static<typeof ClaimInstallationRequestSchema>;

export const SdkInstallationEventRequestSchema = Type.Object({
  campaignId: Type.String({ format: "uuid" }),
  appId: Type.String({ format: "uuid" }),
  eventType: Type.Union([
    Type.Literal("INSTALL_DETECTED"),
    Type.Literal("FIRST_OPEN"),
  ]),
  installationId: Type.Optional(Type.String({ minLength: 8, maxLength: 64 })),
  idempotencyKey: Type.Optional(Type.String({ minLength: 8, maxLength: 64 })),
});

export type SdkInstallationEventRequest = Static<typeof SdkInstallationEventRequestSchema>;

export const InstallationRecordResponseSchema = Type.Object({
  id: Type.String({ format: "uuid" }),
  campaignId: Type.String({ format: "uuid" }),
  appId: Type.String({ format: "uuid" }),
  testerId: Type.String({ format: "uuid" }),
  installationId: Type.Union([Type.String(), Type.Null()]),
  status: Type.Enum(InstallationStatus),
  verificationMethod: Type.Enum(InstallationVerificationMethod),
  firstDetectedAt: Type.Union([Type.String(), Type.Null()]),
  firstOpenedAt: Type.Union([Type.String(), Type.Null()]),
  lastSeenAt: Type.Union([Type.String(), Type.Null()]),
  claimedAt: Type.Union([Type.String(), Type.Null()]),
  verifiedAt: Type.Union([Type.String(), Type.Null()]),
  createdAt: Type.String(),
  updatedAt: Type.String(),
});

export type InstallationRecordResponse = Static<typeof InstallationRecordResponseSchema>;
