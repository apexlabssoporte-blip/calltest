import { Type, Static } from "@sinclair/typebox";
import dotenv from "dotenv";

dotenv.config();

export const EnvSchema = Type.Object({
  NODE_ENV: Type.String({ default: "development" }),
  PORT: Type.Number({ default: 3000 }),
  HOST: Type.String({ default: "0.0.0.0" }),
  LOG_LEVEL: Type.String({ default: "info" }),
  JWT_SECRET: Type.String({
    default: "calltest_super_secret_jwt_key_development_only_min_32_chars",
  }),
  CORS_ORIGIN: Type.String({ default: "*" }),
  DATABASE_URL: Type.String({
    default:
      "postgresql://calltest_user:calltest_password@localhost:5432/calltest_db?schema=public",
  }),
  REDIS_URL: Type.Optional(Type.String()),
  REDIS_HOST: Type.String({ default: "localhost" }),
  REDIS_PORT: Type.Number({ default: 6379 }),
  REDIS_PASSWORD: Type.Optional(Type.String()),
  EVIDENCE_STORAGE_PROVIDER: Type.String({ default: "local" }),
  S3_BUCKET: Type.Optional(Type.String()),
  S3_REGION: Type.String({ default: "auto" }),
  S3_ENDPOINT: Type.Optional(Type.String()),
  S3_ACCESS_KEY_ID: Type.Optional(Type.String()),
  S3_SECRET_ACCESS_KEY: Type.Optional(Type.String()),

  // Campaign Domain Defaults
  CAMPAIGN_TARGET_TESTERS: Type.Number({ default: 12 }),
  CAMPAIGN_MAX_TESTERS: Type.Number({ default: 15 }),
  CAMPAIGN_DURATION_DAYS: Type.Number({ default: 14 }),

  // Mission Engine Configs
  MISSION_MAX_ESTIMATED_MINUTES: Type.Number({ default: 60 }),
  MISSION_MAX_STEPS: Type.Number({ default: 15 }),

  // Activity Engine Weights & Clock Skew
  ACTIVITY_SESSION_WEIGHT: Type.Number({ default: 0.25 }),
  ACTIVITY_MISSION_WEIGHT: Type.Number({ default: 0.35 }),
  ACTIVITY_FEEDBACK_WEIGHT: Type.Number({ default: 0.20 }),
  ACTIVITY_CONTINUITY_WEIGHT: Type.Number({ default: 0.20 }),
  CLOCK_SKEW_TOLERANCE_MS: Type.Number({ default: 300000 }), // 5 minutes

  // Exposure Capacities
  EXPOSURE_MAX_NEW: Type.Number({ default: 1 }),
  EXPOSURE_MAX_PROBATION: Type.Number({ default: 2 }),
  EXPOSURE_MAX_ESTABLISHED: Type.Number({ default: 3 }),
  EXPOSURE_MAX_HIGH_PERFORMER: Type.Number({ default: 4 }),

  // Matching Weights
  MATCHING_WEIGHT_ACTIVITY: Type.Number({ default: 0.30 }),
  MATCHING_WEIGHT_COMPLETION: Type.Number({ default: 0.25 }),
  MATCHING_WEIGHT_INVERSE_LOAD: Type.Number({ default: 0.15 }),
  MATCHING_WEIGHT_EXPOSURE: Type.Number({ default: 0.15 }),
  MATCHING_WEIGHT_TRUST: Type.Number({ default: 0.15 }),

  // Health Risk Thresholds
  HEALTH_THRESHOLD_HEALTHY_ACTIVITY: Type.Number({ default: 60 }),
  HEALTH_THRESHOLD_AT_RISK_ACTIVE: Type.Number({ default: 10 }),
  HEALTH_THRESHOLD_CRITICAL_ACTIVE: Type.Number({ default: 9 }),

  // Trust & Fraud Configs
  TRUST_INITIAL_SCORE: Type.Number({ default: 50 }),
  TRUST_RANK_TRUSTED_MIN_SCORE: Type.Number({ default: 60 }),
  TRUST_RANK_RELIABLE_MIN_SCORE: Type.Number({ default: 75 }),
  TRUST_RANK_EXCELLENT_MIN_SCORE: Type.Number({ default: 90 }),
  TRUST_RANK_RESTRICTED_MAX_SCORE: Type.Number({ default: 30 }),

  FRAUD_MAX_SCORE: Type.Number({ default: 100 }),
  FRAUD_THRESHOLD_WATCH: Type.Number({ default: 25 }),
  FRAUD_THRESHOLD_RESTRICTED: Type.Number({ default: 50 }),
  FRAUD_THRESHOLD_SUSPENDED: Type.Number({ default: 75 }),
  FRAUD_THRESHOLD_BANNED: Type.Number({ default: 90 }),

  // Reward Engine Configs
  REWARD_XP_MISSION_VALIDATED: Type.Number({ default: 10 }),
  REWARD_GOLD_MISSION_VALIDATED: Type.Number({ default: 2 }),
  REWARD_XP_FEEDBACK_SUBMITTED: Type.Number({ default: 5 }),
  REWARD_GOLD_FEEDBACK_SUBMITTED: Type.Number({ default: 1 }),
  REWARD_XP_PARTICIPATION_COMPLETED: Type.Number({ default: 25 }),
  REWARD_GOLD_PARTICIPATION_COMPLETED: Type.Number({ default: 5 }),
  REWARD_XP_CAMPAIGN_COMPLETED: Type.Number({ default: 25 }),
  REWARD_GOLD_CAMPAIGN_COMPLETED: Type.Number({ default: 5 }),

  // Internal Service Security & HMAC Signing
  INTERNAL_SERVICE_KEY: Type.String({ default: "calltest-internal-secure-service-key-v1" }),
  INTERNAL_SERVICE_SECRET: Type.String({ default: "calltest-internal-secure-service-secret-v1" }),
  INTERNAL_SERVICE_SIGNATURE_WINDOW_SECONDS: Type.Number({ default: 300 }),

  // Phase 12 & 12.1: Gemini AI & Cost Controls Config
  GEMINI_API_KEY: Type.Optional(Type.String()),
  GEMINI_MODEL: Type.String({ default: "gemini-1.5-flash" }),
  REPORT_AI_ENABLED: Type.Boolean({ default: true }),
  REPORT_AI_TIMEOUT_MS: Type.Number({ default: 5000 }),
  REPORT_AI_MIN_CLUSTER_SIZE: Type.Number({ default: 2 }),
  REPORT_AI_MIN_SEVERITY: Type.String({ default: "HIGH" }),
  REPORT_AI_MAX_DAILY_REVIEWS: Type.Number({ default: 100 }),
  REPORT_AI_MAX_MONTHLY_REVIEWS: Type.Number({ default: 2000 }),

  // Phase 12.1 AI Hardening Config
  AI_ENABLED: Type.Boolean({ default: false }),
  AI_DAILY_LIMIT: Type.Number({ default: 100 }),
  AI_MONTHLY_LIMIT: Type.Number({ default: 2000 }),
  AI_MAX_REQUESTS_PER_DEVELOPER_PER_DAY: Type.Number({ default: 20 }),
  AI_CLUSTER_COOLDOWN_HOURS: Type.Number({ default: 24 }),
  AI_MAX_EVIDENCE_ITEMS_PER_REVIEW: Type.Number({ default: 5 }),
  AI_MAX_REPORTS_PER_CLUSTER_FOR_AI: Type.Number({ default: 10 }),

  // Rate Limiting
  RATE_LIMIT_MAX: Type.Number({ default: 100 }),
  RATE_LIMIT_TIME_WINDOW_MS: Type.Number({ default: 60000 }),
});

