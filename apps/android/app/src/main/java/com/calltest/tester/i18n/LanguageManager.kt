package com.calltest.tester.i18n

import android.content.Context
import android.content.SharedPreferences
import androidx.compose.runtime.compositionLocalOf
import java.util.Locale

object LanguageManager {
    private const val PREFS_NAME = "calltest_language_prefs"
    private const val KEY_LANGUAGE = "selected_language_code"

    fun getSavedLanguage(context: Context): AppLanguage {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val savedCode = prefs.getString(KEY_LANGUAGE, null)
        return if (savedCode != null) {
            AppLanguage.fromCode(savedCode)
        } else {
            // Auto detect from system
            val systemLang = Locale.getDefault().language
            AppLanguage.fromCode(systemLang)
        }
    }

    fun saveLanguage(context: Context, language: AppLanguage) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putString(KEY_LANGUAGE, language.code).apply()
    }
}

val LocalAppStrings = compositionLocalOf {
    CallTestTranslations.SPANISH
}

val LocalAppLanguage = compositionLocalOf {
    AppLanguage.ES
}
