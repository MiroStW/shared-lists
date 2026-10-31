import { NextResponse } from "next/server";
import { actorFromRequest } from "server/http/actorFromRequest";
import { errorResponse } from "server/http/errors";
import { CommandContext } from "server/lists/command";
import { reorderItems } from "server/lists/itemService";

type ReorderItem = { id: string; order: number; sectionID?: string | null };

// Sets order and section of items of this list. A missing list, or an item
// that is not in this list, answers 403.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const listId = (await params).id;

  try {
    const actor = await actorFromRequest(request);
    const { items } = await request.json();

    if (!Array.isArray(items)) {
      return NextResponse.json(
        { error: "Items array is required" },
        { status: 400 },
      );
    }

    await reorderItems(
      new CommandContext(actor),
      listId,
      items.map((item: ReorderItem) => ({
        id: item.id,
        order: item.order,
        sectionId: item.sectionID,
      })),
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error, {
      context: "Error reordering items:",
      notFoundStatus: 403,
    });
  }
}
