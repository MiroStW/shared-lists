import { NextResponse } from "next/server";
import { actorFromRequest } from "server/http/actorFromRequest";
import { errorResponse } from "server/http/errors";
import { CommandContext } from "server/lists/command";
import { deleteSection, renameSection } from "server/lists/listService";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, { params }: Params) {
  const sectionId = (await params).id;

  try {
    const actor = await actorFromRequest(request);
    await deleteSection(new CommandContext(actor), sectionId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error, { context: "Error deleting section:" });
  }
}

export async function PATCH(request: Request, { params }: Params) {
  const sectionId = (await params).id;

  try {
    const actor = await actorFromRequest(request);
    const { name } = await request.json();

    const section = await renameSection(
      new CommandContext(actor),
      sectionId,
      name,
    );
    return NextResponse.json(section);
  } catch (error) {
    return errorResponse(error, { context: "Error updating section:" });
  }
}
