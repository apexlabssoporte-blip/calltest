import { prisma } from "../../core/database/prisma.js";
import { env } from "../../core/config/env.js";
import { AttemptStatus } from "@calltest/shared-types";

export interface ActivitySignals {
  sessionCount: number;
  totalDurationMinutes: number;
  completedMissions: number;
  feedbackCount: number;
  bugReportCount: number;
  activeDays: number;
  daysEnrolled: number;
  isReplacement: boolean;
}

export class ActivityScoreService {
  /**
   * Calculates comprehensive multi-signal activity score (0-100) for a campaign tester.
   */
  public static async calculateTesterActivityScore(
    campaignTesterId: string,
  ): Promise<{ score: number; signals: ActivitySignals }> {
    const campaignTester = await prisma.campaignTester.findUnique({
      where: { id: campaignTesterId },
      include: {
        campaign: true,
      },
    });

    if (!campaignTester) {
      throw new Error(`Campaign tester ${campaignTesterId} not found`);
    }

    const now = new Date();
    const joinedAt = campaignTester.joinedAt;
    const msEnrolled = Math.max(1000 * 60 * 60 * 24, now.getTime() - joinedAt.getTime());
    const daysEnrolled = Math.max(1, Math.ceil(msEnrolled / (1000 * 60 * 60 * 24)));

    // 1. Sessions & Durations Signal
    const sessions = await prisma.sessionRecord.findMany({
      where: {
        campaignTesterId,
        isAnomalous: false,
      },
    });

    const sessionCount = sessions.length;
    const totalDurationSeconds = sessions.reduce(
      (acc, s) => acc + (s.durationSeconds || 60),
      0,
    );
    const totalDurationMinutes = Math.round(totalDurationSeconds / 60);

    // Target sessions: ~1-2 per day enrolled
    const expectedSessions = daysEnrolled * 1.5;
    const sessionScore = Math.min(1.0, sessionCount / Math.max(1, expectedSessions));

    // 2. Mission Activity Signal
    const completedAttempts = await prisma.missionAttempt.count({
      where: {
        campaignTesterId,
        status: AttemptStatus.VALIDATED,
      },
    });

    const totalCampaignMissions = await prisma.mission.count({
      where: {
        campaignId: campaignTester.campaignId,
      },
    });

    const missionScore =
      totalCampaignMissions > 0
        ? Math.min(1.0, completedAttempts / totalCampaignMissions)
        : completedAttempts > 0
          ? 1.0
          : 0.5;

    // 3. Feedback & Bug Reporting Signal
    const [difficultyFeedbacks, qualityFeedbacks, bugReports] = await Promise.all([
      prisma.missionDifficultyFeedback.count({ where: { campaignTesterId } }),
      prisma.missionQualityFeedback.count({ where: { campaignTesterId } }),
      prisma.bugReport.count({
        where: {
          campaignId: campaignTester.campaignId,
          testerId: campaignTester.testerId,
        },
      }),
    ]);

    const totalFeedback = difficultyFeedbacks + qualityFeedbacks;
    const feedbackScore = Math.min(1.0, (totalFeedback * 0.4 + bugReports * 0.6) / 2);

    // 4. Continuity (Active calendar days relative to tester's individual enrollment window)
    const distinctDaysSet = new Set<string>();
    for (const s of sessions) {
      distinctDaysSet.add(s.startedAt.toISOString().substring(0, 10));
    }
    const activeDays = distinctDaysSet.size;
    const continuityScore = Math.min(1.0, activeDays / Math.max(1, daysEnrolled * 0.7));

    // Weighted composite score (0 - 100)
    const compositeScore =
      sessionScore * env.ACTIVITY_SESSION_WEIGHT +
      missionScore * env.ACTIVITY_MISSION_WEIGHT +
      feedbackScore * env.ACTIVITY_FEEDBACK_WEIGHT +
      continuityScore * env.ACTIVITY_CONTINUITY_WEIGHT;

    const finalScore = Math.round(Math.min(100, Math.max(0, compositeScore * 100)) * 10) / 10;

    const signals: ActivitySignals = {
      sessionCount,
      totalDurationMinutes,
      completedMissions: completedAttempts,
      feedbackCount: totalFeedback,
      bugReportCount: bugReports,
      activeDays,
      daysEnrolled,
      isReplacement: campaignTester.isReplacement,
    };

    return {
      score: finalScore,
      signals,
    };
  }
}
