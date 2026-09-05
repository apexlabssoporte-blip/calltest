-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('DEVELOPER', 'TESTER', 'BOTH', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'BANNED', 'DELETED');

-- CreateEnum
CREATE TYPE "AppPlatform" AS ENUM ('ANDROID');

-- CreateEnum
CREATE TYPE "AppStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'PUBLIC', 'ARCHIVED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'READY', 'ACTIVE', 'TESTING', 'COMPLETED', 'PUBLIC', 'PAUSED', 'CANCELLED', 'SUSPENDED', 'ENDED_EARLY', 'AT_RISK');

-- CreateEnum
CREATE TYPE "CampaignRisk" AS ENUM ('HEALTHY', 'WARNING', 'AT_RISK', 'CRITICAL');

-- CreateEnum
CREATE TYPE "TesterAssignmentType" AS ENUM ('PRIMARY', 'PROTECTION', 'REPLACEMENT', 'CORE_TESTER', 'RELIABLE_REINFORCEMENT', 'BACKUP');

-- CreateEnum
CREATE TYPE "TesterStatus" AS ENUM ('INVITED', 'ACTIVE', 'LOW_ACTIVITY', 'ABANDONED', 'COMPLETED', 'REMOVED');

-- CreateEnum
CREATE TYPE "TesterExposureLevel" AS ENUM ('NEW', 'PROBATION', 'ESTABLISHED', 'HIGH_PERFORMER');

-- CreateEnum
CREATE TYPE "MissionDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "MissionStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('AVAILABLE', 'STARTED', 'SUBMITTED', 'VALIDATED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ValidationMethod" AS ENUM ('MANUAL', 'EVENT', 'CHECKLIST', 'SDK_EVENT', 'SCREEN_FLOW', 'HYBRID');

-- CreateEnum
CREATE TYPE "MissionQualityRating" AS ENUM ('TOO_COMPLEX', 'CONFUSING', 'BROKEN', 'TOO_LONG', 'UNCLEAR', 'GOOD');

-- CreateEnum
CREATE TYPE "ActivityEventType" AS ENUM ('APP_OPENED', 'APP_CLOSED', 'SESSION_STARTED', 'SESSION_ENDED', 'SCREEN_VIEW', 'USER_INTERACTION', 'MISSION_STARTED', 'MISSION_SUBMITTED', 'MISSION_COMPLETED', 'FEEDBACK_SUBMITTED', 'BUG_REPORTED');

-- CreateEnum
CREATE TYPE "ActivityState" AS ENUM ('ACTIVE', 'LOW_ACTIVITY', 'ABANDONED');

-- CreateEnum
CREATE TYPE "TrustRank" AS ENUM ('NEW', 'TRUSTED', 'RELIABLE', 'EXCELLENT', 'RESTRICTED');

-- CreateEnum
CREATE TYPE "FraudSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ReputationStatus" AS ENUM ('NORMAL', 'WATCH', 'RESTRICTED', 'SUSPENDED', 'BANNED');

-- CreateEnum
CREATE TYPE "FraudEventType" AS ENUM ('DUPLICATE_EVENT', 'CLOCK_MANIPULATION', 'IMPOSSIBLE_SESSION', 'RAPID_MISSION_COMPLETION', 'ABNORMAL_MISSION_PATTERN', 'REPEATED_ASSIGNMENT_ABUSE', 'MULTIPLE_ACCOUNT_SIGNAL', 'SUSPICIOUS_ACTIVITY_BURST', 'REPEATED_EVIDENCE_HASH', 'EVIDENCE_REUSE_ACROSS_CAMPAIGNS', 'EXCESSIVE_REJECTED_EVIDENCE', 'IMPOSSIBLE_EVIDENCE_PATTERN', 'RAPID_CLAIM_WITHOUT_PARTICIPATION');

-- CreateEnum
CREATE TYPE "TrustEventType" AS ENUM ('INITIAL_ASSIGNMENT', 'CAMPAIGN_COMPLETED', 'MISSION_VALIDATED', 'RECOVERY_BONUS', 'PENALTY_APPLIED', 'MANUAL_OVERRIDE');

-- CreateEnum
CREATE TYPE "TrustPenaltyType" AS ENUM ('CAMPAIGN_ABANDONMENT', 'FRAUD_SIGNAL', 'REPEATED_SUSPICIOUS_ACTIVITY', 'INVALID_MISSION_BEHAVIOR', 'ACCOUNT_ABUSE');

-- CreateEnum
CREATE TYPE "FraudDecisionAction" AS ENUM ('NO_ACTION', 'MONITOR', 'FLAG', 'RESTRICT', 'SUSPEND', 'BAN');

-- CreateEnum
CREATE TYPE "RewardType" AS ENUM ('XP', 'GOLD', 'COMBINED');

-- CreateEnum
CREATE TYPE "RewardStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RewardSource" AS ENUM ('MISSION_VALIDATED', 'MISSION_COMPLETED', 'FEEDBACK_SUBMITTED', 'USEFUL_FEEDBACK', 'CAMPAIGN_PARTICIPATION_COMPLETED', 'CAMPAIGN_COMPLETED', 'VALID_BUG_REPORT', 'EXCELLENT_REPLACEMENT');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'PUSH', 'EMAIL');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('TESTER_CAMPAIGN_AVAILABLE', 'TESTER_MISSION_AVAILABLE', 'MISSION_COMPLETED', 'MISSION_REMINDER', 'CAMPAIGN_REMINDER', 'CAMPAIGN_COMPLETED', 'CAMPAIGN_PARTICIPATION_THANK_YOU', 'CAMPAIGN_REPLACEMENT', 'CAMPAIGN_LOW_ACTIVITY', 'CAMPAIGN_HEALTH_WARNING', 'CAMPAIGN_HEALTH_CRITICAL', 'NEW_TESTER_ASSIGNED', 'TESTER_LOW_ACTIVITY', 'TESTER_ABANDONED', 'TESTER_REPLACEMENT_ASSIGNED', 'CAMPAIGN_TARGET_REACHED', 'TRUST_UPDATED', 'REPUTATION_UPDATED', 'SYSTEM', 'APP_PUBLIC_VERIFIED', 'APP_PUBLIC_STATUS_CHANGED', 'PREMIUM', 'EVIDENCE_SUBMITTED', 'EVIDENCE_APPROVED', 'EVIDENCE_REJECTED', 'NEW_RELIABLE_TESTER_ASSIGNED', 'TESTER_AT_RISK', 'TESTER_REPLACED', 'NEW_MISSION', 'DAILY_MISSIONS_AVAILABLE', 'MISSION_DUE', 'CAMPAIGN_DAY_UPDATE', 'CAMPAIGN_ENDED_EARLY', 'NEW_CAMPAIGN_AVAILABLE', 'RELIABILITY_IMPROVED', 'NEW_OPPORTUNITY', 'PARTICIPATION_VERIFIED', 'PARTICIPATION_VERIFICATION_PENDING', 'AVAILABILITY_REPORT_RECEIVED', 'AVAILABILITY_EVIDENCE_REQUESTED', 'AVAILABILITY_RESOLVED');

