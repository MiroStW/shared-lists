import { liveBus, type LiveBus } from "./bus";

// Proxies between the tailnet and the app may close idle connections, so the
// stream sends a comment line this often (KTD8).
const HEARTBEAT_MS = 25_000;

type LiveEventStreamOptions = {
  userId: string;
  // Aborts when the client disconnects.
  signal: AbortSignal;
  bus?: LiveBus;
  heartbeatMs?: number;
};

// A server-sent event stream of the bus messages addressed to one user. Each
// message becomes `event: change` with the changed list ids and the browser
// tab that caused it. The bus listener and the heartbeat are removed when the
// reader cancels or the request aborts.
export const createLiveEventStream = ({
  userId,
  signal,
  bus = liveBus,
  heartbeatMs = HEARTBEAT_MS,
}: LiveEventStreamOptions) => {
  const encoder = new TextEncoder();
  let stop = () => {};

  return new ReadableStream<Uint8Array>({
    start(controller) {
      let stopped = false;

      const send = (text: string) => {
        if (stopped) return;
        try {
          controller.enqueue(encoder.encode(text));
        } catch {
          stop();
        }
      };

      const unsubscribe = bus.subscribe((change) => {
        if (!change.recipientUserIds.includes(userId)) return;
        const data = JSON.stringify({
          listIds: change.listIds,
          clientId: change.clientId,
        });
        send(`event: change\ndata: ${data}\n\n`);
      });
      const heartbeat = setInterval(() => send(": heartbeat\n\n"), heartbeatMs);

      const onAbort = () => {
        stop();
        try {
          controller.close();
        } catch {
          // Already closed or cancelled.
        }
      };

      stop = () => {
        if (stopped) return;
        stopped = true;
        clearInterval(heartbeat);
        unsubscribe();
        signal.removeEventListener("abort", onAbort);
      };

      signal.addEventListener("abort", onAbort);
      if (signal.aborted) {
        onAbort();
        return;
      }
      // Flushes the headers so the browser fires `open` right away.
      send(": connected\n\n");
    },
    cancel() {
      stop();
    },
  });
};
