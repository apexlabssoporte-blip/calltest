package com.calltest.tester.data.models

import kotlinx.serialization.Serializable

@Serializable
data class NotificationItem(
    val id: String,
    val userId: String,
    val type: String,
    val title: String,
    val body: String,
    val status: String,
    val priority: String,
    val channel: String,
    val readAt: String? = null,
    val createdAt: String
) {
    val isRead: Boolean
        get() = readAt != null || status == "READ"
}

@Serializable
data class PaginatedNotifications(
    val notifications: List<NotificationItem>,
    val total: Int,
    val page: Int,
    val limit: Int,
    val totalPages: Int
)

@Serializable
data class UnreadCountResponse(
    val unreadCount: Int
)

@Serializable
data class NotificationPreferences(
    val campaignNotifications: Boolean = true,
    val missionNotifications: Boolean = true,
    val trustNotifications: Boolean = true,
    val systemNotifications: Boolean = true,
    val pushNotifications: Boolean = true
)

@Serializable
data class MarkReadResponse(
    val id: String,
    val status: String,
    val readAt: String
)

@Serializable
data class MarkAllReadResponse(
    val count: Int,
    val markedAt: String
)
