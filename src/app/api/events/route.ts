import { NextResponse } from "next/server";
import { getServerSession } from "auth/getServerSession";
import { createLiveEventStream } from "server/live/eventStream";

// Long-lived stream; it needs the Node.js runtime (in-process live bus) and
// must never be prerendered or cached.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Server-sent events with the list changes the signed-in user may see (KTD8).
export async function GET(request: Request) {
  const session = await getServerSession();
  const userId = session.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
