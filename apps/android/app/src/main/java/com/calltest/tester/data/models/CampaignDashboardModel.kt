package com.calltest.tester.data.models

import kotlinx.serialization.Serializable

@Serializable
data class MissionProgressModel(
    val totalMissions: Int,
    val totalAttempts: Int,
    val completedAttempts: Int,
    val completionRate: Double
)

@Serializable
data class CampaignHealthSummaryModel(
    val risk: String,
    val score: Double,
    val replacementNeeded: Int,
    val canAddTesters: Boolean
)

@Serializable
data class CampaignDashboardResponse(
    val campaignId: String,
    val campaignName: String,
    val appId: String,
    val appName: String,
    val packageName: String,
    val status: String,
    val durationDays: Int,
    val daysElapsed: Int,
    val daysRemaining: Int,
    val startsAt: String? = null,
    val endsAt: String? = null,
    val expectedEndAt: String? = null,
    val targetActiveTesters: Int,
    val activeTestersCount: Int,
    val lowActivityTestersCount: Int,
    val abandonedTestersCount: Int,
    val completedTestersCount: Int,
    val replacementCount: Int,
    val missionProgress: MissionProgressModel,
    val health: CampaignHealthSummaryModel,
    val storeValidationStatus: String,
    val groupValidationStatus: String,
    val developerConfirmedLinksTest: Boolean,
    val publicVerifiedAt: String? = null
)

@Serializable
data class ReadinessCheckModel(
    val code: String,
    val name: String,
    val passed: Boolean,
    val isBlocking: Boolean,
    val message: String
)

@Serializable
data class CampaignReadinessResponse(
    val campaignId: String,
    val ready: Boolean,
    val checks: List<ReadinessCheckModel>,
    val blockingReasons: List<String>,
    val warnings: List<String>
)

@Serializable
data class PlayStoreValidationDetails(
    val validUrl: Boolean,
    val reachable: Boolean,
    val packageName: String? = null,
    val packageMatches: Boolean,
    val isPubliclyAvailable: Boolean,
    val status: String,
    val message: String
)

@Serializable
data class GoogleGroupValidationDetails(
    val valid: Boolean,
    val reachable: Boolean,
    val requiresApproval: Boolean,
    val publiclyJoinable: Boolean,
    val status: String,
    val message: String
)

@Serializable
data class ValidateLinksResponse(
    val campaignId: String,
    val playStore: PlayStoreValidationDetails,
    val googleGroup: GoogleGroupValidationDetails,
    val updatedAt: String
)

@Serializable
data class SanitizedTesterOverview(
    val campaignTesterId: String,
    val campaignId: String,
    val testerId: String,
    val displayName: String,
    val status: String,
    val assignmentType: String,
    val isReplacement: Boolean,
    val joinedAt: String,
    val expectedEndAt: String? = null,
    val actualEndAt: String? = null,
    val daysParticipating: Int,
    val completedMissionsCount: Int,
    val pendingMissionsCount: Int,
    val completionPercentage: Double,
    val activityScore: Double,
    val lastActivityAt: String? = null,
    val feedbacksSubmittedCount: Int,
    val participationStatus: String
)
