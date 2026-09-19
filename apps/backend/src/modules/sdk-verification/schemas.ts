import { Static, Type } from "@sinclair/typebox";

export const SdkHandshakeRequestSchema = Type.Object({
  apiKey: Type.String({ minLength: 20, maxLength: 128 }),
  packageName: Type.String({ minLength: 3, maxLength: 255 }),
  sdkVersion: Type.String({ minLength: 1, maxLength: 30 }),
});

export type SdkHandshakeRequest = Static<typeof SdkHandshakeRequestSchema>;

export const SdkHandshakeResponseSchema = Type.Object({
  status: Type.Literal("CONNECTED"),
  appId: Type.String({ format: "uuid" }),
  packageName: Type.String(),
  sdkVersion: Type.String(),
});
