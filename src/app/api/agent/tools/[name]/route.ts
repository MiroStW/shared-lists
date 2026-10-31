import { NextResponse } from "next/server";
import { actorFromRequest } from "server/http/actorFromRequest";
import { ToolInputError, toolErrorResponse } from "server/tools/errors";
import { invokeTool } from "server/tools/registry";

type Params = { params: Promise<{ name: string }> };

// The JSON body is the tool input; an empty body means no input.
const readInput = async (request: Request) => {
  const text = await request.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ToolInputError("Request body must be valid JSON");
  }
};

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
    const result = await invokeTool(actor, name, await readInput(request));
    return NextResponse.json({ result });
  } catch (error) {
    return toolErrorResponse(error, `Error running tool ${name}:`);
  }
}