-- CreateEnum
CREATE TYPE "PlayStoreValidationStatus" AS ENUM ('UNKNOWN', 'NOT_FOUND', 'PRIVATE', 'TESTING', 'PUBLIC', 'UNAVAILABLE', 'ERROR');

-- CreateEnum
CREATE TYPE "GoogleGroupValidationStatus" AS ENUM ('UNKNOWN', 'ACCESSIBLE', 'REQUIRES_APPROVAL', 'INACCESSIBLE', 'INVALID_URL');

-- CreateEnum
CREATE TYPE "FraudSignalType" AS ENUM ('EMULATOR_DETECTED', 'REPLAY_ATTACK', 'RAPID_FIRE_EVENTS', 'IMPOSSIBLE_TRAVEL', 'DEVICE_FINGERPRINT_MISMATCH', 'AUTOMATED_BEHAVIOR', 'REPEATED_EVIDENCE_HASH', 'EVIDENCE_REUSE_ACROSS_CAMPAIGNS', 'EXCESSIVE_REJECTED_EVIDENCE', 'IMPOSSIBLE_EVIDENCE_PATTERN', 'RAPID_CLAIM_WITHOUT_PARTICIPATION');

-- CreateEnum
CREATE TYPE "InstallationStatus" AS ENUM ('NOT_STARTED', 'INSTALL_ATTEMPTED', 'INSTALL_CLAIMED', 'INSTALL_DETECTED', 'FIRST_OPEN', 'ACTIVE', 'UNVERIFIED', 'REMOVED');

-- CreateEnum
CREATE TYPE "InstallationVerificationMethod" AS ENUM ('SDK', 'PLAY_STORE_FLOW', 'USER_CONFIRMATION', 'MISSION_ACTIVITY', 'EVIDENCE');

-- CreateEnum
CREATE TYPE "EvidenceStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "EvidenceRejectionReason" AS ENUM ('NOT_VISIBLE', 'WRONG_SCREEN', 'DOES_NOT_MATCH_MISSION', 'BLURRY', 'INCOMPLETE', 'DUPLICATE', 'OTHER');

