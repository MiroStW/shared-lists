import { sessionUserId } from "server/http/actorFromRequest";
import { errorResponse } from "server/http/errors";
import { createLiveEventStream } from "server/live/eventStream";

// Long-lived stream; it needs the Node.js runtime (in-process live bus) and
// must never be prerendered or cached.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Server-sent events with the list changes the signed-in user may see (KTD8).
export async function GET(request: Request) {
  let userId: string;
  try {
    userId = await sessionUserId();
  } catch (error) {
    return errorResponse(error, { context: "Error opening live events:" });
  }

  const stream = createLiveEventStream({ userId, signal: request.signal });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
