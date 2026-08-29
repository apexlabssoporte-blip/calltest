package com.calltest.tester.ui.campaigns

import com.calltest.tester.ui.home.TesterParticipationSummary
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.serialization.Serializable

@Serializable
data class TesterMissionItem(
    val id: String,
    val title: String,
    val objective: String,
    val difficulty: String = "EASY",
    val estimatedMinutes: Int = 5,
    val validationMethod: String = "MANUAL",
    val requiresEvidence: Boolean = false,
    val evidenceInstructions: String? = null,
    val attemptStatus: String? = null, // PENDING, IN_PROGRESS, SUBMITTED, VALIDATED, REJECTED
    val attemptId: String? = null
)

@Serializable
data class TesterActivitySummary(
    val activityScore: Double = 100.0,
    val activityState: String = "ACTIVE",
    val sessionsCount: Int = 0,
    val missionsCompletedCount: Int = 0,
    val feedbacksSubmittedCount: Int = 0
)

data class TesterCampaignUiState(
    val participation: TesterParticipationSummary? = null,
    val missions: List<TesterMissionItem> = emptyList(),
    val activity: TesterActivitySummary = TesterActivitySummary(),
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
    val actionSuccessMessage: String? = null,
    val isDifficultyFeedbackDialogVisible: Boolean = false,
    val selectedMissionForFeedback: TesterMissionItem? = null
)

interface TesterCampaignRepository {
    suspend fun getParticipationDetail(campaignId: String): Result<Pair<TesterParticipationSummary, List<TesterMissionItem>>>
    suspend fun submitMissionAttempt(missionId: String): Result<String>
    suspend fun submitDifficultyFeedback(missionId: String, difficulty: String, comment: String?): Result<Boolean>
}

class InMemoryTesterCampaignRepository : TesterCampaignRepository {
    var participation: TesterParticipationSummary? = null
    val missionsList = mutableListOf<TesterMissionItem>()

    override suspend fun getParticipationDetail(
        campaignId: String
    ): Result<Pair<TesterParticipationSummary, List<TesterMissionItem>>> {
        val part = participation ?: TesterParticipationSummary(
            participationId = "part-1",
            campaignId = campaignId,
            appId = "app-1",
            campaignName = "Beta Testing",
            appName = "My App",
            packageName = "com.test.app"
        )
        return Result.success(Pair(part, missionsList.toList()))
    }

    override suspend fun submitMissionAttempt(missionId: String): Result<String> {
        val idx = missionsList.indexOfFirst { it.id == missionId }
        if (idx != -1) {
            missionsList[idx] = missionsList[idx].copy(attemptStatus = "VALIDATED")
        }
        return Result.success("att-123")
    }

    override suspend fun submitDifficultyFeedback(
        missionId: String,
        difficulty: String,
        comment: String?
    ): Result<Boolean> {
        return Result.success(true)
    }
}

class TesterCampaignViewModel(
    private val repository: TesterCampaignRepository = InMemoryTesterCampaignRepository()
) {
    private val _uiState = MutableStateFlow(TesterCampaignUiState())
    val uiState: StateFlow<TesterCampaignUiState> = _uiState.asStateFlow()

    suspend fun loadCampaignDetail(campaignId: String) {
        _uiState.update { it.copy(isLoading = true, errorMessage = null) }
        val result = repository.getParticipationDetail(campaignId)
        if (result.isSuccess) {
            val (part, missions) = result.getOrThrow()
            val completed = missions.count { it.attemptStatus == "VALIDATED" }
            _uiState.update {
                it.copy(
                    participation = part,
                    missions = missions,
                    activity = TesterActivitySummary(
                        activityScore = part.activityScore,
                        activityState = part.status,
                        missionsCompletedCount = completed
                    ),
                    isLoading = false
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
    }

    suspend fun completeMission(missionId: String) {
        _uiState.update { it.copy(isLoading = true) }
        val result = repository.submitMissionAttempt(missionId)
        if (result.isSuccess) {
            val mission = _uiState.value.missions.find { it.id == missionId }
            _uiState.update {
                it.copy(
                    isLoading = false,
                    actionSuccessMessage = "¡Misión completada con éxito!",
                    isDifficultyFeedbackDialogVisible = true,
                    selectedMissionForFeedback = mission
                )
            }
            if (_uiState.value.participation != null) {
                loadCampaignDetail(_uiState.value.participation!!.campaignId)
            }
        } else {
            _uiState.update {
                it.copy(isLoading = false, errorMessage = result.exceptionOrNull()?.message)
            }
        }
    }

    suspend fun submitFeedback(difficulty: String, comment: String?) {
        val missionId = _uiState.value.selectedMissionForFeedback?.id ?: return
        val result = repository.submitDifficultyFeedback(missionId, difficulty, comment)
        if (result.isSuccess) {
            _uiState.update {
                it.copy(
                    isDifficultyFeedbackDialogVisible = false,
                    selectedMissionForFeedback = null,
                    actionSuccessMessage = "¡Gracias por calificar la dificultad de la misión!"
                )
            }
        }
    }

    fun dismissFeedbackDialog() {
        _uiState.update {
            it.copy(
                isDifficultyFeedbackDialogVisible = false,
                selectedMissionForFeedback = null
            )
        }
    }
}
