import { eventBus, DomainEvent } from "../../../core/events/domain-event-bus.js";
import { NotificationType } from "@calltest/shared-types";
import { NotificationService } from "../service.js";

export class NotificationEventSubscribers {
  public static init(): () => void {
    const unsubscribers: (() => void)[] = [];

    // 1. Campaign Health & Target Reached
    unsubscribers.push(
      eventBus.subscribe("campaign.health.changed", async (event: DomainEvent<any>) => {
        const { developerId, campaignId, appName, campaignName, activeTesters, campaignRisk } = event.payload;

        if (activeTesters === 12) {
          await NotificationService.dispatch({
            userId: developerId,
            type: NotificationType.CAMPAIGN_TARGET_REACHED,
            params: { campaignId, appName, campaignName },
            sourceEventId: event.id,
          });
        }

        if (campaignRisk === "WARNING") {
          await NotificationService.dispatch({
            userId: developerId,
            type: NotificationType.CAMPAIGN_HEALTH_WARNING,
            params: { campaignId, appName, campaignName },
            sourceEventId: event.id,
          });
        } else if (campaignRisk === "CRITICAL") {
          await NotificationService.dispatch({
            userId: developerId,
            type: NotificationType.CAMPAIGN_HEALTH_CRITICAL,
            params: { campaignId, appName, campaignName },
            sourceEventId: event.id,
          });
        }
      }),
    );

    // 2. New Tester Assigned
    unsubscribers.push(
      eventBus.subscribe("campaign.tester.assigned", async (event: DomainEvent<any>) => {
        const { developerId, testerId, appName, campaignName, campaignId } = event.payload;

        // Notify Developer
        if (developerId) {
          await NotificationService.dispatch({
            userId: developerId,
            type: NotificationType.NEW_TESTER_ASSIGNED,
            params: { campaignName, appName },
            sourceEventId: event.id,
          });
        }

        // Notify Tester
        if (testerId) {
          await NotificationService.dispatch({
            userId: testerId,
            type: NotificationType.TESTER_CAMPAIGN_AVAILABLE,
            params: { campaignId, appName, campaignName },
            sourceEventId: event.id,
          });
        }
      }),
    );

    // 3. Tester Low Activity
    unsubscribers.push(
      eventBus.subscribe("campaign.tester.low_activity", async (event: DomainEvent<any>) => {
        const { developerId, campaignName, appName } = event.payload;
        if (developerId) {
          await NotificationService.dispatch({
            userId: developerId,
            type: NotificationType.TESTER_LOW_ACTIVITY,
            params: { campaignName, appName },
            sourceEventId: event.id,
          });
        }
      }),
    );

    // 4. Tester Abandoned
    unsubscribers.push(
      eventBus.subscribe("campaign.tester.abandoned", async (event: DomainEvent<any>) => {
        const { developerId, campaignName, appName } = event.payload;
        if (developerId) {
          await NotificationService.dispatch({
            userId: developerId,
            type: NotificationType.TESTER_ABANDONED,
            params: { campaignName, appName },
            sourceEventId: event.id,
          });
        }
      }),
    );

    // 5. Replacement Assigned
    const handleReplacementAssigned = async (event: DomainEvent<any>) => {
      const { developerId, replacementTesterId, testerId, campaignName, appName, campaignId } = event.payload;
      const targetTesterId = replacementTesterId || testerId;
      if (developerId) {
        await NotificationService.dispatch({
          userId: developerId,
          type: NotificationType.TESTER_REPLACEMENT_ASSIGNED,
          params: { campaignName, appName },
          sourceEventId: event.id,
        });
      }

      if (targetTesterId) {
        await NotificationService.dispatch({
          userId: targetTesterId,
          type: NotificationType.TESTER_CAMPAIGN_AVAILABLE,
          params: { campaignId, appName, campaignName, isReplacement: true },
          sourceEventId: event.id,
        });
      }
    };

    unsubscribers.push(
      eventBus.subscribe("campaign.replacement.assigned", handleReplacementAssigned),
      eventBus.subscribe("campaign.tester.replacement_assigned", handleReplacementAssigned),
    );

    // 6. Mission Completed
    unsubscribers.push(
      eventBus.subscribe("mission.completed", async (event: DomainEvent<any>) => {
        const { testerId, missionTitle } = event.payload;
        if (testerId) {
          await NotificationService.dispatch({
            userId: testerId,
            type: NotificationType.MISSION_COMPLETED,
            params: { missionTitle },
            sourceEventId: event.id,
          });
        }
      }),
    );

    // 7. Trust Updated
    unsubscribers.push(
      eventBus.subscribe("trust.changed", async (event: DomainEvent<any>) => {
        const { userId, trustRank } = event.payload;
        if (userId) {
          await NotificationService.dispatch({
            userId,
            type: NotificationType.TRUST_UPDATED,
            params: { trustRank },
            sourceEventId: event.id,
          });
        }
      }),
    );

    // 8. Reputation Updated
    unsubscribers.push(
      eventBus.subscribe("reputation.changed", async (event: DomainEvent<any>) => {
        const { userId, reputationStatus } = event.payload;
        if (userId) {
          await NotificationService.dispatch({
            userId,
            type: NotificationType.REPUTATION_UPDATED,
            params: { reputationStatus },
            sourceEventId: event.id,
          });
        }
      }),
    );

    // 9. Evidence Submitted -> Notify Developer
    unsubscribers.push(
      eventBus.subscribe("evidence.submitted", async (event: DomainEvent<any>) => {
        const { developerId, campaignId } = event.payload;
        if (developerId) {
          await NotificationService.dispatch({
            userId: developerId,
            type: NotificationType.EVIDENCE_SUBMITTED,
            params: { campaignId },
            sourceEventId: event.id,
          });
        }
      }),
    );

    // 10. Evidence Approved -> Notify Tester
    unsubscribers.push(
      eventBus.subscribe("evidence.approved", async (event: DomainEvent<any>) => {
        const { testerId, missionId } = event.payload;
        if (testerId) {
          await NotificationService.dispatch({
            userId: testerId,
            type: NotificationType.EVIDENCE_APPROVED,
            params: { missionTitle: "Misión completada con evidencia", missionId },
            sourceEventId: event.id,
          });
        }
      }),
    );

    // 11. Evidence Rejected -> Notify Tester
    unsubscribers.push(
      eventBus.subscribe("evidence.rejected", async (event: DomainEvent<any>) => {
        const { testerId, reason, comment, missionId } = event.payload;
        if (testerId) {
          await NotificationService.dispatch({
            userId: testerId,
            type: NotificationType.EVIDENCE_REJECTED,
            params: {
              missionTitle: "Evidencia de misión",
              reason: comment || reason,
              missionId,
            },
            sourceEventId: event.id,
          });
        }
      }),
    );

    // 12. Campaign Completed -> Notify Developer
    unsubscribers.push(
      eventBus.subscribe("campaign.completed", async (event: DomainEvent<any>) => {
        const { developerId, appName, campaignName } = event.payload;
        if (developerId) {
          await NotificationService.dispatch({
            userId: developerId,
            type: NotificationType.CAMPAIGN_COMPLETED,
            params: { appName, campaignName },
            sourceEventId: event.id,
          });
        }
      }),
    );

    // 13. Tester Participation Completed -> Notify Tester
    unsubscribers.push(
      eventBus.subscribe("tester.participation_completed", async (event: DomainEvent<any>) => {
        const { testerId, appName, campaignName } = event.payload;
        if (testerId) {
          await NotificationService.dispatch({
            userId: testerId,
            type: NotificationType.CAMPAIGN_PARTICIPATION_THANK_YOU,
            params: { appName, campaignName },
            sourceEventId: event.id,
          });
        }
      }),
    );

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }
}
