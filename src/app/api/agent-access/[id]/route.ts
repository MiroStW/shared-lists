import { NextResponse } from "next/server";
import { revokeAgentAccess } from "server/auth/agentAccess";
import { sessionUserId } from "server/http/actorFromRequest";
import { errorResponse } from "server/http/errors";

// Revokes one of the signed-in user's agent accesses.
export async function DELETE(
  _request: Request,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await sessionUserId();
    const { id } = await props.params;
    return NextResponse.json({ access: await revokeAgentAccess(userId, id) });
  } catch (error) {
    return errorResponse(error, { context: "Error revoking agent access:" });
  }
}
