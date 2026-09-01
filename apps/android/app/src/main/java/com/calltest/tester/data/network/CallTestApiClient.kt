package com.calltest.tester.data.network

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

@Serializable
data class LoginRequest(val email: String, val passwordHash: String)

@Serializable
data class RegisterRequest(
    val email: String,
    val passwordHash: String,
    val name: String,
    val role: String = "BOTH"
)

@Serializable
data class AuthResponse(
    val accessToken: String,
    val refreshToken: String? = null,
    val user: UserDto? = null
)

@Serializable
data class UserDto(
    val id: String,
    val email: String,
    val name: String,
    val role: String,
    val tier: String? = "ACTIVE"
)

@Serializable
data class CreateAppRequest(
    val name: String,
    val packageName: String,
    val category: String,
    val description: String? = null,
    val playStoreUrl: String? = null,
    val googleGroupUrl: String? = null
)

@Serializable
data class AppDto(
    val id: String,
    val name: String,
    val packageName: String,
    val category: String,
    val description: String? = null,
    val playStoreUrl: String? = null,
    val googleGroupUrl: String? = null,
    val status: String? = "ACTIVE"
)

@Serializable
data class SubmitSessionRequest(
    val campaignId: String,
    val durationSeconds: Int,
    val isSdkMeasured: Boolean = true,
    val crashOccurred: Boolean = false,
    val feedbackText: String? = null,
    val rating: Int? = null
)

@Serializable
data class ApiResponse<T>(
    val success: Boolean = true,
    val data: T? = null,
    val error: String? = null
)

object CallTestApiClient {
    // URL en producción desplegada en Render con HTTPS
    var baseUrl: String = "https://calltest-api.onrender.com"

    val json = Json {
        ignoreUnknownKeys = true
        coerceInputValues = true
        encodeDefaults = true
    }

