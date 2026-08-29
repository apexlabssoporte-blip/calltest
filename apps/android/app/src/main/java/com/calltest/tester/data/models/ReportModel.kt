package com.calltest.tester.data.models

import kotlinx.serialization.Serializable

@Serializable
enum class ReportCategory {
    FUNCTIONAL,
    UI,
    PERFORMANCE,
    CRASH,
    INSTALLATION,
    ACCESSIBILITY,
    SECURITY,
    OTHER
}

@Serializable
enum class ReportSeverity {
    LOW,
    MEDIUM,
    HIGH,
    CRITICAL
}

@Serializable
data class TesterReportModel(
    val id: String,
    val campaignId: String,
    val appId: String,
    val testerId: String,
    val missionId: String? = null,
    val clusterId: String? = null,
    val title: String,
    val description: String,
    val category: String,
    val severity: String,
    val status: String,
    val developerDecision: String? = null,
    val developerDecisionReason: String? = null,
    val evidenceIds: List<String> = emptyList(),
    val createdAt: String,
    val updatedAt: String,
    val resolvedAt: String? = null
) {
    /**
     * Maps backend technical state to privacy-safe user-facing state.
     * Hides AI reasoning, internal fraud/trust signals, and internal prompts.
     */
    fun toUserFacingStatus(): String {
        return when (status) {
            "SUBMITTED" -> "RECIBIDO"
            "DEVELOPER_REVIEW", "ESCALATED", "AI_REVIEW_PENDING", "AI_REVIEWED", "HUMAN_REVIEW" -> "EN_REVISION"
            "NEEDS_MORE_EVIDENCE" -> "SE_NECESITA_MAS_EVIDENCIA"
            "VALID", "CONFIRMED" -> "VALIDADO"
            "INVALID", "REJECTED" -> "NO_VALIDADO"
            else -> "RESUELTO"
        }
    }
}

@Serializable
data class CreateReportRequest(
    val title: String,
    val description: String,
    val category: String,
    val severity: String,
    val missionId: String? = null,
    val evidenceIds: List<String>? = null
)

@Serializable
data class ReportListResponse(
    val reports: List<TesterReportModel>,
    val total: Int
)
