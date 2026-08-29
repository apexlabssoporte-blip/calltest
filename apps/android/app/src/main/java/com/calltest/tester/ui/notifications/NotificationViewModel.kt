package com.calltest.tester.ui.notifications

import com.calltest.tester.data.models.NotificationItem
import com.calltest.tester.data.repository.NotificationRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

data class NotificationsUiState(
    val isLoading: Boolean = false,
    val notifications: List<NotificationItem> = emptyList(),
    val unreadCount: Int = 0,
    val filterUnreadOnly: Boolean = false,
    val errorMessage: String? = null
)

class NotificationViewModel(
    private val repository: NotificationRepository
) {
    private val _uiState = MutableStateFlow(NotificationsUiState())
    val uiState: StateFlow<NotificationsUiState> = _uiState.asStateFlow()

    suspend fun loadNotifications(unreadOnly: Boolean = _uiState.value.filterUnreadOnly) {
        _uiState.update { it.copy(isLoading = true, errorMessage = null, filterUnreadOnly = unreadOnly) }

        val notifResult = repository.getNotifications(page = 1, limit = 50, unreadOnly = unreadOnly)
        val unreadResult = repository.getUnreadCount()

        if (notifResult.isSuccess && unreadResult.isSuccess) {
            _uiState.update {
                it.copy(
                    isLoading = false,
                    notifications = notifResult.getOrThrow().notifications,
                    unreadCount = unreadResult.getOrThrow()
                )
            }
        } else {
            _uiState.update {
                it.copy(
                    isLoading = false,
                    errorMessage = notifResult.exceptionOrNull()?.message ?: "Error al cargar notificaciones"
                )
            }
        }
    }

    suspend fun markAsRead(id: String) {
        val result = repository.markAsRead(id)
        if (result.isSuccess) {
            loadNotifications()
        }
    }

    suspend fun markAllAsRead() {
        val result = repository.markAllAsRead()
        if (result.isSuccess) {
            loadNotifications()
        }
    }

    suspend fun toggleUnreadFilter() {
        val nextFilter = !_uiState.value.filterUnreadOnly
        loadNotifications(nextFilter)
    }
}
