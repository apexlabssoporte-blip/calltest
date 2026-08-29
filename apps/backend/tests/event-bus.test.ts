import { describe, it, expect, vi } from "vitest";
import {
  DomainEventBus,
  DomainEvent,
} from "../src/core/events/domain-event-bus.js";

describe("DomainEventBus", () => {
  it("should publish events to subscribed handlers", async () => {
    const bus = new DomainEventBus();
    const handler = vi.fn();

    bus.subscribe("TEST_EVENT", handler);

    const event: DomainEvent<{ message: string }> = {
      id: "1",
      type: "TEST_EVENT",
      occurredAt: new Date(),
      payload: { message: "hello" },
    };

    await bus.publish(event);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(event);
  });

  it("should allow unsubscribing from events", async () => {
    const bus = new DomainEventBus();
    const handler = vi.fn();

    const unsubscribe = bus.subscribe("TEST_EVENT", handler);
    unsubscribe();

    const event: DomainEvent<{ message: string }> = {
      id: "2",
      type: "TEST_EVENT",
      occurredAt: new Date(),
      payload: { message: "hello again" },
    };

    await bus.publish(event);

    expect(handler).not.toHaveBeenCalled();
  });

  it("should not fail publishing when a handler throws an error", async () => {
    const bus = new DomainEventBus();
    const faultyHandler = vi
      .fn()
      .mockRejectedValue(new Error("Handler failure"));
    const successHandler = vi.fn();

    bus.subscribe("ERROR_EVENT", faultyHandler);
    bus.subscribe("ERROR_EVENT", successHandler);

    const event: DomainEvent = {
      id: "3",
      type: "ERROR_EVENT",
      occurredAt: new Date(),
      payload: {},
    };

    await expect(bus.publish(event)).resolves.not.toThrow();
    expect(faultyHandler).toHaveBeenCalledTimes(1);
    expect(successHandler).toHaveBeenCalledTimes(1);
  });
});
