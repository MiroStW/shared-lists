import { NextResponse } from "next/server";
import { v1ActorFromRequest, v1ErrorResponse } from "server/apiAuth";
import { CommandContext } from "server/lists/command";
import { createItem } from "server/lists/itemService";
import { getListItems } from "server/lists/listService";

const errorOptions = (context: string) => ({
  context,
  notFound: "List not found",
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await v1ActorFromRequest(request);
    const listId = (await params).id;
    const items = await getListItems(actor, listId, {
      orderBy: "createdDate",
    });
    return NextResponse.json({ items });
  } catch (error) {
    return v1ErrorResponse(error, errorOptions("GET items error:"));
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await v1ActorFromRequest(request);
    const listId = (await params).id;
    const body = await request.json();

    if (!body || typeof body.name !== "string" || body.name === "") {
      return NextResponse.json(
        { error: "Missing or invalid 'name' field" },
        { status: 400 },
      );
    }

    const item = await createItem(new CommandContext(actor), {
      listId,
      name: body.name,
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return v1ErrorResponse(error, errorOptions("POST item error:"));
  }
}