export type EnvConfig = Static<typeof EnvSchema>;
export type Env = EnvConfig;

export function loadEnv(): EnvConfig {
  const targetTesters = process.env.CAMPAIGN_TARGET_TESTERS
    ? parseInt(process.env.CAMPAIGN_TARGET_TESTERS, 10)
    : 12;
  const maxTesters = process.env.CAMPAIGN_MAX_TESTERS
    ? parseInt(process.env.CAMPAIGN_MAX_TESTERS, 10)
    : 15;
  const durationDays = process.env.CAMPAIGN_DURATION_DAYS
    ? parseInt(process.env.CAMPAIGN_DURATION_DAYS, 10)
    : 14;

  if (targetTesters <= 0) {
    throw new Error(
      `Invalid configuration: CAMPAIGN_TARGET_TESTERS (${targetTesters}) must be greater than 0.`,
    );
  }

  if (maxTesters < targetTesters) {
    throw new Error(
      `Invalid configuration: CAMPAIGN_MAX_TESTERS (${maxTesters}) must be greater than or equal to CAMPAIGN_TARGET_TESTERS (${targetTesters}).`,
    );
  }

  if (durationDays <= 0) {
    throw new Error(
      `Invalid configuration: CAMPAIGN_DURATION_DAYS (${durationDays}) must be greater than 0.`,
    );
  }

  return {
    NODE_ENV: process.env.NODE_ENV || "development",
    PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
    HOST: process.env.HOST || "0.0.0.0",
    LOG_LEVEL: process.env.LOG_LEVEL || "info",
    JWT_SECRET:
      process.env.JWT_SECRET ||
      "calltest_super_secret_jwt_key_development_only_min_32_chars",
    CORS_ORIGIN: process.env.CORS_ORIGIN || "*",
    DATABASE_URL:
      process.env.DATABASE_URL ||
      "postgresql://calltest_user:calltest_password@localhost:5432/calltest_db?schema=public",
    REDIS_URL: process.env.REDIS_URL || undefined,
    REDIS_HOST: process.env.REDIS_HOST || "localhost",
    REDIS_PORT: process.env.REDIS_PORT
      ? parseInt(process.env.REDIS_PORT, 10)
      : 6379,
    REDIS_PASSWORD: process.env.REDIS_PASSWORD || undefined,
    EVIDENCE_STORAGE_PROVIDER: process.env.EVIDENCE_STORAGE_PROVIDER || "local",
    S3_BUCKET: process.env.S3_BUCKET || undefined,
    S3_REGION: process.env.S3_REGION || "auto",
    S3_ENDPOINT: process.env.S3_ENDPOINT || undefined,
    S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID || undefined,
    S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY || undefined,
    CAMPAIGN_TARGET_TESTERS: targetTesters,
    CAMPAIGN_MAX_TESTERS: maxTesters,
    CAMPAIGN_DURATION_DAYS: durationDays,
    MISSION_MAX_ESTIMATED_MINUTES: process.env.MISSION_MAX_ESTIMATED_MINUTES
      ? parseInt(process.env.MISSION_MAX_ESTIMATED_MINUTES, 10)
      : 60,
    MISSION_MAX_STEPS: process.env.MISSION_MAX_STEPS
      ? parseInt(process.env.MISSION_MAX_STEPS, 10)
      : 15,
    ACTIVITY_SESSION_WEIGHT: process.env.ACTIVITY_SESSION_WEIGHT
      ? parseFloat(process.env.ACTIVITY_SESSION_WEIGHT)
      : 0.25,
    ACTIVITY_MISSION_WEIGHT: process.env.ACTIVITY_MISSION_WEIGHT
      ? parseFloat(process.env.ACTIVITY_MISSION_WEIGHT)
      : 0.35,
    ACTIVITY_FEEDBACK_WEIGHT: process.env.ACTIVITY_FEEDBACK_WEIGHT
      ? parseFloat(process.env.ACTIVITY_FEEDBACK_WEIGHT)
      : 0.20,
    ACTIVITY_CONTINUITY_WEIGHT: process.env.ACTIVITY_CONTINUITY_WEIGHT
      ? parseFloat(process.env.ACTIVITY_CONTINUITY_WEIGHT)
      : 0.20,
    CLOCK_SKEW_TOLERANCE_MS: process.env.CLOCK_SKEW_TOLERANCE_MS
      ? parseInt(process.env.CLOCK_SKEW_TOLERANCE_MS, 10)
      : 300000,
    EXPOSURE_MAX_NEW: process.env.EXPOSURE_MAX_NEW
      ? parseInt(process.env.EXPOSURE_MAX_NEW, 10)
      : 1,
    EXPOSURE_MAX_PROBATION: process.env.EXPOSURE_MAX_PROBATION
      ? parseInt(process.env.EXPOSURE_MAX_PROBATION, 10)
      : 2,
    EXPOSURE_MAX_ESTABLISHED: process.env.EXPOSURE_MAX_ESTABLISHED
      ? parseInt(process.env.EXPOSURE_MAX_ESTABLISHED, 10)
      : 3,
    EXPOSURE_MAX_HIGH_PERFORMER: process.env.EXPOSURE_MAX_HIGH_PERFORMER
      ? parseInt(process.env.EXPOSURE_MAX_HIGH_PERFORMER, 10)
      : 4,
    MATCHING_WEIGHT_ACTIVITY: process.env.MATCHING_WEIGHT_ACTIVITY
      ? parseFloat(process.env.MATCHING_WEIGHT_ACTIVITY)
      : 0.30,
    MATCHING_WEIGHT_COMPLETION: process.env.MATCHING_WEIGHT_COMPLETION
      ? parseFloat(process.env.MATCHING_WEIGHT_COMPLETION)
      : 0.25,
    MATCHING_WEIGHT_INVERSE_LOAD: process.env.MATCHING_WEIGHT_INVERSE_LOAD
      ? parseFloat(process.env.MATCHING_WEIGHT_INVERSE_LOAD)
      : 0.15,
    MATCHING_WEIGHT_EXPOSURE: process.env.MATCHING_WEIGHT_EXPOSURE
      ? parseFloat(process.env.MATCHING_WEIGHT_EXPOSURE)
      : 0.15,
    MATCHING_WEIGHT_TRUST: process.env.MATCHING_WEIGHT_TRUST
      ? parseFloat(process.env.MATCHING_WEIGHT_TRUST)
      : 0.15,
    HEALTH_THRESHOLD_HEALTHY_ACTIVITY: process.env.HEALTH_THRESHOLD_HEALTHY_ACTIVITY
      ? parseFloat(process.env.HEALTH_THRESHOLD_HEALTHY_ACTIVITY)
      : 60,
    HEALTH_THRESHOLD_AT_RISK_ACTIVE: process.env.HEALTH_THRESHOLD_AT_RISK_ACTIVE
      ? parseInt(process.env.HEALTH_THRESHOLD_AT_RISK_ACTIVE, 10)
      : 10,
    HEALTH_THRESHOLD_CRITICAL_ACTIVE: process.env.HEALTH_THRESHOLD_CRITICAL_ACTIVE
      ? parseInt(process.env.HEALTH_THRESHOLD_CRITICAL_ACTIVE, 10)
      : 9,
    TRUST_INITIAL_SCORE: process.env.TRUST_INITIAL_SCORE
      ? parseInt(process.env.TRUST_INITIAL_SCORE, 10)
      : 50,
    TRUST_RANK_TRUSTED_MIN_SCORE: process.env.TRUST_RANK_TRUSTED_MIN_SCORE
      ? parseInt(process.env.TRUST_RANK_TRUSTED_MIN_SCORE, 10)
      : 60,
    TRUST_RANK_RELIABLE_MIN_SCORE: process.env.TRUST_RANK_RELIABLE_MIN_SCORE
      ? parseInt(process.env.TRUST_RANK_RELIABLE_MIN_SCORE, 10)
      : 75,
    TRUST_RANK_EXCELLENT_MIN_SCORE: process.env.TRUST_RANK_EXCELLENT_MIN_SCORE
      ? parseInt(process.env.TRUST_RANK_EXCELLENT_MIN_SCORE, 10)
      : 90,
    TRUST_RANK_RESTRICTED_MAX_SCORE: process.env.TRUST_RANK_RESTRICTED_MAX_SCORE
      ? parseInt(process.env.TRUST_RANK_RESTRICTED_MAX_SCORE, 10)
      : 30,
    FRAUD_MAX_SCORE: process.env.FRAUD_MAX_SCORE
      ? parseInt(process.env.FRAUD_MAX_SCORE, 10)
      : 100,
    FRAUD_THRESHOLD_WATCH: process.env.FRAUD_THRESHOLD_WATCH
      ? parseInt(process.env.FRAUD_THRESHOLD_WATCH, 10)
      : 25,
    FRAUD_THRESHOLD_RESTRICTED: process.env.FRAUD_THRESHOLD_RESTRICTED
      ? parseInt(process.env.FRAUD_THRESHOLD_RESTRICTED, 10)
      : 50,
    FRAUD_THRESHOLD_SUSPENDED: process.env.FRAUD_THRESHOLD_SUSPENDED
      ? parseInt(process.env.FRAUD_THRESHOLD_SUSPENDED, 10)
      : 75,
    FRAUD_THRESHOLD_BANNED: process.env.FRAUD_THRESHOLD_BANNED
      ? parseInt(process.env.FRAUD_THRESHOLD_BANNED, 10)
      : 90,
    REWARD_XP_MISSION_VALIDATED: process.env.REWARD_XP_MISSION_VALIDATED
      ? parseInt(process.env.REWARD_XP_MISSION_VALIDATED, 10)
      : 10,
    REWARD_GOLD_MISSION_VALIDATED: process.env.REWARD_GOLD_MISSION_VALIDATED
      ? parseInt(process.env.REWARD_GOLD_MISSION_VALIDATED, 10)
      : 2,
    REWARD_XP_FEEDBACK_SUBMITTED: process.env.REWARD_XP_FEEDBACK_SUBMITTED
      ? parseInt(process.env.REWARD_XP_FEEDBACK_SUBMITTED, 10)
      : 5,
    REWARD_GOLD_FEEDBACK_SUBMITTED: process.env.REWARD_GOLD_FEEDBACK_SUBMITTED
      ? parseInt(process.env.REWARD_GOLD_FEEDBACK_SUBMITTED, 10)
      : 1,
    REWARD_XP_PARTICIPATION_COMPLETED: process.env.REWARD_XP_PARTICIPATION_COMPLETED
      ? parseInt(process.env.REWARD_XP_PARTICIPATION_COMPLETED, 10)
      : 25,
    REWARD_GOLD_PARTICIPATION_COMPLETED: process.env.REWARD_GOLD_PARTICIPATION_COMPLETED
      ? parseInt(process.env.REWARD_GOLD_PARTICIPATION_COMPLETED, 10)
      : 5,
    REWARD_XP_CAMPAIGN_COMPLETED: process.env.REWARD_XP_CAMPAIGN_COMPLETED
      ? parseInt(process.env.REWARD_XP_CAMPAIGN_COMPLETED, 10)
      : 25,
    REWARD_GOLD_CAMPAIGN_COMPLETED: process.env.REWARD_GOLD_CAMPAIGN_COMPLETED
      ? parseInt(process.env.REWARD_GOLD_CAMPAIGN_COMPLETED, 10)
      : 5,
    INTERNAL_SERVICE_KEY: process.env.INTERNAL_SERVICE_KEY || "calltest-internal-secure-service-key-v1",
    INTERNAL_SERVICE_SECRET: process.env.INTERNAL_SERVICE_SECRET || "calltest-internal-secure-service-secret-v1",
    INTERNAL_SERVICE_SIGNATURE_WINDOW_SECONDS: process.env.INTERNAL_SERVICE_SIGNATURE_WINDOW_SECONDS
      ? parseInt(process.env.INTERNAL_SERVICE_SIGNATURE_WINDOW_SECONDS, 10)
      : 300,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || undefined,
    GEMINI_MODEL: process.env.GEMINI_MODEL || "gemini-1.5-flash",
    REPORT_AI_ENABLED: process.env.REPORT_AI_ENABLED !== undefined ? process.env.REPORT_AI_ENABLED === "true" : true,
    REPORT_AI_TIMEOUT_MS: process.env.REPORT_AI_TIMEOUT_MS ? parseInt(process.env.REPORT_AI_TIMEOUT_MS, 10) : 5000,
    REPORT_AI_MIN_CLUSTER_SIZE: process.env.REPORT_AI_MIN_CLUSTER_SIZE ? parseInt(process.env.REPORT_AI_MIN_CLUSTER_SIZE, 10) : 2,
    REPORT_AI_MIN_SEVERITY: process.env.REPORT_AI_MIN_SEVERITY || "HIGH",
    REPORT_AI_MAX_DAILY_REVIEWS: process.env.REPORT_AI_MAX_DAILY_REVIEWS ? parseInt(process.env.REPORT_AI_MAX_DAILY_REVIEWS, 10) : 100,
    REPORT_AI_MAX_MONTHLY_REVIEWS: process.env.REPORT_AI_MAX_MONTHLY_REVIEWS ? parseInt(process.env.REPORT_AI_MAX_MONTHLY_REVIEWS, 10) : 2000,
    AI_ENABLED: process.env.AI_ENABLED !== undefined ? process.env.AI_ENABLED === "true" : (process.env.REPORT_AI_ENABLED !== undefined ? process.env.REPORT_AI_ENABLED === "true" : false),
    AI_DAILY_LIMIT: process.env.AI_DAILY_LIMIT ? parseInt(process.env.AI_DAILY_LIMIT, 10) : (process.env.REPORT_AI_MAX_DAILY_REVIEWS ? parseInt(process.env.REPORT_AI_MAX_DAILY_REVIEWS, 10) : 100),
    AI_MONTHLY_LIMIT: process.env.AI_MONTHLY_LIMIT ? parseInt(process.env.AI_MONTHLY_LIMIT, 10) : (process.env.REPORT_AI_MAX_MONTHLY_REVIEWS ? parseInt(process.env.REPORT_AI_MAX_MONTHLY_REVIEWS, 10) : 2000),
    AI_MAX_REQUESTS_PER_DEVELOPER_PER_DAY: process.env.AI_MAX_REQUESTS_PER_DEVELOPER_PER_DAY ? parseInt(process.env.AI_MAX_REQUESTS_PER_DEVELOPER_PER_DAY, 10) : 20,
    AI_CLUSTER_COOLDOWN_HOURS: process.env.AI_CLUSTER_COOLDOWN_HOURS ? parseInt(process.env.AI_CLUSTER_COOLDOWN_HOURS, 10) : 24,
    AI_MAX_EVIDENCE_ITEMS_PER_REVIEW: process.env.AI_MAX_EVIDENCE_ITEMS_PER_REVIEW ? parseInt(process.env.AI_MAX_EVIDENCE_ITEMS_PER_REVIEW, 10) : 5,
    AI_MAX_REPORTS_PER_CLUSTER_FOR_AI: process.env.AI_MAX_REPORTS_PER_CLUSTER_FOR_AI ? parseInt(process.env.AI_MAX_REPORTS_PER_CLUSTER_FOR_AI, 10) : 10,
    RATE_LIMIT_MAX: process.env.RATE_LIMIT_MAX
      ? parseInt(process.env.RATE_LIMIT_MAX, 10)
      : 100,
    RATE_LIMIT_TIME_WINDOW_MS: process.env.RATE_LIMIT_TIME_WINDOW_MS
      ? parseInt(process.env.RATE_LIMIT_TIME_WINDOW_MS, 10)
      : 60000,
  };
}

