import { describe, expect, test } from "bun:test";
import { LiveBus, liveBus, type ListChange } from "server/live/bus";

const change: ListChange = {
  listIds: ["list-1"],
  commandId: null,
  clientId: null,
  recipientUserIds: ["user-1"],
};

describe("live bus", () => {
  test("is a process-wide singleton on globalThis", () => {
    expect((globalThis as unknown as { liveBus: LiveBus }).liveBus).toBe(
      liveBus,
    );
  });

  test("delivers to subscribers, isolates failing listeners and counts subscribers", () => {
    const bus = new LiveBus();
    const received: ListChange[] = [];
    const unsubscribeFailing = bus.subscribe(() => {
      throw new Error("listener failed");
    });
    const unsubscribe = bus.subscribe((message) => received.push(message));
    expect(bus.subscriberCount).toBe(2);

    const originalError = console.error;
    console.error = () => {};
    try {
      bus.publish(change);
    } finally {
      console.error = originalError;
    }
    expect(received).toEqual([change]);

    unsubscribe();
    unsubscribeFailing();
    expect(bus.subscriberCount).toBe(0);
    bus.publish(change);
    expect(received).toHaveLength(1);
  });
});
