import { NextResponse } from "next/server";
import { actorFromRequest } from "server/http/actorFromRequest";
import { errorResponse } from "server/http/errors";
import { CommandContext } from "server/lists/command";
import { createItem } from "server/lists/itemService";
import { getListItems } from "server/lists/listService";

type Params = { params: Promise<{ id: string }> };

// A missing list answers 403 like a foreign one.
export async function GET(request: Request, { params }: Params) {
  const listId = (await params).id;

  try {
    const actor = await actorFromRequest(request);
    return NextResponse.json(await getListItems(actor, listId));
  } catch (error) {
    return errorResponse(error, {
      context: "Error fetching items:",
      notFoundStatus: 403,
    });
  }
}

export async function POST(request: Request, { params }: Params) {
  const listId = (await params).id;

  try {
    const actor = await actorFromRequest(request);
    const { name, completed, sectionID, order } = await request.json();

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const item = await createItem(new CommandContext(actor), {
      listId,
      name,
      completed: completed ?? false,
      sectionId: sectionID || null,
      order: order || 0,
    });
    return NextResponse.json(item);
  } catch (error) {
    return errorResponse(error, {
      context: "Error creating item:",
      notFoundStatus: 403,
    });
  }
}