export function validateProductionEnv(e: Env): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (e.NODE_ENV === "production") {
    if (!e.DATABASE_URL || e.DATABASE_URL.includes("localhost:5432/calltest_db")) {
      errors.push("DATABASE_URL must be configured with a valid production connection string");
    }

    if (!e.JWT_SECRET || e.JWT_SECRET.includes("development_only") || e.JWT_SECRET.length < 32) {
      errors.push("JWT_SECRET must be at least 32 characters long and not use the development placeholder");
    }

    if (
      !e.INTERNAL_SERVICE_KEY ||
      e.INTERNAL_SERVICE_KEY.includes("calltest-internal-secure-service-key-v1")
    ) {
      errors.push("INTERNAL_SERVICE_KEY must be configured securely for production");
    }

    if (
      !e.INTERNAL_SERVICE_SECRET ||
      e.INTERNAL_SERVICE_SECRET.includes("calltest-internal-secure-service-secret-v1")
    ) {
      errors.push("INTERNAL_SERVICE_SECRET must be configured securely for production");
    }

    if (e.CORS_ORIGIN === "*") {
      errors.push("CORS_ORIGIN must not be wildcard '*' in production");
    }

    if (e.EVIDENCE_STORAGE_PROVIDER !== "s3") {
      errors.push("EVIDENCE_STORAGE_PROVIDER must be 's3' in production");
    } else if (
      !e.S3_BUCKET ||
      !e.S3_ACCESS_KEY_ID ||
      !e.S3_SECRET_ACCESS_KEY
    ) {
      errors.push("S3_BUCKET and S3 credentials are required in production");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export const env = loadEnv();