    suspend fun login(context: Context, email: String, password: String): Result<AuthResponse> = withContext(Dispatchers.IO) {
        try {
            val body = json.encodeToString(LoginRequest(email = email, passwordHash = password))
            val (code, responseText) = executeHttpRequest(
                endpoint = "/auth/login",
                method = "POST",
                jsonBody = body,
                token = null
            )
            if (code in 200..299) {
                val authRes = json.decodeFromString<AuthResponse>(responseText)
                SessionManager.saveSession(
                    context = context,
                    accessToken = authRes.accessToken,
                    refreshToken = authRes.refreshToken ?: "",
                    userId = authRes.user?.id ?: "usr-${System.currentTimeMillis()}",
                    email = authRes.user?.email ?: email,
                    name = authRes.user?.name ?: "Desarrollador CallTest",
                    role = authRes.user?.role ?: "BOTH"
                )
                Result.success(authRes)
            } else {
                Result.failure(Exception("Error de autenticación ($code): $responseText"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun register(context: Context, email: String, password: String, name: String): Result<AuthResponse> = withContext(Dispatchers.IO) {
        try {
            val body = json.encodeToString(RegisterRequest(email = email, passwordHash = password, name = name))
            val (code, responseText) = executeHttpRequest(
                endpoint = "/auth/register",
                method = "POST",
                jsonBody = body,
                token = null
            )
            if (code in 200..299) {
                val authRes = json.decodeFromString<AuthResponse>(responseText)
                SessionManager.saveSession(
                    context = context,
                    accessToken = authRes.accessToken,
                    refreshToken = authRes.refreshToken ?: "",
                    userId = authRes.user?.id ?: "usr-${System.currentTimeMillis()}",
                    email = authRes.user?.email ?: email,
                    name = authRes.user?.name ?: name,
                    role = authRes.user?.role ?: "BOTH"
                )
                Result.success(authRes)
            } else {
                Result.failure(Exception("Error al registrar cuenta ($code): $responseText"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getAvailableApps(context: Context): Result<List<AppDto>> = withContext(Dispatchers.IO) {
        try {
            val token = SessionManager.getAccessToken(context)
            val (code, responseText) = executeHttpRequest(
                endpoint = "/apps",
                method = "GET",
                jsonBody = null,
                token = token
            )
            if (code in 200..299) {
                val apps = json.decodeFromString<List<AppDto>>(responseText)
                Result.success(apps)
            } else {
                Result.failure(Exception("Error al cargar aplicaciones ($code): $responseText"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun createNewApp(
        context: Context,
        name: String,
        packageName: String,
        category: String,
        description: String,
        playStoreUrl: String? = null,
        googleGroupUrl: String? = null
    ): Result<AppDto> = withContext(Dispatchers.IO) {
        try {
            val token = SessionManager.getAccessToken(context)
            val body = json.encodeToString(
                CreateAppRequest(
                    name = name,
                    packageName = packageName,
                    category = category,
                    description = description,
                    playStoreUrl = playStoreUrl,
                    googleGroupUrl = googleGroupUrl
                )
            )
            val (code, responseText) = executeHttpRequest(
                endpoint = "/apps",
                method = "POST",
                jsonBody = body,
                token = token
            )
            if (code in 200..299) {
                val created = json.decodeFromString<AppDto>(responseText)
                Result.success(created)
            } else {
                Result.failure(Exception("Error al publicar app ($code): $responseText"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun deleteAccount(context: Context): Result<Boolean> = withContext(Dispatchers.IO) {
        try {
            val token = SessionManager.getAccessToken(context)
            if (token.isNullOrBlank()) {
                SessionManager.clearSession(context)
                return@withContext Result.success(true)
            }
            val (code, responseText) = executeHttpRequest(
                endpoint = "/me/account",
                method = "DELETE",
                jsonBody = null,
                token = token
            )
            if (code in 200..299 || code == 401 || code == 404) {
                SessionManager.clearSession(context)
                Result.success(true)
            } else {
                Result.failure(Exception("Error $code: $responseText"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun submitTestingSession(
        context: Context,
        campaignId: String,
        durationSeconds: Int,
        rating: Int? = null,
        feedback: String? = null
    ): Result<Boolean> = withContext(Dispatchers.IO) {
        try {
            val token = SessionManager.getAccessToken(context)
            val body = json.encodeToString(
                SubmitSessionRequest(
                    campaignId = campaignId,
                    durationSeconds = durationSeconds,
                    isSdkMeasured = true,
                    rating = rating,
                    feedbackText = feedback
                )
            )
            val (code, responseText) = executeHttpRequest(
                endpoint = "/activity/sessions",
                method = "POST",
                jsonBody = body,
                token = token
            )
            if (code in 200..299) {
                Result.success(true)
            } else {
                Result.failure(Exception("Error al registrar sesión ($code): $responseText"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private fun executeHttpRequest(
        endpoint: String,
        method: String,
        jsonBody: String?,
        token: String?
    ): Pair<Int, String> {
        val url = URL(baseUrl + endpoint)
        val connection = url.openConnection() as HttpURLConnection
        connection.requestMethod = method
        connection.connectTimeout = 8000
        connection.readTimeout = 8000
        connection.setRequestProperty("Content-Type", "application/json; charset=UTF-8")
        connection.setRequestProperty("Accept", "application/json")

        if (!token.isNullOrBlank()) {
            connection.setRequestProperty("Authorization", "Bearer $token")
        }

        if (!jsonBody.isNullOrBlank() && (method == "POST" || method == "PUT" || method == "PATCH")) {
            connection.doOutput = true
            OutputStreamWriter(connection.outputStream, "UTF-8").use { writer ->
                writer.write(jsonBody)
                writer.flush()
            }
        }

        val statusCode = connection.responseCode
        val inputStream = if (statusCode in 200..299) {
            connection.inputStream
        } else {
            connection.errorStream ?: connection.inputStream
        }

        val reader = BufferedReader(InputStreamReader(inputStream, "UTF-8"))
        val response = reader.use { it.readText() }
        return Pair(statusCode, response)
    }
}
