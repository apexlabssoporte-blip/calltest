package com.calltest.tester.data.network

import android.content.Context
import android.content.SharedPreferences

object SessionManager {
    private const val PREFS_NAME = "calltest_auth_session"
    private const val KEY_ACCESS_TOKEN = "jwt_access_token"
    private const val KEY_REFRESH_TOKEN = "jwt_refresh_token"
    private const val KEY_USER_ID = "authenticated_user_id"
    private const val KEY_USER_EMAIL = "authenticated_user_email"
    private const val KEY_USER_NAME = "authenticated_user_name"
    private const val KEY_USER_ROLE = "authenticated_user_role"

    fun saveSession(
        context: Context,
        accessToken: String,
        refreshToken: String = "",
        userId: String = "",
        email: String = "",
        name: String = "",
        role: String = "BOTH"
    ) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit()
            .putString(KEY_ACCESS_TOKEN, accessToken)
            .putString(KEY_REFRESH_TOKEN, refreshToken)
            .putString(KEY_USER_ID, userId)
            .putString(KEY_USER_EMAIL, email)
            .putString(KEY_USER_NAME, name)
            .putString(KEY_USER_ROLE, role)
            .apply()
    }

    fun getAccessToken(context: Context): String? {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        return prefs.getString(KEY_ACCESS_TOKEN, null)
    }

    fun getUserEmail(context: Context): String {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        return prefs.getString(KEY_USER_EMAIL, "tester.user@calltest.dev") ?: "tester.user@calltest.dev"
    }

    fun getUserName(context: Context): String {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        return prefs.getString(KEY_USER_NAME, "Tester Verificado") ?: "Tester Verificado"
    }

    fun getUserId(context: Context): String {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        return prefs.getString(KEY_USER_ID, "usr-v1-verified") ?: "usr-v1-verified"
    }

    fun isLoggedIn(context: Context): Boolean {
        val token = getAccessToken(context)
        return !token.isNullOrBlank()
    }

    private const val KEY_SELECTED_ROLE = "user_selected_role"
    private const val KEY_ONBOARDING_COMPLETED = "onboarding_role_completed"

    fun isOnboardingCompleted(context: Context): Boolean {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        return prefs.getBoolean(KEY_ONBOARDING_COMPLETED, false)
    }

    fun setOnboardingCompleted(context: Context, role: String) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit()
            .putBoolean(KEY_ONBOARDING_COMPLETED, true)
            .putString(KEY_SELECTED_ROLE, role)
            .apply()
    }

    fun getSelectedRole(context: Context): String {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        return prefs.getString(KEY_SELECTED_ROLE, "DEVELOPER") ?: "DEVELOPER"
    }

    fun updateSelectedRole(context: Context, role: String) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit()
            .putString(KEY_SELECTED_ROLE, role)
            .apply()
    }

    fun clearSession(context: Context) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().clear().apply()
    }
}
