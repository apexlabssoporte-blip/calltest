package com.calltest.sdk.network

interface NetworkAdapter {
    suspend fun post(url: String, headers: Map<String, String>, body: String): NetworkResponse
}

data class NetworkResponse(
    val statusCode: Int,
    val body: String,
    val isSuccess: Boolean = statusCode in 200..299
)

class NoOpNetworkAdapter : NetworkAdapter {
    override suspend fun post(url: String, headers: Map<String, String>, body: String): NetworkResponse {
        return NetworkResponse(statusCode = 200, body = "{\"status\":\"ok\"}")
    }
}
