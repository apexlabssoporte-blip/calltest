package com.calltest.tester.ui.evidence

import com.calltest.tester.data.models.MissionEvidenceModel
import com.calltest.tester.data.models.SubmitEvidenceRequest
import com.calltest.tester.data.repository.EvidenceRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

data class EvidenceUiState(
    val isLoading: Boolean = false,
    val evidences: List<MissionEvidenceModel> = emptyList(),
    val installationStatus: String = "NOT_STARTED",
    val errorMessage: String? = null
)

class EvidenceReviewViewModel(
    private val repository: EvidenceRepository
) {
    private val _uiState = MutableStateFlow(EvidenceUiState())
    val uiState: StateFlow<EvidenceUiState> = _uiState.asStateFlow()

    suspend fun loadMyEvidences(campaignId: String) {
        _uiState.update { it.copy(isLoading = true, errorMessage = null) }
        val result = repository.getMyEvidences(campaignId)
        if (result.isSuccess) {
            _uiState.update {
                it.copy(isLoading = false, evidences = result.getOrDefault(emptyList()))
            }
        } else {
            _uiState.update {
                it.copy(isLoading = false, errorMessage = result.exceptionOrNull()?.message)
            }
        }
    }

    suspend fun claimInstallation(campaignId: String) {
        val result = repository.claimInstallation(campaignId)
        if (result.isSuccess) {
            _uiState.update { it.copy(installationStatus = "INSTALL_CLAIMED") }
        }
    }

    suspend fun submitEvidence(attemptId: String, campaignId: String, imageBase64: String, filename: String, mimeType: String) {
        val request = SubmitEvidenceRequest(imageBase64, filename, mimeType)
        val result = repository.submitEvidence(attemptId, request)
        if (result.isSuccess) {
            loadMyEvidences(campaignId)
        }
    }

    suspend fun approveEvidence(evidenceId: String, campaignId: String) {
        val result = repository.approveEvidence(evidenceId)
        if (result.isSuccess) {
            loadMyEvidences(campaignId)
        }
    }

    suspend fun rejectEvidence(evidenceId: String, campaignId: String, reason: String, comment: String?) {
        val result = repository.rejectEvidence(evidenceId, reason, comment)
        if (result.isSuccess) {
            loadMyEvidences(campaignId)
        }
    }
}
