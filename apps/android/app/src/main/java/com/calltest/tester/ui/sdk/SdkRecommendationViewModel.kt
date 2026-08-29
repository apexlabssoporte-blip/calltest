package com.calltest.tester.ui.sdk

import com.calltest.tester.data.models.AppModel
import com.calltest.tester.data.models.SdkComparisonData
import com.calltest.tester.data.models.SdkComparisonFeature
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

enum class SdkVerificationState {
    NOT_VERIFIED,
    DETECTED,
    OPERATIONAL
}

data class SdkRecommendationUiState(
    val selectedStatus: String = "NOT_CONFIGURED", // NOT_CONFIGURED, SDK_ENABLED, NO_SDK
    val isShowingExplanationDialog: Boolean = false,
    val isShowingComparisonDialog: Boolean = false,
    val isShowingNoSdkConfirmationDialog: Boolean = false,
    val isSdkIntegrationGuideVisible: Boolean = false,
    val sdkVerificationState: SdkVerificationState = SdkVerificationState.NOT_VERIFIED,
    val comparisonFeatures: List<SdkComparisonFeature> = SdkComparisonData.features,
    val isLoading: Boolean = false,
    val errorMessage: String? = null
)

interface AppSdkRepository {
    suspend fun updateAppSdkStatus(appId: String, status: String): Result<AppModel>
    suspend fun checkSdkStatus(appId: String): Result<SdkVerificationState>
}

class InMemoryAppSdkRepository : AppSdkRepository {
    private val appStore = mutableMapOf<String, AppModel>()

    override suspend fun updateAppSdkStatus(appId: String, status: String): Result<AppModel> {
        val current = appStore[appId] ?: AppModel(
            id = appId,
            developerId = "dev-1",
            name = "Test App",
            packageName = "com.test.app"
        )
        val updated = current.copy(
            sdkIntegrationStatus = status,
            hasCallTestSdk = (status == "SDK_ENABLED")
        )
        appStore[appId] = updated
        return Result.success(updated)
    }

    override suspend fun checkSdkStatus(appId: String): Result<SdkVerificationState> {
        val app = appStore[appId]
        return if (app?.hasCallTestSdk == true) {
            Result.success(SdkVerificationState.OPERATIONAL)
        } else {
            Result.success(SdkVerificationState.NOT_VERIFIED)
        }
    }
}

class SdkRecommendationViewModel(
    private val repository: AppSdkRepository = InMemoryAppSdkRepository()
) {
    private val _uiState = MutableStateFlow(SdkRecommendationUiState())
    val uiState: StateFlow<SdkRecommendationUiState> = _uiState.asStateFlow()

    fun onSelectSdkEnabled() {
        _uiState.update {
            it.copy(
                selectedStatus = "SDK_ENABLED",
                isSdkIntegrationGuideVisible = true,
                isShowingNoSdkConfirmationDialog = false
            )
        }
    }

    fun onSelectNoSdk() {
        // Show confirmation before committing NO_SDK choice
        _uiState.update {
            it.copy(
                isShowingNoSdkConfirmationDialog = true
            )
        }
    }

    fun confirmNoSdk() {
        _uiState.update {
            it.copy(
                selectedStatus = "NO_SDK",
                isShowingNoSdkConfirmationDialog = false,
                isSdkIntegrationGuideVisible = false
            )
        }
    }

    fun cancelNoSdkConfirmation() {
        _uiState.update {
            it.copy(
                isShowingNoSdkConfirmationDialog = false
            )
        }
    }

    fun openSdkExplanation() {
        _uiState.update { it.copy(isShowingExplanationDialog = true) }
    }

    fun closeSdkExplanation() {
        _uiState.update { it.copy(isShowingExplanationDialog = false) }
    }

    fun openComparisonTable() {
        _uiState.update { it.copy(isShowingComparisonDialog = true) }
    }

    fun closeComparisonTable() {
        _uiState.update { it.copy(isShowingComparisonDialog = false) }
    }

    suspend fun saveChoice(appId: String): Result<AppModel> {
        _uiState.update { it.copy(isLoading = true, errorMessage = null) }
        val status = _uiState.value.selectedStatus
        val result = repository.updateAppSdkStatus(appId, status)
        if (result.isSuccess) {
            _uiState.update { it.copy(isLoading = false) }
        } else {
            _uiState.update {
                it.copy(isLoading = false, errorMessage = result.exceptionOrNull()?.message)
            }
        }
        return result
    }

    suspend fun checkConnection(appId: String) {
        val result = repository.checkSdkStatus(appId)
        if (result.isSuccess) {
            _uiState.update {
                it.copy(sdkVerificationState = result.getOrDefault(SdkVerificationState.NOT_VERIFIED))
            }
        }
    }
}
