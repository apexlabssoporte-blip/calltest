package com.calltest.sdk

import kotlinx.serialization.Serializable

@Serializable
data class CallTestConfig(
    val apiKey: String,
    val endpointUrl: String = "https://api.calltest.app",
    val autoSyncEvents: Boolean = true,
    val maxQueueSize: Int = 500,
    val syncIntervalMs: Long = 30000L
)
