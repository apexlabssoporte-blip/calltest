package com.calltest.tester

import com.calltest.tester.ui.home.AvailableCampaign
import com.calltest.tester.ui.home.HomeViewModel
import com.calltest.tester.ui.home.InMemoryTesterHomeRepository
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class HomeViewModelTest {

    private lateinit var repository: InMemoryTesterHomeRepository
    private lateinit var viewModel: HomeViewModel

    @Before
    fun setUp() {
        repository = InMemoryTesterHomeRepository()
        viewModel = HomeViewModel(repository)
    }

    @Test
    fun loadDashboardData_populatesAvailableAndMyCampaigns() = runBlocking {
        repository.availableStore.add(
            AvailableCampaign(
                id = "camp-1",
                appId = "app-1",
                name = "Campaign 1",
                appName = "My App",
                packageName = "com.my.app",
                developerName = "Dev 1",
                hasCallTestSdk = true,
                verificationMethodLabel = "CallTest SDK"
            )
        )

        viewModel.loadDashboardData()

        val state = viewModel.uiState.value
        assertEquals(1, state.availableCampaigns.size)
        assertEquals("Campaign 1", state.availableCampaigns[0].name)
        assertTrue(state.availableCampaigns[0].hasCallTestSdk)
        assertEquals(0, state.myCampaigns.size)
    }

    @Test
    fun joinCampaign_movesCampaignToMyCampaigns() = runBlocking {
        repository.availableStore.add(
            AvailableCampaign(
                id = "camp-100",
                appId = "app-100",
                name = "Closed Beta",
                appName = "Awesome Game",
                packageName = "com.awesome.game",
                durationDays = 14
            )
        )

        val joinResult = viewModel.joinCampaign("camp-100")
        assertTrue(joinResult.isSuccess)

        val state = viewModel.uiState.value
        assertEquals(0, state.availableCampaigns.size)
        assertEquals(1, state.myCampaigns.size)
        assertEquals("Closed Beta", state.myCampaigns[0].campaignName)
        assertEquals(14, state.myCampaigns[0].totalDurationDays)
        assertEquals("NOT_STARTED", state.myCampaigns[0].installationStatus)
        assertNotNull(state.actionSuccessMessage)
    }

    @Test
    fun setFilter_updatesActiveFilter() {
        viewModel.setFilter("ACTIVE")
        assertEquals("ACTIVE", viewModel.uiState.value.activeFilter)

        viewModel.setFilter("COMPLETED")
        assertEquals("COMPLETED", viewModel.uiState.value.activeFilter)
    }
}
