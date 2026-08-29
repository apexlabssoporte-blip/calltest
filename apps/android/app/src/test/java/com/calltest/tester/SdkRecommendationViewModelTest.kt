package com.calltest.tester

import com.calltest.tester.ui.sdk.InMemoryAppSdkRepository
import com.calltest.tester.ui.sdk.SdkRecommendationViewModel
import com.calltest.tester.ui.sdk.SdkVerificationState
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class SdkRecommendationViewModelTest {

    private lateinit var repository: InMemoryAppSdkRepository
    private lateinit var viewModel: SdkRecommendationViewModel

    @Before
    fun setUp() {
        repository = InMemoryAppSdkRepository()
        viewModel = SdkRecommendationViewModel(repository)
    }

    @Test
    fun initialState_hasNotConfiguredAndComparisonData() {
        val state = viewModel.uiState.value
        assertEquals("NOT_CONFIGURED", state.selectedStatus)
        assertEquals(9, state.comparisonFeatures.size)
        assertFalse(state.isShowingExplanationDialog)
        assertFalse(state.isShowingNoSdkConfirmationDialog)
    }

    @Test
    fun onSelectSdkEnabled_updatesSelectedStatusAndShowsGuide() {
        viewModel.onSelectSdkEnabled()
        val state = viewModel.uiState.value

        assertEquals("SDK_ENABLED", state.selectedStatus)
        assertTrue(state.isSdkIntegrationGuideVisible)
        assertFalse(state.isShowingNoSdkConfirmationDialog)
    }

    @Test
    fun onSelectNoSdk_showsConfirmationDialogFirst() {
        viewModel.onSelectNoSdk()
        val state = viewModel.uiState.value

        assertTrue(state.isShowingNoSdkConfirmationDialog)
        assertEquals("NOT_CONFIGURED", state.selectedStatus)
    }

    @Test
    fun confirmNoSdk_setsNoSdkStatusAndHidesGuide() {
        viewModel.onSelectNoSdk()
        viewModel.confirmNoSdk()
        val state = viewModel.uiState.value

        assertEquals("NO_SDK", state.selectedStatus)
        assertFalse(state.isShowingNoSdkConfirmationDialog)
        assertFalse(state.isSdkIntegrationGuideVisible)
    }

    @Test
    fun openAndCloseSdkExplanation_togglesDialog() {
        viewModel.openSdkExplanation()
        assertTrue(viewModel.uiState.value.isShowingExplanationDialog)

        viewModel.closeSdkExplanation()
        assertFalse(viewModel.uiState.value.isShowingExplanationDialog)
    }

    @Test
    fun openAndCloseComparisonTable_togglesDialog() {
        viewModel.openComparisonTable()
        assertTrue(viewModel.uiState.value.isShowingComparisonDialog)

        viewModel.closeComparisonTable()
        assertFalse(viewModel.uiState.value.isShowingComparisonDialog)
    }

    @Test
    fun saveChoice_updatesBackendRepository() = runBlocking {
        viewModel.onSelectSdkEnabled()
        val result = viewModel.saveChoice("app-123")

        assertTrue(result.isSuccess)
        val saved = result.getOrNull()
        assertEquals("SDK_ENABLED", saved?.sdkIntegrationStatus)
        assertTrue(saved?.hasCallTestSdk == true)
    }

    @Test
    fun checkConnection_verifiesSdkOperationalState() = runBlocking {
        viewModel.onSelectSdkEnabled()
        viewModel.saveChoice("app-123")
        viewModel.checkConnection("app-123")

        assertEquals(SdkVerificationState.OPERATIONAL, viewModel.uiState.value.sdkVerificationState)
    }
}
