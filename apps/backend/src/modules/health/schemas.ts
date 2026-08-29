import { Type, Static } from "@sinclair/typebox";

export const HealthLiveResponseSchema = Type.Object({
  status: Type.String({ example: "ok" }),
  timestamp: Type.String({ format: "date-time" }),
});

export type HealthLiveResponse = Static<typeof HealthLiveResponseSchema>;

export const HealthReadyResponseSchema = Type.Object({
  status: Type.Union([Type.Literal("ok"), Type.Literal("error")]),
  timestamp: Type.String({ format: "date-time" }),
  services: Type.Object({
    database: Type.Union([Type.Literal("ok"), Type.Literal("error")]),
    redis: Type.Union([Type.Literal("ok"), Type.Literal("error")]),
  }),
});

export type HealthReadyResponse = Static<typeof HealthReadyResponseSchema>;

export const HealthStartupResponseSchema = Type.Object({
  status: Type.Union([Type.Literal("ok"), Type.Literal("initializing"), Type.Literal("error")]),
  timestamp: Type.String({ format: "date-time" }),
  uptimeSeconds: Type.Number(),
});

export type HealthStartupResponse = Static<typeof HealthStartupResponseSchema>;

