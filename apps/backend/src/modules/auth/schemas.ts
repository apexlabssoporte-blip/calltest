import { Type, Static } from "@sinclair/typebox";
import { UserRole, UserStatus, TrustRank } from "@calltest/shared-types";

export const RegisterRequestSchema = Type.Object({
  email: Type.String({ format: "email" }),
  password: Type.String({ minLength: 8, maxLength: 100 }),
  displayName: Type.String({ minLength: 2, maxLength: 50 }),
  role: Type.Union([
    Type.Literal(UserRole.TESTER),
    Type.Literal(UserRole.DEVELOPER),
    Type.Literal(UserRole.BOTH),
  ]),
});

export type RegisterRequest = Static<typeof RegisterRequestSchema>;

export const LoginRequestSchema = Type.Object({
  email: Type.String({ format: "email" }),
  password: Type.String({ minLength: 1 }),
});

export type LoginRequest = Static<typeof LoginRequestSchema>;

export const RefreshTokenRequestSchema = Type.Object({
  refreshToken: Type.String({ minLength: 10 }),
});

export type RefreshTokenRequest = Static<typeof RefreshTokenRequestSchema>;

export const LogoutRequestSchema = Type.Object({
  refreshToken: Type.Optional(Type.String()),
});

export type LogoutRequest = Static<typeof LogoutRequestSchema>;

export const UserPublicSchema = Type.Object({
  id: Type.String({ format: "uuid" }),
  email: Type.String({ format: "email" }),
  displayName: Type.String(),
  role: Type.Enum(UserRole),
  status: Type.Enum(UserStatus),
  trustScore: Type.Number(),
  rank: Type.Enum(TrustRank),
  xpBalance: Type.Number(),
  goldBalance: Type.Number(),
  createdAt: Type.String(),
  lastLoginAt: Type.Union([Type.String(), Type.Null()]),
});

export type UserPublic = Static<typeof UserPublicSchema>;

export const AuthResponseSchema = Type.Object({
  accessToken: Type.String(),
  refreshToken: Type.String(),
  user: UserPublicSchema,
});

export type AuthResponse = Static<typeof AuthResponseSchema>;

export const RefreshResponseSchema = Type.Object({
  accessToken: Type.String(),
  refreshToken: Type.String(),
});

export type RefreshResponse = Static<typeof RefreshResponseSchema>;

export const MessageResponseSchema = Type.Object({
  message: Type.String(),
});
