import { createHash } from "crypto";
import { prisma } from "../../core/database/prisma.js";
import {
  AiEscalationDecision,
  AuditAction,
  DeveloperReportDecision,
  HumanReportDecision,
  ReportCategory,
  ReportSeverity,
  ReportStatus,
  UserRole,
} from "@calltest/shared-types";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "../../core/errors/app-error.js";
import { AuditService } from "../../core/services/audit-service.js";
import { eventBus } from "../../core/events/domain-event-bus.js";
import { MetricsService } from "../../core/metrics/metrics-service.js";
import { env } from "../../core/config/env.js";
import { ReportClusteringService } from "./clustering.service.js";
import { ReportStateMachine } from "./state-machine.js";
import { AiReportSanitizer } from "./ai/ai-sanitizer.js";
import { AiBudgetService } from "./ai/ai-budget.service.js";
import { ReportAiProvider } from "./ai/ai-provider.interface.js";
import { GeminiReportAiProvider } from "./ai/gemini-ai-provider.js";
import { NoopReportAiProvider } from "./ai/noop-ai-provider.js";
import { ReportAiEscalationService } from "./ai/ReportAiEscalationService.js";

export class ReportService {
  private static aiProvider: ReportAiProvider = env.GEMINI_API_KEY
    ? new GeminiReportAiProvider()
    : new NoopReportAiProvider();

  public static setAiProvider(provider: ReportAiProvider): void {
    this.aiProvider = provider;
  }

  public static getAiProvider(): ReportAiProvider {
    return this.aiProvider;
  }

