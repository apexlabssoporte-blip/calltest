import crypto from "crypto";
import { prisma } from "../../core/database/prisma.js";
import { ReportCategory, ReportClusterStatus, ReportSeverity } from "@calltest/shared-types";
import { MetricsService } from "../../core/metrics/metrics-service.js";

export class ReportClusteringService {
  /**
   * Generates a deterministic similarity fingerprint based on domain attributes and normalized title.
   */
  public static computeFingerprint(params: {
    campaignId: string;
    appId: string;
    missionId?: string | null;
    category: ReportCategory;
    severity: ReportSeverity;
    title: string;
  }): string {
    const normalizedMission = params.missionId || "general";
    const normalizedCategory = params.category.toUpperCase();
    const normalizedSeverity = params.severity.toUpperCase();

    // Normalize title: lowercase, remove non-alphanumeric, split into tokens, sort unique tokens
    const tokens = params.title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .sort();

    const normalizedTitleTokens = Array.from(new Set(tokens)).join("_");

    const rawSignature = `${params.campaignId}:${params.appId}:${normalizedMission}:${normalizedCategory}:${normalizedSeverity}:${normalizedTitleTokens}`;
    return crypto.createHash("sha256").update(rawSignature).digest("hex");
  }

  /**
   * Finds an existing cluster or creates a new one for the report.
   */
  public static async assignToCluster(params: {
    campaignId: string;
    appId: string;
    missionId?: string | null;
    category: ReportCategory;
    severity: ReportSeverity;
    title: string;
  }) {
    const fingerprint = this.computeFingerprint(params);

    const existingCluster = await prisma.reportCluster.findUnique({
      where: { fingerprint },
    });

    if (existingCluster) {
      const updated = await prisma.reportCluster.update({
        where: { id: existingCluster.id },
        data: {
          reportCount: { increment: 1 },
          lastReportedAt: new Date(),
        },
      });
      MetricsService.recordReportEvent("cluster_merged");
      return updated;
    }

    const newCluster = await prisma.reportCluster.create({
      data: {
        campaignId: params.campaignId,
        appId: params.appId,
        fingerprint,
        status: ReportClusterStatus.OPEN,
        reportCount: 1,
        firstReportedAt: new Date(),
        lastReportedAt: new Date(),
      },
    });

    MetricsService.recordReportEvent("cluster_created");
    return newCluster;
  }
}