-- CreateEnum
CREATE TYPE "ParticipationStatus" AS ENUM ('UNVERIFIED', 'PARTIALLY_VERIFIED', 'VERIFIED', 'ACTIVE', 'LOW_ACTIVITY', 'ABANDONED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('USER_REGISTERED', 'LOGIN', 'LOGOUT', 'USER_LOGIN', 'APP_CREATED', 'APP_UPDATED', 'APP_ARCHIVED', 'CAMPAIGN_CREATED', 'CAMPAIGN_STATE_CHANGED', 'CAMPAIGN_STATUS_CHANGED', 'CAMPAIGN_HEALTH_CHANGED', 'REPLACEMENT_REQUESTED', 'MATCHING_EXECUTED', 'CAMPAIGN_TESTER_ADDED', 'CAMPAIGN_TESTER_REMOVED', 'REFRESH_TOKEN_REVOKED', 'TESTER_ASSIGNED', 'TESTER_ASSIGNMENT_REJECTED', 'TESTER_REPLACED', 'EXPOSURE_CHANGED', 'MISSION_CREATED', 'MISSION_UPDATED', 'MISSION_APPROVED', 'MISSION_REJECTED', 'MISSION_ATTEMPT_STARTED', 'MISSION_ATTEMPT_SUBMITTED', 'MISSION_ATTEMPT_VALIDATED', 'MISSION_ATTEMPT_REJECTED', 'DIFFICULTY_FEEDBACK_SUBMITTED', 'QUALITY_FEEDBACK_SUBMITTED', 'REWARD_ISSUED', 'REWARD_GRANTED', 'REWARD_REJECTED', 'REWARD_PENDING', 'REWARD_REVIEWED', 'BALANCE_CHANGED', 'TRUST_CHANGED', 'TRUST_ADJUSTED', 'TRUST_PENALTY_APPLIED', 'TRUST_RECOVERY', 'FRAUD_EVENT_CREATED', 'FRAUD_DECISION_MADE', 'REPUTATION_CHANGED', 'USER_RESTRICTED', 'USER_SUSPENDED', 'USER_BANNED', 'NOTIFICATION_FAILED', 'NOTIFICATION_PREFERENCE_UPDATED', 'DEVICE_TOKEN_REGISTERED', 'DEVICE_TOKEN_REVOKED', 'STORE_VALIDATION_PERFORMED', 'GROUP_VALIDATION_PERFORMED', 'CAMPAIGN_LINKS_TEST_CONFIRMED', 'CAMPAIGN_COMPLETED_OPERATIONS', 'CAMPAIGN_PUBLIC_VERIFIED', 'INSTALLATION_CLAIMED', 'INSTALLATION_DETECTED', 'INSTALLATION_VERIFIED', 'EVIDENCE_SUBMITTED', 'EVIDENCE_APPROVED', 'EVIDENCE_REJECTED', 'EVIDENCE_WITHDRAWN', 'PARTICIPATION_VERIFIED', 'APP_SDK_STATUS_CHANGED', 'REPORT_SUBMITTED', 'REPORT_DEVELOPER_REVIEWED', 'REPORT_ESCALATED', 'AI_REVIEW_REQUESTED', 'AI_REVIEW_COMPLETED', 'AI_REVIEW_FAILED', 'AI_REVIEW_SKIPPED', 'AI_BUDGET_EXCEEDED', 'AI_REVIEW_RATE_LIMITED', 'REPORT_HUMAN_FINALIZED', 'REPORT_CLUSTER_CREATED', 'REPORT_CLUSTER_UPDATED', 'AVAILABILITY_REPORT_CREATED', 'AVAILABILITY_REPORT_DUPLICATE', 'DEVELOPER_EVIDENCE_REQUESTED', 'DEVELOPER_EVIDENCE_SUBMITTED', 'AVAILABILITY_REVIEW_STARTED', 'AVAILABILITY_CONFIRMED', 'AVAILABILITY_RESTRICTED', 'AVAILABILITY_UNVERIFIED', 'AVAILABILITY_RESOLVED', 'AVAILABILITY_DISMISSED', 'MISSION_BLOCKED_BY_AVAILABILITY', 'IDENTITY_CREATED', 'IDENTITY_SIGNAL_DETECTED', 'RISK_SIGNAL_CREATED', 'RISK_REVIEW_REQUIRED', 'PROGRESSION_EVALUATED', 'CAMPAIGN_COMPLETION_COUNTED', 'MATCHING_PRIORITY_CALCULATED', 'MATCHING_ASSIGNMENT_CREATED', 'MATCHING_ASSIGNMENT_REJECTED', 'DUPLICATE_PROGRESS_ATTEMPT');

-- CreateEnum
CREATE TYPE "SdkIntegrationStatus" AS ENUM ('NOT_CONFIGURED', 'SDK_ENABLED', 'NO_SDK');

-- CreateEnum
CREATE TYPE "ReportCategory" AS ENUM ('FUNCTIONAL', 'UI', 'PERFORMANCE', 'CRASH', 'INSTALLATION', 'ACCESSIBILITY', 'SECURITY', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('SUBMITTED', 'DEVELOPER_REVIEW', 'VALID', 'INVALID', 'NEEDS_MORE_EVIDENCE', 'ESCALATED', 'AI_REVIEW_PENDING', 'AI_REVIEWED', 'HUMAN_REVIEW', 'CONFIRMED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DeveloperReportDecision" AS ENUM ('VALID', 'INVALID', 'NEEDS_MORE_EVIDENCE', 'ESCALATED');

-- CreateEnum
CREATE TYPE "AiReportClassification" AS ENUM ('LIKELY_VALID', 'LIKELY_INVALID', 'INCONCLUSIVE');

-- CreateEnum
CREATE TYPE "AiRecommendedAction" AS ENUM ('HUMAN_REVIEW', 'REQUEST_MORE_EVIDENCE', 'NO_ACTION');

-- CreateEnum
CREATE TYPE "HumanReportDecision" AS ENUM ('CONFIRMED', 'REJECTED', 'NEEDS_MORE_EVIDENCE');

-- CreateEnum
CREATE TYPE "ReportClusterStatus" AS ENUM ('OPEN', 'ESCALATED', 'RESOLVED', 'CLOSED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "name" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'TESTER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastLoginAt" TIMESTAMP(3),
    "trustScore" INTEGER NOT NULL DEFAULT 50,
    "rank" "TrustRank" NOT NULL DEFAULT 'NEW',
    "xpBalance" INTEGER NOT NULL DEFAULT 0,
    "goldBalance" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL',
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "provider" TEXT DEFAULT 'in_app',
    "providerMessageId" TEXT,
    "deduplicationKey" TEXT,
    "readAt" TIMESTAMP(3),
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "campaignNotifications" BOOLEAN NOT NULL DEFAULT true,
    "missionNotifications" BOOLEAN NOT NULL DEFAULT true,
    "trustNotifications" BOOLEAN NOT NULL DEFAULT true,
    "systemNotifications" BOOLEAN NOT NULL DEFAULT true,
    "pushNotifications" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_push_tokens" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'android',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_push_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trust_profiles" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "trustScore" INTEGER NOT NULL DEFAULT 50,
    "trustRank" "TrustRank" NOT NULL DEFAULT 'NEW',
    "reputationStatus" "ReputationStatus" NOT NULL DEFAULT 'NORMAL',
    "completedCampaignsCount" INTEGER NOT NULL DEFAULT 0,
    "abandonedCampaignsCount" INTEGER NOT NULL DEFAULT 0,
    "consecutiveGoodCampaigns" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trust_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trust_histories" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "previousScore" INTEGER NOT NULL,
    "newScore" INTEGER NOT NULL,
    "previousRank" "TrustRank" NOT NULL,
    "newRank" "TrustRank" NOT NULL,
    "eventType" "TrustEventType" NOT NULL,
    "reason" TEXT NOT NULL,
    "sourceId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trust_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trust_penalties" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "TrustPenaltyType" NOT NULL,
    "severity" "FraudSeverity" NOT NULL DEFAULT 'LOW',
    "scoreImpact" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "sourceId" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trust_penalties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fraud_events" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "FraudEventType" NOT NULL,
    "severity" "FraudSeverity" NOT NULL DEFAULT 'LOW',
    "scoreImpact" INTEGER NOT NULL DEFAULT 0,
    "reason" TEXT NOT NULL,
    "sourceId" TEXT,
    "idempotencyKey" TEXT,
    "metadata" JSONB,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fraud_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tester_exposure_profiles" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "level" "TesterExposureLevel" NOT NULL DEFAULT 'NEW',
    "overrideMaxCampaigns" INTEGER,
    "completedCampaignsCount" INTEGER NOT NULL DEFAULT 0,
    "abandonedCampaignsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tester_exposure_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "replacedByTokenId" TEXT,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "apps" (
    "id" UUID NOT NULL,
    "developerId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "packageName" TEXT NOT NULL,
    "platform" "AppPlatform" NOT NULL DEFAULT 'ANDROID',
    "status" "AppStatus" NOT NULL DEFAULT 'DRAFT',
    "hasCallTestSdk" BOOLEAN NOT NULL DEFAULT false,
    "sdkIntegrationStatus" "SdkIntegrationStatus" NOT NULL DEFAULT 'NOT_CONFIGURED',
    "description" TEXT,
    "playStoreUrl" TEXT,
    "googleGroupUrl" TEXT,
    "apiKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "apps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" UUID NOT NULL,
    "appId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "targetTesters" INTEGER NOT NULL DEFAULT 12,
    "maxTesters" INTEGER NOT NULL DEFAULT 15,
    "durationDays" INTEGER NOT NULL DEFAULT 14,
    "developerConfirmedLinksTest" BOOLEAN NOT NULL DEFAULT false,
    "storeValidationStatus" "PlayStoreValidationStatus" NOT NULL DEFAULT 'UNKNOWN',
    "groupValidationStatus" "GoogleGroupValidationStatus" NOT NULL DEFAULT 'UNKNOWN',
    "lastStoreValidationAt" TIMESTAMP(3),
    "lastGroupValidationAt" TIMESTAMP(3),
    "publicVerifiedAt" TIMESTAMP(3),
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_testers" (
    "id" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "testerId" UUID NOT NULL,
    "assignmentType" "TesterAssignmentType" NOT NULL DEFAULT 'PRIMARY',
    "status" "TesterStatus" NOT NULL DEFAULT 'INVITED',
    "activityScore" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedEndAt" TIMESTAMP(3),
    "actualEndAt" TIMESTAMP(3),
    "isReplacement" BOOLEAN NOT NULL DEFAULT false,
    "exitReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_testers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "missions" (
    "id" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "appId" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "objective" TEXT NOT NULL,
    "steps" JSONB NOT NULL,
    "difficulty" "MissionDifficulty" NOT NULL DEFAULT 'MEDIUM',
    "estimatedMinutes" INTEGER NOT NULL DEFAULT 15,
    "validationMethod" "ValidationMethod" NOT NULL DEFAULT 'SDK_EVENT',
    "requiresEvidence" BOOLEAN NOT NULL DEFAULT false,
    "evidenceInstructions" TEXT,
    "rewardXp" INTEGER NOT NULL DEFAULT 50,
    "rewardGold" INTEGER NOT NULL DEFAULT 10,
    "status" "MissionStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "missions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mission_attempts" (
    "id" UUID NOT NULL,
    "missionId" UUID NOT NULL,
    "campaignTesterId" UUID NOT NULL,
    "testerId" UUID NOT NULL,
    "status" "AttemptStatus" NOT NULL DEFAULT 'STARTED',
    "attemptCount" INTEGER NOT NULL DEFAULT 1,
    "validationStatus" TEXT,
    "validatedById" UUID,
    "validatedAt" TIMESTAMP(3),
    "validationReason" TEXT,
    "proofData" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mission_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mission_evidences" (
    "id" UUID NOT NULL,
    "missionAttemptId" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "testerId" UUID NOT NULL,
    "missionId" UUID NOT NULL,
    "fileReference" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "status" "EvidenceStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" UUID,
    "rejectionReason" "EvidenceRejectionReason",
    "rejectionComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mission_evidences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "installation_records" (
    "id" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "appId" UUID NOT NULL,
    "testerId" UUID NOT NULL,
    "installationId" TEXT,
    "status" "InstallationStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "verificationMethod" "InstallationVerificationMethod" NOT NULL DEFAULT 'USER_CONFIRMATION',
    "firstDetectedAt" TIMESTAMP(3),
    "firstOpenedAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3),
    "lastSessionAt" TIMESTAMP(3),
    "claimedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "removedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "installation_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mission_difficulty_feedbacks" (
    "id" UUID NOT NULL,
    "missionId" UUID NOT NULL,
    "campaignTesterId" UUID NOT NULL,
    "rating" "MissionDifficulty" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mission_difficulty_feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mission_quality_feedbacks" (
    "id" UUID NOT NULL,
    "missionId" UUID NOT NULL,
    "campaignTesterId" UUID NOT NULL,
    "feedback" "MissionQualityRating" NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mission_quality_feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_events" (
    "id" UUID NOT NULL,
    "appId" UUID NOT NULL,
    "campaignTesterId" UUID,
    "testerId" UUID NOT NULL,
    "sessionId" TEXT NOT NULL,
    "eventType" "ActivityEventType" NOT NULL,
    "eventPayload" JSONB,
    "deviceInfo" JSONB,
    "clientTimestamp" TIMESTAMP(3) NOT NULL,
    "serverTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isValid" BOOLEAN NOT NULL DEFAULT true,
    "idempotencyKey" TEXT,

    CONSTRAINT "activity_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_records" (
    "sessionId" TEXT NOT NULL,
    "campaignTesterId" UUID,
    "testerId" UUID NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "durationSeconds" INTEGER,
    "source" TEXT,
    "isAnomalous" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_records_pkey" PRIMARY KEY ("sessionId")
);

-- CreateTable
CREATE TABLE "feedbacks" (
    "id" UUID NOT NULL,
    "appId" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "testerId" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "usefulnessScore" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bug_reports" (
    "id" UUID NOT NULL,
    "appId" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "testerId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "stepsToReproduce" TEXT NOT NULL,
    "deviceModel" TEXT,
    "osVersion" TEXT,
    "logs" TEXT,
    "isValidated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bug_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rewards" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "RewardType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "source" "RewardSource" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rewards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "campaignId" UUID,
    "action" "AuditAction" NOT NULL,
    "entityName" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "changes" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tester_reports" (
    "id" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "appId" UUID NOT NULL,
    "testerId" UUID NOT NULL,
    "missionId" UUID,
    "clusterId" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "ReportCategory" NOT NULL DEFAULT 'FUNCTIONAL',
    "severity" "ReportSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "ReportStatus" NOT NULL DEFAULT 'SUBMITTED',
    "developerDecision" "DeveloperReportDecision",
    "developerDecisionReason" TEXT,
    "developerId" UUID,
    "evidenceIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "tester_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_clusters" (
    "id" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "appId" UUID NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "status" "ReportClusterStatus" NOT NULL DEFAULT 'OPEN',
    "reportCount" INTEGER NOT NULL DEFAULT 1,
    "firstReportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_clusters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_reviews" (
    "id" UUID NOT NULL,
    "clusterId" UUID NOT NULL,
    "reportId" UUID,
    "aiReviewKey" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'google-gemini',
    "model" TEXT NOT NULL,
    "policyVersion" TEXT NOT NULL DEFAULT '1.0.0',
    "classification" "AiReportClassification" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "severityAssessment" "ReportSeverity",
    "evidenceConsistency" TEXT,
    "duplicateLikelihood" DOUBLE PRECISION,
    "reasoningSummary" TEXT NOT NULL,
    "recommendedAction" "AiRecommendedAction" NOT NULL DEFAULT 'HUMAN_REVIEW',
    "latencyMs" INTEGER NOT NULL DEFAULT 0,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "users_rank_idx" ON "users"("rank");

-- CreateIndex
CREATE INDEX "users_trustScore_idx" ON "users"("trustScore");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_deduplicationKey_key" ON "notifications"("deduplicationKey");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "notifications_status_idx" ON "notifications"("status");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notifications"("type");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_userId_key" ON "notification_preferences"("userId");

-- CreateIndex
CREATE INDEX "notification_preferences_userId_idx" ON "notification_preferences"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "device_push_tokens_token_key" ON "device_push_tokens"("token");

-- CreateIndex
CREATE INDEX "device_push_tokens_userId_idx" ON "device_push_tokens"("userId");

-- CreateIndex
CREATE INDEX "device_push_tokens_token_idx" ON "device_push_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "trust_profiles_userId_key" ON "trust_profiles"("userId");

-- CreateIndex
CREATE INDEX "trust_profiles_userId_idx" ON "trust_profiles"("userId");

-- CreateIndex
CREATE INDEX "trust_profiles_trustRank_idx" ON "trust_profiles"("trustRank");

-- CreateIndex
CREATE INDEX "trust_profiles_reputationStatus_idx" ON "trust_profiles"("reputationStatus");

-- CreateIndex
CREATE INDEX "trust_histories_userId_idx" ON "trust_histories"("userId");

-- CreateIndex
CREATE INDEX "trust_histories_eventType_idx" ON "trust_histories"("eventType");

-- CreateIndex
CREATE INDEX "trust_histories_createdAt_idx" ON "trust_histories"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "trust_penalties_idempotencyKey_key" ON "trust_penalties"("idempotencyKey");

-- CreateIndex
CREATE INDEX "trust_penalties_userId_idx" ON "trust_penalties"("userId");

-- CreateIndex
CREATE INDEX "trust_penalties_type_idx" ON "trust_penalties"("type");

-- CreateIndex
CREATE INDEX "trust_penalties_createdAt_idx" ON "trust_penalties"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "fraud_events_idempotencyKey_key" ON "fraud_events"("idempotencyKey");

-- CreateIndex
CREATE INDEX "fraud_events_userId_idx" ON "fraud_events"("userId");

-- CreateIndex
CREATE INDEX "fraud_events_type_idx" ON "fraud_events"("type");

-- CreateIndex
CREATE INDEX "fraud_events_severity_idx" ON "fraud_events"("severity");

-- CreateIndex
CREATE INDEX "fraud_events_createdAt_idx" ON "fraud_events"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "tester_exposure_profiles_userId_key" ON "tester_exposure_profiles"("userId");

-- CreateIndex
CREATE INDEX "tester_exposure_profiles_userId_idx" ON "tester_exposure_profiles"("userId");

-- CreateIndex
CREATE INDEX "tester_exposure_profiles_level_idx" ON "tester_exposure_profiles"("level");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "refresh_tokens_tokenHash_idx" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "apps_apiKey_key" ON "apps"("apiKey");

-- CreateIndex
CREATE INDEX "apps_developerId_idx" ON "apps"("developerId");

-- CreateIndex
CREATE INDEX "apps_packageName_idx" ON "apps"("packageName");

-- CreateIndex
CREATE INDEX "apps_status_idx" ON "apps"("status");

-- CreateIndex
CREATE INDEX "apps_apiKey_idx" ON "apps"("apiKey");

-- CreateIndex
CREATE INDEX "campaigns_appId_idx" ON "campaigns"("appId");

-- CreateIndex
CREATE INDEX "campaigns_status_idx" ON "campaigns"("status");

-- CreateIndex
CREATE INDEX "campaigns_storeValidationStatus_idx" ON "campaigns"("storeValidationStatus");

-- CreateIndex
CREATE INDEX "campaigns_groupValidationStatus_idx" ON "campaigns"("groupValidationStatus");

-- CreateIndex
CREATE INDEX "campaign_testers_campaignId_testerId_idx" ON "campaign_testers"("campaignId", "testerId");

-- CreateIndex
CREATE INDEX "campaign_testers_campaignId_idx" ON "campaign_testers"("campaignId");

-- CreateIndex
CREATE INDEX "campaign_testers_testerId_idx" ON "campaign_testers"("testerId");

-- CreateIndex
CREATE INDEX "campaign_testers_status_idx" ON "campaign_testers"("status");

-- CreateIndex
CREATE INDEX "campaign_testers_assignmentType_idx" ON "campaign_testers"("assignmentType");

-- CreateIndex
CREATE INDEX "missions_campaignId_idx" ON "missions"("campaignId");

-- CreateIndex
CREATE INDEX "missions_status_idx" ON "missions"("status");

-- CreateIndex
CREATE INDEX "missions_difficulty_idx" ON "missions"("difficulty");

-- CreateIndex
CREATE INDEX "mission_attempts_missionId_idx" ON "mission_attempts"("missionId");

-- CreateIndex
CREATE INDEX "mission_attempts_campaignTesterId_idx" ON "mission_attempts"("campaignTesterId");

-- CreateIndex
CREATE INDEX "mission_attempts_testerId_idx" ON "mission_attempts"("testerId");

-- CreateIndex
CREATE INDEX "mission_attempts_status_idx" ON "mission_attempts"("status");

-- CreateIndex
CREATE INDEX "mission_evidences_missionAttemptId_idx" ON "mission_evidences"("missionAttemptId");

-- CreateIndex
CREATE INDEX "mission_evidences_campaignId_idx" ON "mission_evidences"("campaignId");

-- CreateIndex
CREATE INDEX "mission_evidences_testerId_idx" ON "mission_evidences"("testerId");

-- CreateIndex
CREATE INDEX "mission_evidences_missionId_idx" ON "mission_evidences"("missionId");

-- CreateIndex
CREATE INDEX "mission_evidences_sha256_idx" ON "mission_evidences"("sha256");

-- CreateIndex
CREATE INDEX "mission_evidences_status_idx" ON "mission_evidences"("status");

-- CreateIndex
CREATE INDEX "installation_records_campaignId_appId_idx" ON "installation_records"("campaignId", "appId");

-- CreateIndex
CREATE INDEX "installation_records_testerId_appId_idx" ON "installation_records"("testerId", "appId");

-- CreateIndex
CREATE INDEX "installation_records_status_idx" ON "installation_records"("status");

-- CreateIndex
CREATE UNIQUE INDEX "installation_records_campaignId_testerId_key" ON "installation_records"("campaignId", "testerId");

-- CreateIndex
CREATE INDEX "mission_difficulty_feedbacks_missionId_idx" ON "mission_difficulty_feedbacks"("missionId");

-- CreateIndex
CREATE INDEX "mission_difficulty_feedbacks_campaignTesterId_idx" ON "mission_difficulty_feedbacks"("campaignTesterId");

-- CreateIndex
CREATE UNIQUE INDEX "mission_difficulty_feedbacks_missionId_campaignTesterId_key" ON "mission_difficulty_feedbacks"("missionId", "campaignTesterId");

-- CreateIndex
CREATE INDEX "mission_quality_feedbacks_missionId_idx" ON "mission_quality_feedbacks"("missionId");

-- CreateIndex
CREATE INDEX "mission_quality_feedbacks_campaignTesterId_idx" ON "mission_quality_feedbacks"("campaignTesterId");

-- CreateIndex
CREATE INDEX "mission_quality_feedbacks_feedback_idx" ON "mission_quality_feedbacks"("feedback");

-- CreateIndex
CREATE UNIQUE INDEX "activity_events_idempotencyKey_key" ON "activity_events"("idempotencyKey");

-- CreateIndex
CREATE INDEX "activity_events_appId_idx" ON "activity_events"("appId");

-- CreateIndex
CREATE INDEX "activity_events_testerId_idx" ON "activity_events"("testerId");

-- CreateIndex
CREATE INDEX "activity_events_campaignTesterId_idx" ON "activity_events"("campaignTesterId");

-- CreateIndex
CREATE INDEX "activity_events_sessionId_idx" ON "activity_events"("sessionId");

-- CreateIndex
CREATE INDEX "activity_events_eventType_idx" ON "activity_events"("eventType");

-- CreateIndex
CREATE INDEX "activity_events_serverTimestamp_idx" ON "activity_events"("serverTimestamp");

-- CreateIndex
CREATE INDEX "session_records_campaignTesterId_idx" ON "session_records"("campaignTesterId");

-- CreateIndex
CREATE INDEX "session_records_testerId_idx" ON "session_records"("testerId");

-- CreateIndex
CREATE INDEX "session_records_startedAt_idx" ON "session_records"("startedAt");

-- CreateIndex
CREATE INDEX "feedbacks_appId_idx" ON "feedbacks"("appId");

-- CreateIndex
CREATE INDEX "feedbacks_campaignId_idx" ON "feedbacks"("campaignId");

-- CreateIndex
CREATE INDEX "feedbacks_testerId_idx" ON "feedbacks"("testerId");

-- CreateIndex
CREATE INDEX "bug_reports_appId_idx" ON "bug_reports"("appId");

-- CreateIndex
CREATE INDEX "bug_reports_campaignId_idx" ON "bug_reports"("campaignId");

-- CreateIndex
CREATE INDEX "bug_reports_testerId_idx" ON "bug_reports"("testerId");

-- CreateIndex
CREATE UNIQUE INDEX "rewards_idempotencyKey_key" ON "rewards"("idempotencyKey");

-- CreateIndex
CREATE INDEX "rewards_userId_idx" ON "rewards"("userId");

-- CreateIndex
CREATE INDEX "rewards_type_idx" ON "rewards"("type");

-- CreateIndex
CREATE INDEX "rewards_source_idx" ON "rewards"("source");

-- CreateIndex
CREATE UNIQUE INDEX "rewards_userId_source_sourceId_key" ON "rewards"("userId", "source", "sourceId");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_campaignId_idx" ON "audit_logs"("campaignId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "tester_reports_appId_idx" ON "tester_reports"("appId");

-- CreateIndex
CREATE INDEX "tester_reports_campaignId_idx" ON "tester_reports"("campaignId");

-- CreateIndex
CREATE INDEX "tester_reports_testerId_idx" ON "tester_reports"("testerId");

-- CreateIndex
CREATE INDEX "tester_reports_clusterId_idx" ON "tester_reports"("clusterId");

-- CreateIndex
CREATE INDEX "tester_reports_status_idx" ON "tester_reports"("status");

-- CreateIndex
CREATE INDEX "tester_reports_category_idx" ON "tester_reports"("category");

-- CreateIndex
CREATE INDEX "tester_reports_severity_idx" ON "tester_reports"("severity");

-- CreateIndex
CREATE UNIQUE INDEX "report_clusters_fingerprint_key" ON "report_clusters"("fingerprint");

-- CreateIndex
CREATE INDEX "report_clusters_appId_idx" ON "report_clusters"("appId");

-- CreateIndex
CREATE INDEX "report_clusters_campaignId_idx" ON "report_clusters"("campaignId");

-- CreateIndex
CREATE INDEX "report_clusters_fingerprint_idx" ON "report_clusters"("fingerprint");

-- CreateIndex
CREATE INDEX "report_clusters_status_idx" ON "report_clusters"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ai_reviews_aiReviewKey_key" ON "ai_reviews"("aiReviewKey");

-- CreateIndex
CREATE INDEX "ai_reviews_clusterId_idx" ON "ai_reviews"("clusterId");

-- CreateIndex
CREATE INDEX "ai_reviews_reportId_idx" ON "ai_reviews"("reportId");

-- CreateIndex
CREATE INDEX "ai_reviews_aiReviewKey_idx" ON "ai_reviews"("aiReviewKey");

-- CreateIndex
CREATE INDEX "ai_reviews_classification_idx" ON "ai_reviews"("classification");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_push_tokens" ADD CONSTRAINT "device_push_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trust_profiles" ADD CONSTRAINT "trust_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trust_histories" ADD CONSTRAINT "trust_histories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trust_penalties" ADD CONSTRAINT "trust_penalties_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fraud_events" ADD CONSTRAINT "fraud_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tester_exposure_profiles" ADD CONSTRAINT "tester_exposure_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apps" ADD CONSTRAINT "apps_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_appId_fkey" FOREIGN KEY ("appId") REFERENCES "apps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_testers" ADD CONSTRAINT "campaign_testers_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_testers" ADD CONSTRAINT "campaign_testers_testerId_fkey" FOREIGN KEY ("testerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "missions" ADD CONSTRAINT "missions_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "missions" ADD CONSTRAINT "missions_appId_fkey" FOREIGN KEY ("appId") REFERENCES "apps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_attempts" ADD CONSTRAINT "mission_attempts_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "missions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_attempts" ADD CONSTRAINT "mission_attempts_campaignTesterId_fkey" FOREIGN KEY ("campaignTesterId") REFERENCES "campaign_testers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_attempts" ADD CONSTRAINT "mission_attempts_testerId_fkey" FOREIGN KEY ("testerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_evidences" ADD CONSTRAINT "mission_evidences_missionAttemptId_fkey" FOREIGN KEY ("missionAttemptId") REFERENCES "mission_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_evidences" ADD CONSTRAINT "mission_evidences_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_evidences" ADD CONSTRAINT "mission_evidences_testerId_fkey" FOREIGN KEY ("testerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_evidences" ADD CONSTRAINT "mission_evidences_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "missions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_evidences" ADD CONSTRAINT "mission_evidences_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "installation_records" ADD CONSTRAINT "installation_records_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "installation_records" ADD CONSTRAINT "installation_records_appId_fkey" FOREIGN KEY ("appId") REFERENCES "apps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "installation_records" ADD CONSTRAINT "installation_records_testerId_fkey" FOREIGN KEY ("testerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_difficulty_feedbacks" ADD CONSTRAINT "mission_difficulty_feedbacks_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "missions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_difficulty_feedbacks" ADD CONSTRAINT "mission_difficulty_feedbacks_campaignTesterId_fkey" FOREIGN KEY ("campaignTesterId") REFERENCES "campaign_testers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_quality_feedbacks" ADD CONSTRAINT "mission_quality_feedbacks_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "missions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_quality_feedbacks" ADD CONSTRAINT "mission_quality_feedbacks_campaignTesterId_fkey" FOREIGN KEY ("campaignTesterId") REFERENCES "campaign_testers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_appId_fkey" FOREIGN KEY ("appId") REFERENCES "apps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_testerId_fkey" FOREIGN KEY ("testerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_campaignTesterId_fkey" FOREIGN KEY ("campaignTesterId") REFERENCES "campaign_testers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_appId_fkey" FOREIGN KEY ("appId") REFERENCES "apps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_testerId_fkey" FOREIGN KEY ("testerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bug_reports" ADD CONSTRAINT "bug_reports_appId_fkey" FOREIGN KEY ("appId") REFERENCES "apps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bug_reports" ADD CONSTRAINT "bug_reports_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bug_reports" ADD CONSTRAINT "bug_reports_testerId_fkey" FOREIGN KEY ("testerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rewards" ADD CONSTRAINT "rewards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tester_reports" ADD CONSTRAINT "tester_reports_appId_fkey" FOREIGN KEY ("appId") REFERENCES "apps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tester_reports" ADD CONSTRAINT "tester_reports_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tester_reports" ADD CONSTRAINT "tester_reports_testerId_fkey" FOREIGN KEY ("testerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tester_reports" ADD CONSTRAINT "tester_reports_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tester_reports" ADD CONSTRAINT "tester_reports_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "missions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tester_reports" ADD CONSTRAINT "tester_reports_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "report_clusters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_clusters" ADD CONSTRAINT "report_clusters_appId_fkey" FOREIGN KEY ("appId") REFERENCES "apps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_clusters" ADD CONSTRAINT "report_clusters_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_reviews" ADD CONSTRAINT "ai_reviews_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "report_clusters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_reviews" ADD CONSTRAINT "ai_reviews_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "tester_reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;
