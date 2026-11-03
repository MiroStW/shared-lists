// In-process live bus (KTD8). The list service publishes one message per
// committed write; the SSE endpoint subscribes. Kept on globalThis so every
// route bundle in the process shares one instance, like src/db/prisma.ts.
export type ListChange = {
  listIds: string[];
  commandId: string | null;
  clientId: string | null;
  // Owners and contributors of the changed lists, computed at commit time.
  recipientUserIds: string[];
};

export type ListChangeListener = (change: ListChange) => void;

export class LiveBus {
  private listeners = new Set<ListChangeListener>();

  subscribe(listener: ListChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.unsubscribe(listener);
  }

  unsubscribe(listener: ListChangeListener) {
    this.listeners.delete(listener);
  }

  publish(change: ListChange) {
    for (const listener of [...this.listeners]) {
      try {
        listener(change);
      } catch (error) {
        console.error("Live bus listener failed:", error);
      }
    }
  }

  get subscriberCount() {
    return this.listeners.size;
  }
}

const globalForBus = globalThis as unknown as { liveBus?: LiveBus };

export const liveBus = globalForBus.liveBus ?? new LiveBus();
globalForBus.liveBus = liveBus;
