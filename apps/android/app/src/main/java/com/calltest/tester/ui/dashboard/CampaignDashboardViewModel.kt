package com.calltest.tester.ui.dashboard

import com.calltest.tester.data.models.CampaignDashboardResponse
import com.calltest.tester.data.models.CampaignReadinessResponse
import com.calltest.tester.data.repository.CampaignOperationsRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

data class CampaignDashboardUiState(
    val isLoading: Boolean = false,
    val dashboard: CampaignDashboardResponse? = null,
    val readiness: CampaignReadinessResponse? = null,
    val errorMessage: String? = null
)

class CampaignDashboardViewModel(
    private val repository: CampaignOperationsRepository
) {
    private val _uiState = MutableStateFlow(CampaignDashboardUiState())
    val uiState: StateFlow<CampaignDashboardUiState> = _uiState.asStateFlow()

    suspend fun loadDashboard(campaignId: String) {
        _uiState.update { it.copy(isLoading = true, errorMessage = null) }

        val dashboardResult = repository.getDashboard(campaignId)
        val readinessResult = repository.getReadiness(campaignId)

        if (dashboardResult.isSuccess) {
            _uiState.update {
                it.copy(
                    isLoading = false,
                    dashboard = dashboardResult.getOrNull(),
                    readiness = readinessResult.getOrNull()
                )
            }
        } else {
            _uiState.update {
                it.copy(
                    isLoading = false,
                    errorMessage = dashboardResult.exceptionOrNull()?.message ?: "Error al cargar dashboard"
                )
            }
        }
    }

    suspend fun confirmLinksTest(campaignId: String) {
        val result = repository.confirmLinksTest(campaignId)
        if (result.isSuccess) {
            loadDashboard(campaignId)
        }
    }
}
