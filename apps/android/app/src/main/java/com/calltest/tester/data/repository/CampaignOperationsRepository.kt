package com.calltest.tester.data.repository

import com.calltest.tester.data.models.CampaignDashboardResponse
import com.calltest.tester.data.models.CampaignReadinessResponse
import com.calltest.tester.data.models.SanitizedTesterOverview
import com.calltest.tester.data.models.ValidateLinksResponse

interface CampaignOperationsRepository {
    suspend fun getDashboard(campaignId: String): Result<CampaignDashboardResponse>
    suspend fun getReadiness(campaignId: String): Result<CampaignReadinessResponse>
    suspend fun validateLinks(campaignId: String): Result<ValidateLinksResponse>
    suspend fun confirmLinksTest(campaignId: String): Result<Boolean>
    suspend fun getTesterOverview(campaignId: String, testerId: String): Result<SanitizedTesterOverview>
}

class InMemoryCampaignOperationsRepository(
    private var sampleDashboard: CampaignDashboardResponse? = null,
    private var sampleReadiness: CampaignReadinessResponse? = null
) : CampaignOperationsRepository {

    override suspend fun getDashboard(campaignId: String): Result<CampaignDashboardResponse> {
        return sampleDashboard?.let { Result.success(it) }
            ?: Result.failure(NoSuchElementException("Campaign dashboard not found"))
    }

    override suspend fun getReadiness(campaignId: String): Result<CampaignReadinessResponse> {
        return sampleReadiness?.let { Result.success(it) }
            ?: Result.failure(NoSuchElementException("Campaign readiness not found"))
    }

    override suspend fun validateLinks(campaignId: String): Result<ValidateLinksResponse> {
        return Result.failure(UnsupportedOperationException("Mock validation not configured"))
    }

    override suspend fun confirmLinksTest(campaignId: String): Result<Boolean> {
        sampleDashboard = sampleDashboard?.copy(developerConfirmedLinksTest = true)
        return Result.success(true)
    }

    override suspend fun getTesterOverview(
        campaignId: String,
        testerId: String
    ): Result<SanitizedTesterOverview> {
        return Result.failure(NoSuchElementException("Tester overview not found"))
    }
}
