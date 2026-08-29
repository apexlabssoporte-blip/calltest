import { ActivityState } from "@calltest/shared-types";
import { ActivityScoreService, ActivitySignals } from "./score-service.js";
import { prisma } from "../../core/database/prisma.js";

export class ActivityClassificationService {
  /**
   * Classifies a tester into ACTIVE, LOW_ACTIVITY, or ABANDONED based on multi-signal evaluation
   * and individual enrollment timeline (replacement-aware).
   */
  public static async classifyTester(
    campaignTesterId: string,
  ): Promise<{ state: ActivityState; score: number; signals: ActivitySignals }> {
    const { score, signals } = await ActivityScoreService.calculateTesterActivityScore(
      campaignTesterId,
    );

    // Retrieve most recent session timestamp
    const latestSession = await prisma.sessionRecord.findFirst({
      where: { campaignTesterId },
      orderBy: { startedAt: "desc" },
    });

    const now = new Date();
    const daysSinceLastActivity = latestSession
      ? (now.getTime() - latestSession.startedAt.getTime()) / (1000 * 60 * 60 * 24)
      : signals.daysEnrolled;

    let state: ActivityState;

    if (score >= 40 || (signals.completedMissions >= 1 && daysSinceLastActivity <= 3)) {
      state = ActivityState.ACTIVE;
    } else if (score >= 20 || (signals.sessionCount >= 1 && daysSinceLastActivity <= 5)) {
      state = ActivityState.LOW_ACTIVITY;
    } else {
      // If no activity for long duration and very low overall participation relative to enrollment
      state = ActivityState.ABANDONED;
    }

    return {
      state,
      score,
      signals,
    };
  }
}
