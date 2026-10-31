import { NextResponse } from "next/server";
import { actorFromRequest } from "server/http/actorFromRequest";
import { toolErrorResponse } from "server/tools/errors";
import { toolCatalog } from "server/tools/registry";

// Names, descriptions and JSON schemas of all tools (KTD7). Needs an agent
// token or a web session like the tools themselves.
export async function GET(request: Request) {
  try {
    await actorFromRequest(request, { allowAgentToken: true, origin: "tool" });
    return NextResponse.json({ tools: toolCatalog() });
  } catch (error) {
    return toolErrorResponse(error, "Error listing tools:");
  }
}
