import { NextResponse } from "next/server";
import { actorFromRequest } from "server/http/actorFromRequest";
import { readJsonBody } from "server/http/json";
import { toolErrorResponse } from "server/tools/errors";
import { invokeTool } from "server/tools/registry";

type Params = { params: Promise<{ name: string }> };

// Runs one tool as its own command (KTD7). Answers {result} or
// {error, fields?}: 400 invalid input, 401 no credentials, 403 no access,
// 404 unknown tool, list or section.
export async function POST(request: Request, { params }: Params) {
  const { name } = await params;
  try {
    const actor = await actorFromRequest(request, {
      allowAgentToken: true,
      origin: "tool",
    });
    // The JSON body is the tool input; an empty body means no input.
    const input = await readJsonBody(request, { emptyAs: {} });
    const result = await invokeTool(actor, name, input);
    return NextResponse.json({ result });
  } catch (error) {
    return toolErrorResponse(error, `Error running tool ${name}:`);
  }
}
