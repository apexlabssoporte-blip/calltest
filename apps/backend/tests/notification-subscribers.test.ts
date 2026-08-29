import { describe, it, expect, vi, beforeEach } from "vitest";
import { eventBus } from "../src/core/events/domain-event-bus.js";
import { NotificationEventSubscribers } from "../src/modules/notifications/subscribers/domain-event-subscribers.js";
import { NotificationService } from "../src/modules/notifications/service.js";
import { NotificationType } from "@calltest/shared-types";

describe("Domain Event Subscribers & Notification Triggering", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    eventBus.clear();
    NotificationEventSubscribers.init();
  });

  const devId = "d0000000-0000-0000-0000-000000000001";
  const testerId = "t0000000-0000-0000-0000-000000000001";

  it("campaign.health.changed with 12 active testers: should dispatch CAMPAIGN_TARGET_REACHED to Developer", async () => {
    const dispatchSpy = vi.spyOn(NotificationService, "dispatch").mockResolvedValue({} as any);

    await eventBus.publish({
      id: "evt-health-1",
      type: "campaign.health.changed",
      occurredAt: new Date(),
      payload: {
        developerId: devId,
        campaignId: "camp-1",
        appName: "SuperApp",
        campaignName: "Testing Sprint",
        activeTesters: 12,
        campaignRisk: "HEALTHY",
      },
    });

    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: devId,
        type: NotificationType.CAMPAIGN_TARGET_REACHED,
        params: expect.objectContaining({
          appName: "SuperApp",
        }),
      }),
    );
  });

  it("campaign.health.changed with WARNING / CRITICAL risk: should dispatch appropriate health warnings", async () => {
    const dispatchSpy = vi.spyOn(NotificationService, "dispatch").mockResolvedValue({} as any);

    await eventBus.publish({
      id: "evt-health-warn",
      type: "campaign.health.changed",
      occurredAt: new Date(),
      payload: {
        developerId: devId,
        campaignId: "camp-1",
        appName: "SuperApp",
        campaignName: "Testing Sprint",
        activeTesters: 10,
        campaignRisk: "WARNING",
      },
    });

    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: devId,
        type: NotificationType.CAMPAIGN_HEALTH_WARNING,
      }),
    );

    await eventBus.publish({
      id: "evt-health-crit",
      type: "campaign.health.changed",
      occurredAt: new Date(),
      payload: {
        developerId: devId,
        campaignId: "camp-1",
        appName: "SuperApp",
        campaignName: "Testing Sprint",
        activeTesters: 8,
        campaignRisk: "CRITICAL",
      },
    });

    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: devId,
        type: NotificationType.CAMPAIGN_HEALTH_CRITICAL,
      }),
    );
  });

  it("campaign.tester.low_activity vs abandoned: should dispatch distinct notifications", async () => {
    const dispatchSpy = vi.spyOn(NotificationService, "dispatch").mockResolvedValue({} as any);

    await eventBus.publish({
      id: "evt-low-act",
      type: "campaign.tester.low_activity",
      occurredAt: new Date(),
      payload: {
        developerId: devId,
        campaignName: "Testing Sprint",
        appName: "SuperApp",
      },
    });

    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: devId,
        type: NotificationType.TESTER_LOW_ACTIVITY,
      }),
    );

    await eventBus.publish({
      id: "evt-abandoned",
      type: "campaign.tester.abandoned",
      occurredAt: new Date(),
      payload: {
        developerId: devId,
        campaignName: "Testing Sprint",
        appName: "SuperApp",
      },
    });

    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: devId,
        type: NotificationType.TESTER_ABANDONED,
      }),
    );
  });

  it("campaign.tester.replacement_assigned: should notify developer and replacement tester", async () => {
    const dispatchSpy = vi.spyOn(NotificationService, "dispatch").mockResolvedValue({} as any);

    await eventBus.publish({
      id: "evt-replacement",
      type: "campaign.tester.replacement_assigned",
      occurredAt: new Date(),
      payload: {
        developerId: devId,
        testerId,
        campaignName: "Testing Sprint",
        appName: "SuperApp",
        campaignId: "camp-1",
      },
    });

    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: devId,
        type: NotificationType.TESTER_REPLACEMENT_ASSIGNED,
      }),
    );

    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: testerId,
        type: NotificationType.TESTER_CAMPAIGN_AVAILABLE,
        params: expect.objectContaining({
          isReplacement: true,
        }),
      }),
    );
  });

  it("trust.changed & reputation.changed: should notify tester safely without security leaks", async () => {
    const dispatchSpy = vi.spyOn(NotificationService, "dispatch").mockResolvedValue({} as any);

    await eventBus.publish({
      id: "evt-trust",
      type: "trust.changed",
      occurredAt: new Date(),
      payload: {
        userId: testerId,
        trustRank: "RELIABLE",
      },
    });

    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: testerId,
        type: NotificationType.TRUST_UPDATED,
        params: { trustRank: "RELIABLE" },
      }),
    );

    await eventBus.publish({
      id: "evt-rep",
      type: "reputation.changed",
      occurredAt: new Date(),
      payload: {
        userId: testerId,
        reputationStatus: "WATCH",
      },
    });

    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: testerId,
        type: NotificationType.REPUTATION_UPDATED,
        params: { reputationStatus: "WATCH" },
      }),
    );
  });
});
