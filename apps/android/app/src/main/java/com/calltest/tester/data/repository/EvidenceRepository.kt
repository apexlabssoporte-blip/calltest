package com.calltest.tester.data.repository

import com.calltest.tester.data.models.InstallationRecordModel
import com.calltest.tester.data.models.MissionEvidenceModel
import com.calltest.tester.data.models.SubmitEvidenceRequest

interface EvidenceRepository {
    suspend fun claimInstallation(campaignId: String): Result<InstallationRecordModel>
    suspend fun getInstallationStatus(campaignId: String): Result<InstallationRecordModel>
    suspend fun submitEvidence(attemptId: String, request: SubmitEvidenceRequest): Result<MissionEvidenceModel>
    suspend fun getMyEvidences(campaignId: String): Result<List<MissionEvidenceModel>>
    suspend fun getCampaignEvidences(campaignId: String): Result<List<MissionEvidenceModel>>
    suspend fun approveEvidence(evidenceId: String): Result<MissionEvidenceModel>
    suspend fun rejectEvidence(evidenceId: String, reason: String, comment: String?): Result<MissionEvidenceModel>
}

class InMemoryEvidenceRepository(
    private val evidences: MutableList<MissionEvidenceModel> = mutableListOf(),
    private var sampleInstallation: InstallationRecordModel? = null
) : EvidenceRepository {

    override suspend fun claimInstallation(campaignId: String): Result<InstallationRecordModel> {
        val record = InstallationRecordModel(
            id = "inst-claim-1",
            campaignId = campaignId,
            appId = "app-1",
            testerId = "tester-1",
            status = "INSTALL_CLAIMED",
            verificationMethod = "USER_CONFIRMATION",
            claimedAt = "2026-08-22T06:00:00Z",
            createdAt = "2026-08-22T06:00:00Z",
            updatedAt = "2026-08-22T06:00:00Z"
        )
        sampleInstallation = record
        return Result.success(record)
    }

    override suspend fun getInstallationStatus(campaignId: String): Result<InstallationRecordModel> {
        return sampleInstallation?.let { Result.success(it) }
            ?: Result.failure(NoSuchElementException("Installation record not found"))
    }

    override suspend fun submitEvidence(
        attemptId: String,
        request: SubmitEvidenceRequest
    ): Result<MissionEvidenceModel> {
        val newEvidence = MissionEvidenceModel(
            id = "evid-${evidences.size + 1}",
            missionAttemptId = attemptId,
            campaignId = "camp-1",
            testerId = "tester-1",
            missionId = "m-1",
            fileReference = "evidence_sample.png",
            mimeType = request.mimeType,
            fileSize = 1024,
            sha256 = "abc123sha",
            status = "PENDING_REVIEW",
            submittedAt = "2026-08-22T06:00:00Z",
            createdAt = "2026-08-22T06:00:00Z",
            updatedAt = "2026-08-22T06:00:00Z"
        )
        evidences.add(newEvidence)
        return Result.success(newEvidence)
    }

    override suspend fun getMyEvidences(campaignId: String): Result<List<MissionEvidenceModel>> {
        return Result.success(evidences)
    }

    override suspend fun getCampaignEvidences(campaignId: String): Result<List<MissionEvidenceModel>> {
        return Result.success(evidences)
    }

    override suspend fun approveEvidence(evidenceId: String): Result<MissionEvidenceModel> {
        val index = evidences.indexOfFirst { it.id == evidenceId }
        if (index != -1) {
            val updated = evidences[index].copy(status = "APPROVED", reviewedAt = "2026-08-22T06:10:00Z")
            evidences[index] = updated
            return Result.success(updated)
        }
        return Result.failure(NoSuchElementException("Evidence not found"))
    }

    override suspend fun rejectEvidence(
        evidenceId: String,
        reason: String,
        comment: String?
    ): Result<MissionEvidenceModel> {
        val index = evidences.indexOfFirst { it.id == evidenceId }
        if (index != -1) {
            val updated = evidences[index].copy(
                status = "REJECTED",
                rejectionReason = reason,
                rejectionComment = comment,
                reviewedAt = "2026-08-22T06:10:00Z"
            )
            evidences[index] = updated
            return Result.success(updated)
        }
        return Result.failure(NoSuchElementException("Evidence not found"))
    }
}
