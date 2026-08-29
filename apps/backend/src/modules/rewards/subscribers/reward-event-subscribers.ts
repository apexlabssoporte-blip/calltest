import { eventBus } from "../../../core/events/domain-event-bus.js";
import { RewardService } from "../service.js";
import { RewardSource } from "@calltest/shared-types";

export class RewardEventSubscribers {
  private static isInitialized = false;

  public static init(): void {
    if (this.isInitialized) {
      return;
    }

    // 1. Mission Validated -> Award Mission XP & Gold (Canonical source: missionId)
    eventBus.subscribe("mission.validated", async (event) => {
      try {
        const payload = event.payload as {
          attemptId: string;
          missionId: string;
          testerId: string;
          campaignId: string;
        };

        if (payload.testerId && (payload.missionId || payload.attemptId)) {
          const sourceId = payload.missionId || payload.attemptId;
          await RewardService.processReward({
            userId: payload.testerId,
            campaignId: payload.campaignId,
            missionId: payload.missionId,
            sourceType: RewardSource.MISSION_VALIDATED,
            sourceId,
            reason: "Mission validated successfully",
          });
        }
      } catch (err) {
        // Log & swallow to prevent event bus failure
        console.error("[RewardEventSubscribers] Error processing mission.validated reward:", err);
      }
    });

    // 2. Feedback Submitted -> Award Feedback XP & Gold (Canonical source: missionId)
    eventBus.subscribe("mission.feedback_submitted", async (event) => {
      try {
        const payload = event.payload as {
          feedbackId?: string;
          missionId?: string;
          testerId: string;
          campaignId?: string;
        };

        if (payload.testerId && (payload.missionId || payload.feedbackId)) {
          const sourceId = payload.missionId || payload.feedbackId!;
          await RewardService.processReward({
            userId: payload.testerId,
            campaignId: payload.campaignId,
            missionId: payload.missionId,
            sourceType: RewardSource.FEEDBACK_SUBMITTED,
            sourceId,
            reason: "Mission qualitative feedback submitted",
          });
        }
      } catch (err) {
        console.error("[RewardEventSubscribers] Error processing feedback reward:", err);
      }
    });

    // 3. Tester Participation Completed -> Award Participation XP & Gold (Canonical source: campaignId)
    eventBus.subscribe("tester.participation_completed", async (event) => {
      try {
        const payload = event.payload as {
          campaignId: string;
          testerId: string;
          campaignTesterId?: string;
          isReplacement?: boolean;
        };

        if (payload.testerId && payload.campaignId) {
          const sourceId = payload.campaignId;
          await RewardService.processReward({
            userId: payload.testerId,
            campaignId: payload.campaignId,
            sourceType: RewardSource.CAMPAIGN_PARTICIPATION_COMPLETED,
            sourceId,
            reason: payload.isReplacement
              ? "Replacement participation completed successfully"
              : "14-day closed testing participation completed successfully",
          });
        }
      } catch (err) {
        console.error("[RewardEventSubscribers] Error processing participation completed reward:", err);
      }
    });

    this.isInitialized = true;
  }
}
