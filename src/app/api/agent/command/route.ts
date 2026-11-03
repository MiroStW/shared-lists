import { NextResponse } from "next/server";
import {
  agentErrorResponse,
  parseCommandInput,
  runAgentCommand,
} from "server/agent/listAgent";
import { actorFromRequest } from "server/http/actorFromRequest";
import { readJsonBody } from "server/http/json";

// One sentence for the list agent, or an answer to its open question
// (KTD10, KTD11). Body {text} or {clarification_id, option}. Answers
// {status, message, changes, command_id, clarification}; errors as {error}:
// 400 invalid body, 401 no credentials, 404 unknown question, 429 daily
// limit, 503 no model configured.
export async function POST(request: Request) {
  try {
    const actor = await actorFromRequest(request, {
      allowAgentToken: true,
      origin: "agent",
    });
    const input = parseCommandInput(await readJsonBody(request));
    return NextResponse.json(await runAgentCommand(actor, input));
  } catch (error) {
    return agentErrorResponse(error);
  }
}
