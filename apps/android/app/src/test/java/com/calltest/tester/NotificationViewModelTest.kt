package com.calltest.tester

import com.calltest.tester.data.models.NotificationItem
import com.calltest.tester.data.repository.InMemoryNotificationRepository
import com.calltest.tester.ui.notifications.NotificationViewModel
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class NotificationViewModelTest {

    private lateinit var repository: InMemoryNotificationRepository
    private lateinit var viewModel: NotificationViewModel

    private val sampleNotifications = listOf(
        NotificationItem(
            id = "notif-1",
            userId = "user-1",
            type = "TESTER_CAMPAIGN_AVAILABLE",
            title = "Nueva campaña disponible",
            body = "Tienes una nueva campaña de prueba disponible: Mi App.",
            status = "PENDING",
            priority = "NORMAL",
            channel = "IN_APP",
            readAt = null,
            createdAt = "2026-08-22T06:00:00.000Z"
        ),
        NotificationItem(
            id = "notif-2",
            userId = "user-1",
            type = "MISSION_COMPLETED",
            title = "Misión completada",
            body = "Has completado la misión satisfactoriamente.",
            status = "READ",
            priority = "NORMAL",
            channel = "IN_APP",
            readAt = "2026-08-22T06:10:00.000Z",
            createdAt = "2026-08-22T06:05:00.000Z"
        )
    )

    @Before
    fun setUp() {
        repository = InMemoryNotificationRepository(sampleNotifications)
        viewModel = NotificationViewModel(repository)
    }

    @Test
    fun loadNotifications_populatesUiStateCorrectly() = runBlocking {
        viewModel.loadNotifications()
        val state = viewModel.uiState.value

        assertFalse(state.isLoading)
        assertEquals(2, state.notifications.size)
        assertEquals(1, state.unreadCount)
    }

    @Test
    fun markAsRead_updatesNotificationAndUnreadCount() = runBlocking {
        viewModel.loadNotifications()
        assertEquals(1, viewModel.uiState.value.unreadCount)

        viewModel.markAsRead("notif-1")
        val state = viewModel.uiState.value

        assertEquals(0, state.unreadCount)
        assertTrue(state.notifications.first { it.id == "notif-1" }.isRead)
    }

    @Test
    fun markAllAsRead_marksAllItemsRead() = runBlocking {
        viewModel.loadNotifications()
        assertEquals(1, viewModel.uiState.value.unreadCount)

        viewModel.markAllAsRead()
        val state = viewModel.uiState.value

        assertEquals(0, state.unreadCount)
        assertTrue(state.notifications.all { it.isRead })
    }

    @Test
    fun toggleUnreadFilter_filtersOnlyUnreadItems() = runBlocking {
        viewModel.loadNotifications()
        assertEquals(2, viewModel.uiState.value.notifications.size)

        viewModel.toggleUnreadFilter()
        val state = viewModel.uiState.value

        assertTrue(state.filterUnreadOnly)
        assertEquals(1, state.notifications.size)
        assertEquals("notif-1", state.notifications[0].id)
    }
}
