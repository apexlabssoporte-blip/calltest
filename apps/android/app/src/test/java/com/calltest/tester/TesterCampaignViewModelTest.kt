package com.calltest.tester

import com.calltest.tester.ui.campaigns.InMemoryTesterCampaignRepository
import com.calltest.tester.ui.campaigns.TesterCampaignViewModel
import com.calltest.tester.ui.campaigns.TesterMissionItem
import com.calltest.tester.ui.home.TesterParticipationSummary
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class TesterCampaignViewModelTest {

    private lateinit var repository: InMemoryTesterCampaignRepository
    private lateinit var viewModel: TesterCampaignViewModel

    @Before
    fun setUp() {
        repository = InMemoryTesterCampaignRepository()
        viewModel = TesterCampaignViewModel(repository)
    }

    @Test
    fun loadCampaignDetail_populatesParticipationAndMissions() = runBlocking {
        repository.participation = TesterParticipationSummary(
            participationId = "part-123",
            campaignId = "camp-123",
            appId = "app-123",
            campaignName = "Alpha Test",
            appName = "Fintech App",
            packageName = "com.fintech.app",
            dayOfParticipation = 3,
            totalDurationDays = 14,
            status = "ACTIVE"
        )
        repository.missionsList.add(
            TesterMissionItem(
                id = "m-1",
                title = "Open App for 5 mins",
                objective = "Test core navigation flow",
                difficulty = "EASY"
            )
        )

        viewModel.loadCampaignDetail("camp-123")

        val state = viewModel.uiState.value
        assertEquals("Alpha Test", state.participation?.campaignName)
        assertEquals(3, state.participation?.dayOfParticipation)
        assertEquals(1, state.missions.size)
        assertEquals("EASY", state.missions[0].difficulty)
    }

    @Test
    fun completeMission_triggersDifficultyFeedbackDialog() = runBlocking {
        repository.participation = TesterParticipationSummary(
            participationId = "part-1",
            campaignId = "camp-1",
            appId = "app-1",
            campaignName = "App Test",
            appName = "Test App",
            packageName = "com.test.app"
        )
        repository.missionsList.add(
            TesterMissionItem(
                id = "m-10",
                title = "Test Checkout",
                objective = "Complete mock purchase flow"
            )
        )

        viewModel.loadCampaignDetail("camp-1")
        viewModel.completeMission("m-10")

        val state = viewModel.uiState.value
        assertTrue(state.isDifficultyFeedbackDialogVisible)
        assertEquals("m-10", state.selectedMissionForFeedback?.id)
        assertNotNull(state.actionSuccessMessage)

        // Submit feedback
        viewModel.submitFeedback("EASY", "Smooth checkout flow")
        assertFalse(viewModel.uiState.value.isDifficultyFeedbackDialogVisible)
    }
}
