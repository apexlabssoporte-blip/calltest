package com.calltest.tester.data.models

import kotlinx.serialization.Serializable

@Serializable
data class AppModel(
    val id: String,
    val developerId: String,
    val name: String,
    val packageName: String,
    val platform: String = "ANDROID",
    val status: String = "DRAFT",
    val hasCallTestSdk: Boolean = false,
    val sdkIntegrationStatus: String = "NOT_CONFIGURED", // NOT_CONFIGURED, SDK_ENABLED, NO_SDK
    val description: String? = null,
    val playStoreUrl: String? = null,
    val googleGroupUrl: String? = null,
    val apiKey: String = "",
    val createdAt: String = "",
    val updatedAt: String = ""
)

@Serializable
data class UpdateAppSdkStatusRequest(
    val sdkIntegrationStatus: String
)

@Serializable
data class SdkComparisonFeature(
    val feature: String,
    val withSdk: String,
    val withoutSdk: String
)

object SdkComparisonData {
    val features = listOf(
        SdkComparisonFeature(
            feature = "Instalación",
            withSdk = "Automática",
            withoutSdk = "Declaración / evidencia"
        ),
        SdkComparisonFeature(
            feature = "Primera apertura",
            withSdk = "Automática",
            withoutSdk = "Evidencia / señales disponibles"
        ),
        SdkComparisonFeature(
            feature = "Actividad",
            withSdk = "Más señales automáticas",
            withoutSdk = "Señales disponibles limitadas"
        ),
        SdkComparisonFeature(
            feature = "Misiones automáticas",
            withSdk = "Más posibilidades",
            withoutSdk = "Más limitadas"
        ),
        SdkComparisonFeature(
            feature = "Capturas",
            withSdk = "Menos necesarias",
            withoutSdk = "Más frecuentes"
        ),
        SdkComparisonFeature(
            feature = "Revisión manual",
            withSdk = "Menor",
            withoutSdk = "Mayor"
        ),
        SdkComparisonFeature(
            feature = "Verificación",
            withSdk = "Más rápida",
            withoutSdk = "Puede requerir revisión"
        ),
        SdkComparisonFeature(
            feature = "Integración",
            withSdk = "Requiere SDK",
            withoutSdk = "No requiere SDK"
        ),
        SdkComparisonFeature(
            feature = "Campaña",
            withSdk = "Compatible",
            withoutSdk = "Compatible"
        )
    )
}
