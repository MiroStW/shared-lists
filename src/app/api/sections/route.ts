import { NextResponse } from "next/server";
import { actorFromRequest } from "server/http/actorFromRequest";
import { errorResponse } from "server/http/errors";
import { CommandContext } from "server/lists/command";
import { createSection } from "server/lists/listService";

// A missing list answers 403 like a foreign one.
export async function POST(request: Request) {
  try {
    const actor = await actorFromRequest(request);
    const { name, listId } = await request.json();

    if (!name || !listId) {
      return NextResponse.json(
        { error: "Name and ListId are required" },
        { status: 400 },
      );
    }

    const section = await createSection(new CommandContext(actor), {
      listId,
      name,
    });
    return NextResponse.json(section);
  } catch (error) {
    return errorResponse(error, {
      context: "Error creating section:",
      notFoundStatus: 403,
    });
  }
}
