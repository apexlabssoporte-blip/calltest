package com.calltest.tester

import com.calltest.tester.data.models.CampaignDashboardResponse
import com.calltest.tester.data.models.CampaignHealthSummaryModel
import com.calltest.tester.data.models.CampaignReadinessResponse
import com.calltest.tester.data.models.MissionProgressModel
import com.calltest.tester.data.models.ReadinessCheckModel
import com.calltest.tester.data.repository.InMemoryCampaignOperationsRepository
import com.calltest.tester.ui.dashboard.CampaignDashboardViewModel
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class CampaignDashboardViewModelTest {

    private lateinit var repository: InMemoryCampaignOperationsRepository
    private lateinit var viewModel: CampaignDashboardViewModel

    private val sampleDashboard = CampaignDashboardResponse(
        campaignId = "camp-1",
        campaignName = "Beta 1.0 Sprint",
        appId = "app-1",
        appName = "CallTest App",
        packageName = "com.calltest.app",
        status = "ACTIVE",
        durationDays = 14,
        daysElapsed = 5,
        daysRemaining = 9,
        startsAt = "2026-08-17T06:00:00Z",
        endsAt = "2026-08-31T06:00:00Z",
        expectedEndAt = "2026-08-31T06:00:00Z",
        targetActiveTesters = 12,
        activeTestersCount = 12,
        lowActivityTestersCount = 1,
        abandonedTestersCount = 0,
        completedTestersCount = 0,
        replacementCount = 0,
        missionProgress = MissionProgressModel(
            totalMissions = 5,
            totalAttempts = 24,
            completedAttempts = 20,
            completionRate = 83.3
        ),
        health = CampaignHealthSummaryModel(
            risk = "HEALTHY",
            score = 92.0,
            replacementNeeded = 0,
            canAddTesters = true
        ),
        storeValidationStatus = "TESTING",
        groupValidationStatus = "ACCESSIBLE",
        developerConfirmedLinksTest = false,
        publicVerifiedAt = null
    )

    private val sampleReadiness = CampaignReadinessResponse(
        campaignId = "camp-1",
        ready = false,
        checks = listOf(
            ReadinessCheckModel(
                code = "DEVELOPER_CONFIRMED_LINKS_TEST",
                name = "Manual Device Link Verification",
                passed = false,
                isBlocking = true,
                message = "Developer must confirm link testing"
            )
        ),
        blockingReasons = listOf("Developer must confirm link testing"),
        warnings = emptyList()
    )

    @Before
    fun setUp() {
        repository = InMemoryCampaignOperationsRepository(
            sampleDashboard = sampleDashboard,
            sampleReadiness = sampleReadiness
        )
        viewModel = CampaignDashboardViewModel(repository)
    }

    @Test
    fun loadDashboard_populatesStateWithOperationalMetrics() = runBlocking {
        viewModel.loadDashboard("camp-1")
        val state = viewModel.uiState.value

        assertFalse(state.isLoading)
        assertNotNull(state.dashboard)
        assertEquals("Beta 1.0 Sprint", state.dashboard?.campaignName)
        assertEquals(12, state.dashboard?.activeTestersCount)
        assertEquals(9, state.dashboard?.daysRemaining)
    }

    @Test
    fun confirmLinksTest_updatesConfirmationStatus() = runBlocking {
        viewModel.loadDashboard("camp-1")
        assertFalse(viewModel.uiState.value.dashboard!!.developerConfirmedLinksTest)

        viewModel.confirmLinksTest("camp-1")
        val state = viewModel.uiState.value

        assertTrue(state.dashboard!!.developerConfirmedLinksTest)
    }
}
