package com.calltest.tester.data.models

import kotlinx.serialization.Serializable

@Serializable
data class InstallationRecordModel(
    val id: String,
    val campaignId: String,
    val appId: String,
    val testerId: String,
    val installationId: String? = null,
    val status: String,
    val verificationMethod: String,
    val firstDetectedAt: String? = null,
    val firstOpenedAt: String? = null,
    val lastSeenAt: String? = null,
    val claimedAt: String? = null,
    val verifiedAt: String? = null,
    val createdAt: String,
    val updatedAt: String
)

@Serializable
data class MissionEvidenceModel(
    val id: String,
    val missionAttemptId: String,
    val campaignId: String,
    val testerId: String,
    val missionId: String,
    val fileReference: String,
    val mimeType: String,
    val fileSize: Int,
    val sha256: String,
    val status: String, // PENDING_REVIEW, APPROVED, REJECTED, WITHDRAWN
    val submittedAt: String,
    val reviewedAt: String? = null,
    val reviewedById: String? = null,
    val rejectionReason: String? = null,
    val rejectionComment: String? = null,
    val createdAt: String,
    val updatedAt: String
)

@Serializable
data class SubmitEvidenceRequest(
    val imageBase64: String,
    val filename: String,
    val mimeType: String
)

@Serializable
data class RejectEvidenceRequest(
    val reason: String,
    val comment: String? = null
)

@Serializable
data class ParticipationSummaryModel(
    val campaignId: String,
    val assignedTestersCount: Int,
    val installationClaimedCount: Int,
    val installationVerifiedCount: Int,
    val participationVerifiedCount: Int,
    val pendingVerificationCount: Int,
    val activeTestersCount: Int,
    val lowActivityTestersCount: Int,
    val abandonedTestersCount: Int,
    val completedTestersCount: Int
)
