package com.calltest.tester.i18n

enum class AppLanguage(val code: String, val displayName: String, val flag: String) {
    ES("es", "Español", "🇪🇸"),
    EN("en", "English", "🇺🇸"),
    PT("pt", "Português", "🇧🇷"),
    FR("fr", "Français", "🇫🇷"),
    DE("de", "Deutsch", "🇩🇪"),
    IT("it", "Italiano", "🇮🇹"),
    JA("ja", "日本語", "🇯🇵"),
    KO("ko", "한국어", "🇰🇷"),
    ZH("zh", "中文", "🇨🇳"),
    RU("ru", "Русский", "🇷🇺");

    companion object {
        fun fromCode(code: String): AppLanguage =
            entries.find { it.code.equals(code, ignoreCase = true) } ?: EN
    }
}
