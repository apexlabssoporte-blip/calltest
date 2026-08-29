package com.calltest.tester.ui.rewards

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.serialization.Serializable

@Serializable
data class RewardItem(
    val id: String,
    val userId: String,
    val campaignId: String? = null,
    val missionId: String? = null,
    val sourceType: String, // MISSION_VALIDATED, FEEDBACK_SUBMITTED, CAMPAIGN_PARTICIPATION_COMPLETED, CAMPAIGN_COMPLETED
    val sourceId: String,
    val type: String = "XP",
    val amount: Int,
    val xpAmount: Int,
    val goldAmount: Int,
    val status: String = "APPROVED", // PENDING, APPROVED, REJECTED
    val reason: String,
    val createdAt: String
)

@Serializable
data class RewardsSummary(
    val userId: String,
    val totalXp: Int,
    val totalGold: Int,
    val completedMissionsCount: Int,
    val completedCampaignsCount: Int,
    val recentRewards: List<RewardItem> = emptyList()
)

data class RewardsUiState(
    val summary: RewardsSummary? = null,
    val historyItems: List<RewardItem> = emptyList(),
    val totalXp: Int = 0,
    val totalGold: Int = 0,
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
    val activeFilter: String = "ALL" // ALL, MISSION, FEEDBACK, CAMPAIGN
)

interface RewardsRepository {
    suspend fun getRewardsSummary(): Result<RewardsSummary>
    suspend fun getRewardHistory(page: Int = 1, limit: Int = 20, sourceType: String? = null): Result<List<RewardItem>>
}

class RewardsViewModel(
    private val repository: RewardsRepository
) {
    private val _uiState = MutableStateFlow(RewardsUiState())
    val uiState: StateFlow<RewardsUiState> = _uiState.asStateFlow()

    suspend fun loadRewardsData() {
        _uiState.update { it.copy(isLoading = true, errorMessage = null) }
        val summaryResult = repository.getRewardsSummary()
        summaryResult.fold(
            onSuccess = { summary ->
                _uiState.update { current ->
                    current.copy(
                        summary = summary,
                        totalXp = summary.totalXp,
                        totalGold = summary.totalGold,
                        historyItems = summary.recentRewards,
                        isLoading = false,
                        errorMessage = null
                    )
                }
            },
            onFailure = { error ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        errorMessage = error.localizedMessage ?: "Error loading rewards data"
                    )
                }
            }
        )
    }

    suspend fun filterBySourceType(sourceType: String?) {
        _uiState.update { it.copy(isLoading = true, activeFilter = sourceType ?: "ALL") }
        val historyResult = repository.getRewardHistory(page = 1, limit = 50, sourceType = sourceType)
        historyResult.fold(
            onSuccess = { items ->
                _uiState.update {
                    it.copy(
                        historyItems = items,
                        isLoading = false,
                        errorMessage = null
                    )
                }
            },
            onFailure = { error ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        errorMessage = error.localizedMessage ?: "Error filtering rewards"
                    )
                }
            }
        )
    }
}
