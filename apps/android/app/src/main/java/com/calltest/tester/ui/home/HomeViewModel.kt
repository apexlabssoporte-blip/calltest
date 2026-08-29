package com.calltest.tester.ui.home

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.serialization.Serializable

@Serializable
data class AvailableCampaign(
    val id: String,
    val appId: String,
    val name: String,
    val appName: String,
    val packageName: String,
    val appDescription: String? = null,
    val developerName: String = "",
    val googleGroupUrl: String? = null,
    val playStoreWebUrl: String? = null,
    val playStoreAppUrl: String? = null,
    val status: String = "ACTIVE",
    val durationDays: Int = 14,
    val targetTesters: Int = 12,
    val activeTestersCount: Int = 0,
    val hasCallTestSdk: Boolean = false,
    val sdkIntegrationStatus: String = "NOT_CONFIGURED",
    val verificationMethodLabel: String = "Evidencias",
    val startsAt: String? = null,
    val endsAt: String? = null,
    val featureTags: List<String> = emptyList()
)

@Serializable
data class TesterParticipationSummary(
    val participationId: String,
    val campaignId: String,
    val appId: String,
    val campaignName: String,
    val appName: String,
    val packageName: String,
    val developerName: String = "",
    val hasCallTestSdk: Boolean = false,
    val sdkIntegrationStatus: String = "NOT_CONFIGURED",
    val verificationMethodLabel: String = "Evidencias",
    val status: String = "ACTIVE", // ACTIVE, LOW_ACTIVITY, ABANDONED, COMPLETED
    val participationStatus: String = "ACTIVE",
    val activityScore: Double = 100.0,
    val isReplacement: Boolean = false,
    val joinedAt: String = "",
    val expectedEndAt: String? = null,
    val actualEndAt: String? = null,
    val dayOfParticipation: Int = 1,
    val totalDurationDays: Int = 14,
    val installationStatus: String = "NOT_STARTED", // NOT_STARTED, INSTALL_CLAIMED, INSTALL_DETECTED, FIRST_OPEN, VERIFIED
    val installationVerificationMethod: String = "USER_CONFIRMATION",
    val missionsCompleted: Int = 0,
    val missionsPending: Int = 0,
    val totalMissions: Int = 0,
    val featureTags: List<String> = emptyList()
)

data class HomeUiState(
    val availableCampaigns: List<AvailableCampaign> = emptyList(),
    val myCampaigns: List<TesterParticipationSummary> = emptyList(),
    val activeFilter: String = "ALL", // ALL, ACTIVE, PENDING_INSTALL, COMPLETED
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
    val actionSuccessMessage: String? = null
)

interface TesterHomeRepository {
    suspend fun getAvailableCampaigns(): Result<List<AvailableCampaign>>
    suspend fun getMyCampaigns(): Result<List<TesterParticipationSummary>>
    suspend fun joinCampaign(campaignId: String): Result<TesterParticipationSummary>
}

class InMemoryTesterHomeRepository : TesterHomeRepository {
    val availableStore = mutableListOf<AvailableCampaign>()
    val myCampaignStore = mutableListOf<TesterParticipationSummary>()

    override suspend fun getAvailableCampaigns(): Result<List<AvailableCampaign>> {
        return Result.success(availableStore.toList())
    }

    override suspend fun getMyCampaigns(): Result<List<TesterParticipationSummary>> {
        return Result.success(myCampaignStore.toList())
    }

    override suspend fun joinCampaign(campaignId: String): Result<TesterParticipationSummary> {
        val available = availableStore.find { it.id == campaignId }
            ?: return Result.failure(IllegalArgumentException("Campaign not found or ineligible"))

        val newParticipation = TesterParticipationSummary(
            participationId = "part-${System.currentTimeMillis()}",
            campaignId = available.id,
            appId = available.appId,
            campaignName = available.name,
            appName = available.appName,
            packageName = available.packageName,
            developerName = available.developerName,
            hasCallTestSdk = available.hasCallTestSdk,
            sdkIntegrationStatus = available.sdkIntegrationStatus,
            verificationMethodLabel = available.verificationMethodLabel,
            status = "ACTIVE",
            participationStatus = "ACTIVE",
            isReplacement = false,
            dayOfParticipation = 1,
            totalDurationDays = available.durationDays,
            installationStatus = "NOT_STARTED"
        )
        myCampaignStore.add(newParticipation)
        availableStore.removeAll { it.id == campaignId }
        return Result.success(newParticipation)
    }
}

class HomeViewModel(
    private val repository: TesterHomeRepository = InMemoryTesterHomeRepository()
) {
    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    suspend fun loadDashboardData() {
        _uiState.update { it.copy(isLoading = true, errorMessage = null) }
        val availResult = repository.getAvailableCampaigns()
        val myResult = repository.getMyCampaigns()

        if (availResult.isSuccess && myResult.isSuccess) {
            _uiState.update {
                it.copy(
                    availableCampaigns = availResult.getOrDefault(emptyList()),
                    myCampaigns = myResult.getOrDefault(emptyList()),
                    isLoading = false
                )
            }
        } else {
            _uiState.update {
                it.copy(
                    isLoading = false,
                    errorMessage = availResult.exceptionOrNull()?.message
                        ?: myResult.exceptionOrNull()?.message
                )
            }
        }
    }

    fun setFilter(filter: String) {
        _uiState.update { it.copy(activeFilter = filter) }
    }

    suspend fun joinCampaign(campaignId: String): Result<TesterParticipationSummary> {
        _uiState.update { it.copy(isLoading = true, errorMessage = null) }
        val result = repository.joinCampaign(campaignId)
        if (result.isSuccess) {
            loadDashboardData()
            _uiState.update {
                it.copy(
                    isLoading = false,
                    actionSuccessMessage = "¡Te has unido a la campaña exitosamente!"
                )
            }
        } else {
            _uiState.update {
                it.copy(
                    isLoading = false,
                    errorMessage = result.exceptionOrNull()?.message
                )
            }
        }
        return result
    }

    fun clearMessages() {
        _uiState.update { it.copy(errorMessage = null, actionSuccessMessage = null) }
    }
}
