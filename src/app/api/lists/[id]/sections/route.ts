import { NextResponse } from "next/server";
import { actorFromRequest } from "server/http/actorFromRequest";
import { errorResponse } from "server/http/errors";
import { getListSections } from "server/lists/listService";

// A missing list answers 403 like a foreign one.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const listId = (await params).id;

  try {
    const actor = await actorFromRequest(request);
    return NextResponse.json(await getListSections(actor, listId));
  } catch (error) {
    return errorResponse(error, {
      context: "Error fetching sections:",
      notFoundStatus: 403,
    });
  }
}
