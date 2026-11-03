import { NextResponse } from "next/server";
import { actorFromRequest } from "server/http/actorFromRequest";
import { errorResponse } from "server/http/errors";
import { CommandContext } from "server/lists/command";
import { deleteList, updateList } from "server/lists/listService";

type Params = { params: Promise<{ id: string }> };

// Only the owner may rename, archive or delete a list. A missing list answers
// 403 like a foreign one.
export async function PATCH(request: Request, { params }: Params) {
  const listId = (await params).id;

  try {
    const actor = await actorFromRequest(request);
    const { name, isArchived } = await request.json();

    const list = await updateList(new CommandContext(actor), listId, {
      name,
      isArchived,
    });
    return NextResponse.json(list);
  } catch (error) {
    return errorResponse(error, {
      context: "Error updating list:",
      notFoundStatus: 403,
    });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const listId = (await params).id;

  try {
    const actor = await actorFromRequest(request);
    await deleteList(new CommandContext(actor), listId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error, {
      context: "Error deleting list:",
      notFoundStatus: 403,
    });
  }
}
