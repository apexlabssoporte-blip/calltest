package com.calltest.tester.ui.reports

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.calltest.tester.data.models.CreateReportRequest
import com.calltest.tester.data.models.ReportCategory
import com.calltest.tester.data.models.ReportSeverity
import com.calltest.tester.data.models.TesterReportModel
import com.calltest.tester.data.repository.ReportRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class CreateReportUiState(
    val isLoading: Boolean = false,
    val title: String = "",
    val description: String = "",
    val category: ReportCategory = ReportCategory.FUNCTIONAL,
    val severity: ReportSeverity = ReportSeverity.MEDIUM,
    val missionId: String? = null,
    val evidenceIds: List<String> = emptyList(),
    val isSubmitted: Boolean = false,
    val createdReport: TesterReportModel? = null,
    val errorMessage: String? = null
)

class CreateReportViewModel(
    private val repository: ReportRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(CreateReportUiState())
    val uiState: StateFlow<CreateReportUiState> = _uiState.asStateFlow()

    fun onTitleChanged(newTitle: String) {
        _uiState.value = _uiState.value.copy(title = newTitle, errorMessage = null)
    }

    fun onDescriptionChanged(newDesc: String) {
        _uiState.value = _uiState.value.copy(description = newDesc, errorMessage = null)
    }

    fun onCategorySelected(category: ReportCategory) {
        _uiState.value = _uiState.value.copy(category = category)
    }

    fun onSeveritySelected(severity: ReportSeverity) {
        _uiState.value = _uiState.value.copy(severity = severity)
    }

    fun onMissionIdSet(missionId: String?) {
        _uiState.value = _uiState.value.copy(missionId = missionId)
    }

    fun addEvidenceId(evidenceId: String) {
        val current = _uiState.value.evidenceIds.toMutableList()
        if (!current.contains(evidenceId) && current.size < 5) {
            current.add(evidenceId)
            _uiState.value = _uiState.value.copy(evidenceIds = current)
        }
    }

    fun submitReport(campaignId: String) {
        val state = _uiState.value
        if (state.title.trim().length < 3) {
            _uiState.value = state.copy(errorMessage = "El título debe tener al menos 3 caracteres")
            return
        }
        if (state.description.trim().length < 10) {
            _uiState.value = state.copy(errorMessage = "La descripción debe tener al menos 10 caracteres")
            return
        }

        _uiState.value = state.copy(isLoading = true, errorMessage = null)

        viewModelScope.launch {
            val request = CreateReportRequest(
                title = state.title.trim(),
                description = state.description.trim(),
                category = state.category.name,
                severity = state.severity.name,
                missionId = state.missionId,
                evidenceIds = if (state.evidenceIds.isNotEmpty()) state.evidenceIds else null
            )

            val result = repository.submitReport(campaignId, request)
            result.fold(
                onSuccess = { report ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        isSubmitted = true,
                        createdReport = report
                    )
                },
                onFailure = { error ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        errorMessage = error.message ?: "Error al enviar el reporte"
                    )
                }
            )
        }
    }
}
