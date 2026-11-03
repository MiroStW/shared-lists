import { NextResponse } from "next/server";
import { actorFromRequest } from "server/http/actorFromRequest";
import { errorResponse } from "server/http/errors";
import { CommandContext } from "server/lists/command";
import { createList, getVisibleLists } from "server/lists/listService";

export async function GET(request: Request) {
  try {
    const actor = await actorFromRequest(request);
    return NextResponse.json(await getVisibleLists(actor));
  } catch (error) {
    return errorResponse(error, { context: "Error fetching lists:" });
  }
}

export async function POST(request: Request) {
  try {
    const actor = await actorFromRequest(request);
    const { name } = await request.json();

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const list = await createList(new CommandContext(actor), { name });
    return NextResponse.json(list);
  } catch (error) {
    return errorResponse(error, { context: "Error creating list:" });
  }
}
