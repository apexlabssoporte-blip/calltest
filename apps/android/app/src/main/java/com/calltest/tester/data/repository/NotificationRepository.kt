package com.calltest.tester.data.repository

import com.calltest.tester.data.models.NotificationItem
import com.calltest.tester.data.models.NotificationPreferences
import com.calltest.tester.data.models.PaginatedNotifications

interface NotificationRepository {
    suspend fun getNotifications(page: Int = 1, limit: Int = 20, unreadOnly: Boolean = false): Result<PaginatedNotifications>
    suspend fun getUnreadCount(): Result<Int>
    suspend fun markAsRead(id: String): Result<Boolean>
    suspend fun markAllAsRead(): Result<Int>
    suspend fun getPreferences(): Result<NotificationPreferences>
    suspend fun updatePreferences(preferences: NotificationPreferences): Result<NotificationPreferences>
    suspend fun registerDeviceToken(token: String): Result<Boolean>
}

class InMemoryNotificationRepository(
    initialNotifications: List<NotificationItem> = emptyList()
) : NotificationRepository {
    private val notifications = initialNotifications.toMutableList()
    private var preferences = NotificationPreferences()

    override suspend fun getNotifications(
        page: Int,
        limit: Int,
        unreadOnly: Boolean
    ): Result<PaginatedNotifications> {
        val filtered = if (unreadOnly) {
            notifications.filter { !it.isRead }
        } else {
            notifications
        }
        val skip = (page - 1) * limit
        val paginatedList = filtered.drop(skip).take(limit)
        val total = filtered.size
        val totalPages = if (total == 0) 1 else (total + limit - 1) / limit

        return Result.success(
            PaginatedNotifications(
                notifications = paginatedList,
                total = total,
                page = page,
                limit = limit,
                totalPages = totalPages
            )
        )
    }

    override suspend fun getUnreadCount(): Result<Int> {
        val count = notifications.count { !it.isRead }
        return Result.success(count)
    }

    override suspend fun markAsRead(id: String): Result<Boolean> {
        val index = notifications.indexOfFirst { it.id == id }
        if (index != -1) {
            val item = notifications[index]
            notifications[index] = item.copy(status = "READ", readAt = "2026-08-22T06:00:00Z")
            return Result.success(true)
        }
        return Result.failure(NoSuchElementException("Notification not found"))
    }

    override suspend fun markAllAsRead(): Result<Int> {
        var updated = 0
        for (i in notifications.indices) {
            if (!notifications[i].isRead) {
                notifications[i] = notifications[i].copy(status = "READ", readAt = "2026-08-22T06:00:00Z")
                updated++
            }
        }
        return Result.success(updated)
    }

    override suspend fun getPreferences(): Result<NotificationPreferences> {
        return Result.success(preferences)
    }

    override suspend fun updatePreferences(preferences: NotificationPreferences): Result<NotificationPreferences> {
        this.preferences = preferences
        return Result.success(this.preferences)
    }

    override suspend fun registerDeviceToken(token: String): Result<Boolean> {
        return Result.success(true)
    }
}