  /**
   * 1. Tester submits a bug report for an active campaign.
   */
  public static async createReport(
    testerId: string,
    campaignId: string,
    data: {
      title: string;
      description: string;
      category: ReportCategory;
      severity: ReportSeverity;
      missionId?: string;
      evidenceIds?: string[];
    },
    ipAddress?: string,
    userAgent?: string,
  ) {
    // 1. Verify Active Participation
    const participation = await prisma.campaignTester.findFirst({
      where: {
        campaignId,
        testerId,
        status: "ACTIVE",
      },
    });

    if (!participation) {
      throw new ForbiddenError(
        "You must be an active enrolled tester in this campaign to submit reports",
      );
    }

    // 2. Fetch Campaign & App
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { app: true },
    });

    if (!campaign) {
      throw new NotFoundError("Campaign not found");
    }

    // 3. Verify mission belongs to campaign if provided
    if (data.missionId) {
      const mission = await prisma.mission.findFirst({
        where: { id: data.missionId, campaignId },
      });
      if (!mission) {
        throw new BadRequestError("Specified mission does not belong to this campaign");
      }
    }

    // 4. Deterministic Clustering
    const cluster = await ReportClusteringService.assignToCluster({
      campaignId,
      appId: campaign.appId,
      missionId: data.missionId,
      category: data.category,
      severity: data.severity,
      title: data.title,
    });

    // 5. Create Report
    const report = await prisma.testerReport.create({
      data: {
        campaignId,
        appId: campaign.appId,
        testerId,
        missionId: data.missionId,
        clusterId: cluster.id,
        title: data.title,
        description: data.description,
        category: data.category,
        severity: data.severity,
        status: ReportStatus.SUBMITTED,
        evidenceIds: data.evidenceIds || [],
      },
    });

    // 6. Audit & Metrics
    await AuditService.log({
      userId: testerId,
      campaignId,
      action: AuditAction.REPORT_SUBMITTED,
      entityName: "TesterReport",
      entityId: report.id,
      changes: {
        title: data.title,
        category: data.category,
        severity: data.severity,
        clusterId: cluster.id,
      },
      ipAddress,
      userAgent,
    });

    MetricsService.recordReportEvent("submitted");

    await eventBus.publish({
      id: `evt_rep_${report.id}_${Date.now()}`,
      type: "report.submitted",
      occurredAt: new Date(),
      payload: {
        reportId: report.id,
        campaignId,
        appId: campaign.appId,
        testerId,
        category: data.category,
        severity: data.severity,
      },
    });

    return report;
  }

  /**
   * 2. Retrieve a report with IDOR security checks.
   */
  public static async getReportById(
    reportId: string,
    requesterUserId: string,
    requesterRole: UserRole,
  ) {
    const report = await prisma.testerReport.findUnique({
      where: { id: reportId },
      include: {
        app: true,
        campaign: true,
        cluster: true,
      },
    });

    if (!report) {
      throw new NotFoundError("Report not found");
    }

    // IDOR Check
    if (requesterRole === UserRole.ADMIN) {
      return report;
    }
    if (report.testerId === requesterUserId) {
      return report;
    }
    if (report.app.developerId === requesterUserId) {
      return report;
    }

    throw new ForbiddenError("Access denied to report");
  }

  /**
   * 3. Developer reviews reports for a campaign.
   */
  public static async listCampaignReports(
    campaignId: string,
    developerUserId: string,
    userRole: UserRole,
  ) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { app: true },
    });

    if (!campaign) {
      throw new NotFoundError("Campaign not found");
    }

    if (userRole !== UserRole.ADMIN && campaign.app.developerId !== developerUserId) {
      throw new ForbiddenError("Access denied to campaign reports");
    }

    const reports = await prisma.testerReport.findMany({
      where: { campaignId },
      orderBy: { createdAt: "desc" },
    });

    return { reports, total: reports.length };
  }

  /**
   * 4. Developer evaluates report (VALID, INVALID, NEEDS_MORE_EVIDENCE, ESCALATED).
   */
  public static async reviewReportByDeveloper(
    reportId: string,
    developerUserId: string,
    decision: DeveloperReportDecision,
    reason: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const report = await prisma.testerReport.findUnique({
      where: { id: reportId },
      include: { app: true, cluster: true },
    });

    if (!report) {
      throw new NotFoundError("Report not found");
    }

    if (report.app.developerId !== developerUserId) {
      throw new ForbiddenError("Only the developer of the application can review this report");
    }

    let targetStatus: ReportStatus;
    switch (decision) {
      case DeveloperReportDecision.VALID:
        targetStatus = ReportStatus.VALID;
        break;
      case DeveloperReportDecision.INVALID:
        targetStatus = ReportStatus.INVALID;
        break;
      case DeveloperReportDecision.NEEDS_MORE_EVIDENCE:
        targetStatus = ReportStatus.NEEDS_MORE_EVIDENCE;
        break;
      case DeveloperReportDecision.ESCALATED:
        targetStatus = ReportStatus.ESCALATED;
        break;
    }

    // Validate state transition
    ReportStateMachine.validateTransition(report.status as unknown as ReportStatus, targetStatus);

    const isResolved =
      targetStatus === ReportStatus.VALID || targetStatus === ReportStatus.INVALID;

    const updated = await prisma.testerReport.update({
      where: { id: reportId },
      data: {
        status: targetStatus,
        developerDecision: decision,
        developerDecisionReason: reason,
        developerId: developerUserId,
        resolvedAt: isResolved ? new Date() : null,
      },
    });

    await AuditService.log({
      userId: developerUserId,
      campaignId: report.campaignId,
      action:
        decision === DeveloperReportDecision.ESCALATED
          ? AuditAction.REPORT_ESCALATED
          : AuditAction.REPORT_DEVELOPER_REVIEWED,
      entityName: "TesterReport",
      entityId: reportId,
      changes: {
        previousStatus: report.status,
        newStatus: targetStatus,
        decision,
        reason,
      },
      ipAddress,
      userAgent,
    });

    if (decision === DeveloperReportDecision.VALID) {
      MetricsService.recordReportEvent("validated");
    } else if (decision === DeveloperReportDecision.INVALID) {
      MetricsService.recordReportEvent("rejected");
    } else if (decision === DeveloperReportDecision.ESCALATED) {
      MetricsService.recordReportEvent("escalated");
      // Trigger AI second opinion evaluation
      await this.executeAiReview(report.clusterId || report.id, reportId);
    }

    return updated;
  }

  /**
   * 5. Escalate a report (Developer or Admin).
   */
  public static async escalateReport(
    reportId: string,
    requesterUserId: string,
    requesterRole: UserRole,
    reason: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const report = await prisma.testerReport.findUnique({
      where: { id: reportId },
      include: { app: true },
    });

    if (!report) {
      throw new NotFoundError("Report not found");
    }

    if (requesterRole !== UserRole.ADMIN && report.app.developerId !== requesterUserId) {
      throw new ForbiddenError("Only the developer or admin can escalate this report");
    }

    ReportStateMachine.validateTransition(report.status as unknown as ReportStatus, ReportStatus.ESCALATED);

    const updated = await prisma.testerReport.update({
      where: { id: reportId },
      data: {
        status: ReportStatus.ESCALATED,
        developerDecision: DeveloperReportDecision.ESCALATED,
        developerDecisionReason: reason,
        developerId: requesterUserId,
      },
    });

    await AuditService.log({
      userId: requesterUserId,
      campaignId: report.campaignId,
      action: AuditAction.REPORT_ESCALATED,
      entityName: "TesterReport",
      entityId: reportId,
      changes: {
        previousStatus: report.status,
        newStatus: ReportStatus.ESCALATED,
        reason,
      },
      ipAddress,
      userAgent,
    });

    MetricsService.recordReportEvent("escalated");

    // Trigger AI second opinion evaluation
    await this.executeAiReview(report.clusterId || report.id, reportId);

    return updated;
  }

  /**
   * 6. AI Second Opinion Execution with Budget, Sanitization, and Idempotency Key.
   */
  /**
   * 6. AI Second Opinion Execution with Escalation Scoring, Cost Controls, Sanitization, and Deterministic Deduplication.
   */
  public static async executeAiReview(clusterId: string, reportId?: string) {
    // 1. Fetch context report & cluster
    const cluster = await prisma.reportCluster.findUnique({
      where: { id: clusterId },
    });

    const report = reportId
      ? await prisma.testerReport.findUnique({
          where: { id: reportId },
          include: { mission: true, app: true },
        })
      : await prisma.testerReport.findFirst({
          where: { clusterId },
          include: { mission: true, app: true },
        });

    if (!report) {
      return null;
    }

    const developerId = report.app?.developerId;

    // 2. Calculate AI Escalation Score (0-100) & Decision Tier
    const reportCount = cluster ? cluster.reportCount : 1;
    const hasValidEvidence = report.evidenceIds.length > 0;
    const consistentReproduction = reportCount >= 2 || (report.description?.toLowerCase().includes("repro") || report.category === ReportCategory.CRASH);
    const developerEscalated = report.developerDecision === DeveloperReportDecision.ESCALATED;
    const criticalMissionAffected = report.missionId != null && (report.severity === ReportSeverity.CRITICAL || report.severity === ReportSeverity.HIGH);
    const multipleDevicesOrOs = reportCount >= 2;

    const escalation = ReportAiEscalationService.calculateEscalationScore({
      reportCount,
      hasValidEvidence,
      consistentReproduction,
      developerEscalated,
      criticalMissionAffected,
      multipleDevicesOrOs,
    });

    MetricsService.recordAiEscalation(
      escalation.decision === AiEscalationDecision.HUMAN_REVIEW
        ? "human_review"
        : escalation.decision === AiEscalationDecision.COLLECT_MORE_EVIDENCE
        ? "collect_more_evidence"
        : escalation.decision === AiEscalationDecision.AI_CANDIDATE
        ? "candidate"
        : "executed"
    );

    await AuditService.log({
      action: AuditAction.REPORT_ESCALATED,
      entityName: "ReportCluster",
      entityId: clusterId,
      changes: {
        escalationScore: escalation.score,
        escalationDecision: escalation.decision,
        reasons: escalation.reasons,
      },
    });

    // Tier 0-39 (HUMAN_REVIEW) or 40-59 (COLLECT_MORE_EVIDENCE): Do NOT use Gemini
    if (
      escalation.decision === AiEscalationDecision.HUMAN_REVIEW ||
      escalation.decision === AiEscalationDecision.COLLECT_MORE_EVIDENCE
    ) {
      await this.transitionToHumanReview(report.id);
      return null;
    }

    // 3. Global AI Enabled & Provider Availability Check
    MetricsService.recordAiReviewEvent("requested");

    const isProviderReady = Boolean(env.GEMINI_API_KEY) || !(this.aiProvider instanceof NoopReportAiProvider);
    const isAiEnabled = (env.AI_ENABLED || env.REPORT_AI_ENABLED) && isProviderReady;

    if (!isAiEnabled) {
      MetricsService.recordAiReviewEvent("skipped");
      await this.transitionToHumanReview(report.id);
      return null;
    }

    // 4. Sanitize Payload (Zero-PII, max 10 reports, max 5 evidences)
    const sanitizedInput = AiReportSanitizer.sanitize({
      report: {
        title: report.title,
        description: report.description,
        category: report.category as unknown as ReportCategory,
        severity: report.severity as unknown as ReportSeverity,
      },
      mission: report.mission
        ? {
            title: report.mission.title,
            description: report.mission.description,
          }
        : null,
      evidenceCount: report.evidenceIds.length,
      cluster: {
        reportCount: cluster ? cluster.reportCount : 1,
        category: report.category as unknown as ReportCategory,
      },
    });

    // 5. Deterministic Deduplication Key (aiAnalysisKey)
    const clusterAlgorithmVersion = "v1";
    const promptVersion = "v1.1";
    const modelVersion = env.GEMINI_MODEL || "gemini-1.5-flash";
    const sanitizedHash = createHash("sha256")
      .update(JSON.stringify(sanitizedInput))
      .digest("hex")
      .slice(0, 16);

    const aiReviewKey = `${clusterId}:${clusterAlgorithmVersion}:${promptVersion}:${modelVersion}:${sanitizedHash}`;

    const existingAiReview = await prisma.aiReview.findUnique({
      where: { aiReviewKey },
    });

    if (existingAiReview) {
      MetricsService.recordAiReviewEvent("deduplicated");
      await this.transitionToHumanReview(report.id);
      return existingAiReview;
    }

    // 6. Budget, Cooldown, and Developer Rate Limit Check
    const budgetCheck = AiBudgetService.checkConsumption(developerId, clusterId);
    if (!budgetCheck.allowed) {
      if (budgetCheck.reason === "CLUSTER_IN_COOLDOWN") {
        MetricsService.recordAiReviewEvent("cooldown");
      } else if (
        budgetCheck.reason === "SYSTEM_DAILY_LIMIT_EXCEEDED" ||
        budgetCheck.reason === "SYSTEM_MONTHLY_LIMIT_EXCEEDED"
      ) {
        MetricsService.recordAiReviewEvent("budget_exhausted");
        await AuditService.log({
          action: AuditAction.AI_BUDGET_EXCEEDED,
          entityName: "ReportCluster",
          entityId: clusterId,
          changes: { reason: budgetCheck.reason },
        });
      } else {
        MetricsService.recordAiReviewEvent("rate_limited");
      }

      await this.transitionToHumanReview(report.id);
      return null;
    }

    // 7. Reserve Budget Slot
    AiBudgetService.reserve(developerId, clusterId);

    // 8. Execute Gemini Provider
    const startTime = Date.now();
    let analysis;
    try {
      analysis = await this.aiProvider.analyzeReportCluster(sanitizedInput);
    } catch {
      AiBudgetService.refund(developerId);
      MetricsService.recordAiReviewEvent("failed");
      await this.transitionToHumanReview(report.id);
      return null;
    }
    const latencyMs = Date.now() - startTime;

    // 9. Record Cooldown & Persist Review
    AiBudgetService.recordClusterReview(clusterId);

    let aiReview;
    try {
      aiReview = await prisma.aiReview.create({
        data: {
          clusterId,
          reportId: report.id,
          aiReviewKey,
          provider: "google-gemini",
          model: analysis.model,
          policyVersion: analysis.policyVersion,
          classification: analysis.classification,
          confidence: analysis.confidence,
          severityAssessment: analysis.severityAssessment,
          evidenceConsistency: analysis.evidenceConsistency,
          duplicateLikelihood: analysis.duplicateLikelihood,
          reasoningSummary: analysis.reasoningSummary,
          recommendedAction: analysis.recommendedAction,
          latencyMs,
          success: true,
        },
      });
    } catch (err: any) {
      if (err?.code === "P2002" || err?.message?.includes("Unique constraint")) {
        AiBudgetService.refund(developerId);
        const existing = await prisma.aiReview.findUnique({ where: { aiReviewKey } });
        if (existing) {
          await this.transitionToHumanReview(report.id);
          return existing;
        }
      }
      throw err;
    }

    MetricsService.recordAiReviewEvent("completed", latencyMs);

    await AuditService.log({
      action: AuditAction.AI_REVIEW_COMPLETED,
      entityName: "AiReview",
      entityId: aiReview.id,
      changes: {
        clusterId,
        classification: analysis.classification,
        confidence: analysis.confidence,
        recommendedAction: analysis.recommendedAction,
        latencyMs,
      },
    });

    // 10. Transition to Human Review (Gemini is non-authoritative advisory second opinion)
    await this.transitionToHumanReview(report.id);

    return aiReview;
  }

  private static async transitionToHumanReview(reportId: string): Promise<void> {
    const report = await prisma.testerReport.findUnique({ where: { id: reportId } });
    if (!report) return;

    if (
      report.status === ReportStatus.ESCALATED ||
      report.status === ReportStatus.AI_REVIEW_PENDING ||
      report.status === ReportStatus.AI_REVIEWED
    ) {
      await prisma.testerReport.update({
        where: { id: reportId },
        data: { status: ReportStatus.HUMAN_REVIEW },
      });
    }
  }

  /**
   * 7. Admin finalizes report decision (CONFIRMED, REJECTED, NEEDS_MORE_EVIDENCE).
   */
  public static async finalizeReportByHuman(
    reportId: string,
    adminUserId: string,
    decision: HumanReportDecision,
    reason: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const report = await prisma.testerReport.findUnique({ where: { id: reportId } });
    if (!report) {
      throw new NotFoundError("Report not found");
    }

    let targetStatus: ReportStatus;
    switch (decision) {
      case HumanReportDecision.CONFIRMED:
        targetStatus = ReportStatus.CONFIRMED;
        break;
      case HumanReportDecision.REJECTED:
        targetStatus = ReportStatus.REJECTED;
        break;
      case HumanReportDecision.NEEDS_MORE_EVIDENCE:
        targetStatus = ReportStatus.NEEDS_MORE_EVIDENCE;
        break;
    }

    ReportStateMachine.validateTransition(report.status as unknown as ReportStatus, targetStatus);

    const updated = await prisma.testerReport.update({
      where: { id: reportId },
      data: {
        status: targetStatus,
        resolvedAt: new Date(),
      },
    });

    await AuditService.log({
      userId: adminUserId,
      campaignId: report.campaignId,
      action: AuditAction.REPORT_HUMAN_FINALIZED,
      entityName: "TesterReport",
      entityId: reportId,
      changes: {
        previousStatus: report.status,
        newStatus: targetStatus,
        decision,
        reason,
        finalizedBy: adminUserId,
      },
      ipAddress,
      userAgent,
    });

    return updated;
  }

  /**
   * 8. Admin lists pending escalated reports.
   */
  public static async listPendingAdminReports() {
    const reports = await prisma.testerReport.findMany({
      where: {
        status: {
          in: [
            ReportStatus.ESCALATED,
            ReportStatus.AI_REVIEW_PENDING,
            ReportStatus.AI_REVIEWED,
            ReportStatus.HUMAN_REVIEW,
          ],
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return { reports, total: reports.length };
  }

  /**
   * 9. Admin lists report clusters.
   */
  public static async listReportClusters() {
    const clusters = await prisma.reportCluster.findMany({
      orderBy: { lastReportedAt: "desc" },
    });

    return { clusters, total: clusters.length };
  }

  /**
   * 10. Retrieve AI Review for a report/cluster (Developer or Admin).
   */
  public static async getAiReviewByReportId(
    reportId: string,
    requesterUserId: string,
    requesterRole: UserRole,
  ) {
    const report = await prisma.testerReport.findUnique({
      where: { id: reportId },
      include: { app: true },
    });

    if (!report) {
      throw new NotFoundError("Report not found");
    }

    if (requesterRole !== UserRole.ADMIN && report.app.developerId !== requesterUserId) {
      throw new ForbiddenError("Only developer or admin can inspect AI review");
    }

    const aiReview = await prisma.aiReview.findFirst({
      where: {
        OR: [{ reportId }, { clusterId: report.clusterId || "" }],
      },
      orderBy: { createdAt: "desc" },
    });

    if (!aiReview) {
      throw new NotFoundError("No AI review found for this report");
    }

    return aiReview;
  }
}
