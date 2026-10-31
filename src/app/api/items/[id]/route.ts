import { NextResponse } from "next/server";
import { actorFromRequest } from "server/http/actorFromRequest";
import { errorResponse } from "server/http/errors";
import { CommandContext } from "server/lists/command";
import { deleteItem, updateItem } from "server/lists/itemService";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const itemId = (await params).id;

  try {
    const actor = await actorFromRequest(request);
    const { name, completed, description, order, sectionID, listID } =
      await request.json();

    // Moving an item to another list is not supported; the web client never
    // sends listID.
    if (listID !== undefined) {
      return NextResponse.json(
        { error: "listID cannot be changed" },
        { status: 400 },
      );
    }

    const item = await updateItem(new CommandContext(actor), itemId, {
      name,
      completed,
      description,
      order,
      sectionId: sectionID,
    });
    return NextResponse.json(item);
  } catch (error) {
    return errorResponse(error, { context: "Error updating item:" });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const itemId = (await params).id;

  try {
    const actor = await actorFromRequest(request);
    await deleteItem(new CommandContext(actor), itemId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error, { context: "Error deleting item:" });
  }
}
