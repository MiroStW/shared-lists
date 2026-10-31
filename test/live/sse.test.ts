import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { User } from "@prisma/client";
import * as eventsRoute from "app/api/events/route";
import * as listItemsRoute from "app/api/lists/[id]/items/route";
import { LiveBus, liveBus, type ListChange } from "server/live/bus";
import { createLiveEventStream } from "server/live/eventStream";
import { resetDatabase } from "../setup/db";
import { setSessionUser } from "../setup/session";
import * as fixtures from "../lists/fixtures";

// The SSE route is called directly, the way Next.js calls it, and its body is
// read as a stream.

const decoder = new TextDecoder();
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type SseBlock = { event?: string; data?: string; comment?: string };

// Reads server-sent event blocks from a byte stream. One read stays pending
// across timeouts, so no chunk is lost between calls.
const sseReader = (stream: ReadableStream<Uint8Array>) => {
  const reader = stream.getReader();
  let buffer = "";
  let pending: ReturnType<typeof reader.read> | null = null;

  const nextBlock = async (timeoutMs: number): Promise<SseBlock | null> => {
    const deadline = Date.now() + timeoutMs;
    while (true) {
      const end = buffer.indexOf("\n\n");
      if (end !== -1) {
        const raw = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        const block: SseBlock = {};
        for (const line of raw.split("\n")) {
          if (line.startsWith(":")) block.comment = line.slice(1).trim();
          else if (line.startsWith("event: ")) block.event = line.slice(7);
          else if (line.startsWith("data: ")) block.data = line.slice(6);
        }
        return block;
      }
      const remaining = deadline - Date.now();
      if (remaining <= 0) return null;
      pending ??= reader.read();
      const result = await Promise.race([pending, sleep(remaining).then(() => null)]);
      if (result === null) return null;
      pending = null;
      if (result.done) return null;
      buffer += decoder.decode(result.value, { stream: true });
    }
  };

  // The next `change` event, skipping comments such as heartbeats.
  const nextChange = async (timeoutMs = 1000) => {
    const deadline = Date.now() + timeoutMs;
    while (true) {
      const block = await nextBlock(Math.max(deadline - Date.now(), 0));
      if (!block) return null;
      if (block.event === "change") return JSON.parse(block.data ?? "null");
    }
  };

  return { reader, nextBlock, nextChange };
};

const signIn = (user: User) =>
  setSessionUser({ id: user.id, email: user.email, name: user.name });

const openEvents = async (signal?: AbortSignal) =>
  eventsRoute.GET(new Request("http://localhost/api/events", { signal }));

const change = (overrides: Partial<ListChange>): ListChange => ({
  listIds: ["list-1"],
  commandId: "command-1",
  clientId: null,
  recipientUserIds: [],
  ...overrides,
});

describe("GET /api/events", () => {
  let user: User;
  let baseline: number;
  const cleanups: (() => Promise<void> | void)[] = [];

  beforeEach(async () => {
    await resetDatabase();
    user = await fixtures.createUser("sse-user");
    baseline = liveBus.subscriberCount;
  });

  afterEach(async () => {
    for (const cleanup of cleanups.splice(0)) await cleanup();
  });

  const openAs = async (who: User, signal?: AbortSignal) => {
    signIn(who);
    const response = await openEvents(signal);
    expect(response.status).toBe(200);
    const stream = sseReader(response.body!);
    cleanups.push(() => stream.reader.cancel().catch(() => {}));
    return { response, stream };
  };

  test("answers 401 without a session", async () => {
    const response = await openEvents();
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
    expect(liveBus.subscriberCount).toBe(baseline);
  });

  test("streams with SSE headers", async () => {
    const { response } = await openAs(user);
    expect(response.headers.get("content-type")).toStartWith("text/event-stream");
    expect(response.headers.get("cache-control")).toContain("no-cache");
    expect(response.headers.get("cache-control")).toContain("no-transform");
    expect(response.headers.get("connection")).toBe("keep-alive");
    expect(response.headers.get("x-accel-buffering")).toBe("no");
  });

  test("delivers changes addressed to the user and nothing else", async () => {
    const { stream } = await openAs(user);

    liveBus.publish(
      change({ listIds: ["foreign"], clientId: "x", recipientUserIds: ["someone-else"] }),
    );
    expect(await stream.nextChange(100)).toBeNull();

    liveBus.publish(
      change({ listIds: ["foreign"], recipientUserIds: ["someone-else"] }),
    );
    liveBus.publish(
      change({
        listIds: ["own-list"],
        clientId: "tab-1",
        recipientUserIds: ["someone-else", user.id],
      }),
    );
    expect(await stream.nextChange()).toEqual({
      listIds: ["own-list"],
      clientId: "tab-1",
    });
    expect(await stream.nextChange(100)).toBeNull();
  });

  test("delivers a write by another member through the list service", async () => {
    const other = await fixtures.createUser("sse-other");
    const list = await fixtures.createList(user.id, { contributorIds: [other.id] });
    const { stream } = await openAs(user);

    signIn(other);
    const response = await listItemsRoute.POST(
      new Request(`http://localhost/api/lists/${list.id}/items`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-sl-client": "tab-2" },
        body: JSON.stringify({ name: "Bread" }),
      }),
      { params: Promise.resolve({ id: list.id }) },
    );
    expect(response.status).toBe(200);

    expect(await stream.nextChange()).toEqual({
      listIds: [list.id],
      clientId: "tab-2",
    });
  });

  test("removes the listener when the reader cancels", async () => {
    const { stream } = await openAs(user);
    expect(liveBus.subscriberCount).toBe(baseline + 1);

    await stream.reader.cancel();
    expect(liveBus.subscriberCount).toBe(baseline);
  });

  test("removes the listener when the request is aborted", async () => {
    const controller = new AbortController();
    const { stream } = await openAs(user, controller.signal);
    expect(liveBus.subscriberCount).toBe(baseline + 1);

    controller.abort();
    expect(liveBus.subscriberCount).toBe(baseline);
    liveBus.publish(change({ recipientUserIds: [user.id] }));
    expect(await stream.nextChange(100)).toBeNull();
  });
});

describe("createLiveEventStream", () => {
  test("sends a heartbeat comment at the given interval", async () => {
    const bus = new LiveBus();
    const stream = sseReader(
      createLiveEventStream({
        userId: "user-1",
        signal: new AbortController().signal,
        bus,
        heartbeatMs: 10,
      }),
    );

    const blocks: SseBlock[] = [];
    for (let i = 0; i < 3; i++) {
      const block = await stream.nextBlock(500);
      if (block) blocks.push(block);
    }
    expect(blocks.map((block) => block.comment)).toContain("heartbeat");

    await stream.reader.cancel();
    expect(bus.subscriberCount).toBe(0);
  });
});
