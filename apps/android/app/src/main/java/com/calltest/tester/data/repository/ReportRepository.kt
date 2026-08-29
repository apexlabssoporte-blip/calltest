package com.calltest.tester.data.repository

import com.calltest.tester.data.models.CreateReportRequest
import com.calltest.tester.data.models.TesterReportModel

interface ReportRepository {
    suspend fun submitReport(
        campaignId: String,
        request: CreateReportRequest
    ): Result<TesterReportModel>

    suspend fun getReportById(reportId: String): Result<TesterReportModel>

    suspend fun getCampaignReports(campaignId: String): Result<List<TesterReportModel>>
}

class FakeReportRepository : ReportRepository {
    private val reports = mutableListOf<TesterReportModel>()

    override suspend fun submitReport(
        campaignId: String,
        request: CreateReportRequest
    ): Result<TesterReportModel> {
        val newReport = TesterReportModel(
            id = "rep-${System.currentTimeMillis()}",
            campaignId = campaignId,
            appId = "app-1",
            testerId = "tester-me",
            missionId = request.missionId,
            clusterId = "cluster-1",
            title = request.title,
            description = request.description,
            category = request.category,
            severity = request.severity,
            status = "SUBMITTED",
            evidenceIds = request.evidenceIds ?: emptyList(),
            createdAt = "2026-08-23T12:00:00Z",
            updatedAt = "2026-08-23T12:00:00Z"
        )
        reports.add(newReport)
        return Result.success(newReport)
    }

    override suspend fun getReportById(reportId: String): Result<TesterReportModel> {
        val found = reports.find { it.id == reportId }
        return if (found != null) {
            Result.success(found)
        } else {
            Result.failure(Exception("Report not found"))
        }
    }

    override suspend fun getCampaignReports(campaignId: String): Result<List<TesterReportModel>> {
        val filtered = reports.filter { it.campaignId == campaignId }
        return Result.success(filtered)
    }
}
