import { NextResponse } from "next/server";
import { v1ActorFromRequest, v1ErrorResponse } from "server/apiAuth";
import { CommandContext } from "server/lists/command";
import { updateItem, type ItemChanges } from "server/lists/itemService";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await v1ActorFromRequest(request);
    const itemId = (await params).id;
    const body = await request.json();

    const changes: ItemChanges = {};
    if (typeof body?.completed === "boolean") {
      changes.completed = body.completed;
    }
    if (typeof body?.name === "string") {
      changes.name = body.name;
    }

    if (Object.keys(changes).length === 0) {
      return NextResponse.json(
        { error: "No valid update fields provided" },
        { status: 400 },
      );
    }

    const item = await updateItem(new CommandContext(actor), itemId, changes);
    return NextResponse.json({ item });
  } catch (error) {
    return v1ErrorResponse(error, {
      context: "PATCH item error:",
      notFound: "Item not found",
    });
  }
}
