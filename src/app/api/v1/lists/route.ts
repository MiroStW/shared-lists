import { NextResponse } from "next/server";
import { v1ActorFromRequest, v1ErrorResponse } from "server/apiAuth";
import { getVisibleLists } from "server/lists/listService";

// The owner's visible, active lists, like the web app's list sidebar.
export async function GET(request: Request) {
  try {
    const actor = await v1ActorFromRequest(request);
    const lists = await getVisibleLists(actor);
    return NextResponse.json({
      lists: lists.map(({ id, name }) => ({ id, name })),
    });
  } catch (error) {
    return v1ErrorResponse(error, {
      context: "Fetch lists error:",
      notFound: "List not found",
    });
  }
}
