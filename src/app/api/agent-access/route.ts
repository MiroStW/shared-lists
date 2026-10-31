import { NextResponse } from "next/server";
import {
  createAgentAccess,
  listAgentAccesses,
  listHouseholdCandidates,
} from "server/auth/agentAccess";
import { sessionUserId } from "server/http/actorFromRequest";
import { errorResponse } from "server/http/errors";

// Agent accesses are managed with the web session only; an agent token can
// never list or create accesses.

export async function GET() {
  try {
    const userId = await sessionUserId();
    const [accesses, candidates] = await Promise.all([
      listAgentAccesses(userId),
      listHouseholdCandidates(userId),
    ]);
    return NextResponse.json({ accesses, candidates });
  } catch (error) {
    return errorResponse(error, { context: "Error fetching agent accesses:" });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await sessionUserId();
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    return NextResponse.json(await createAgentAccess(userId, body), {
      status: 201,
    });
  } catch (error) {
    return errorResponse(error, { context: "Error creating agent access:" });
  }
}
