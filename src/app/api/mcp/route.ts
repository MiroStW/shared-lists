import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { registerRunCommandTool } from "server/agent/mcpTool";
import { actorFromAgentRequest } from "server/auth/agentAuth";
import { UnauthenticatedError } from "server/http/errors";
import { toolErrorResponse } from "server/tools/errors";
import { createMcpServer } from "server/tools/mcpServer";

// MCP over Streamable HTTP for Claude Code and other MCP clients (KTD7):
// every registry tool plus run_command for sentences. Stateless: every POST
// gets a fresh server and transport, answers with JSON and needs an agent
// token (`Authorization: Bearer sl_...`); a household access may add
// `x-acting-user`.
export async function POST(request: Request) {
  let server: ReturnType<typeof createMcpServer>;
  try {
    const actor = await actorFromAgentRequest(request, { origin: "tool" });
    if (!actor) throw new UnauthenticatedError();
    server = createMcpServer(actor);
    registerRunCommandTool(server, actor);
  } catch (error) {
    return toolErrorResponse(error, "MCP authentication error:");
  }

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  try {
    await server.connect(transport);
    return await transport.handleRequest(request);
  } finally {
    await server.close();
  }
}

// Without sessions there is no server-to-client stream to open (GET) and no
// session to end (DELETE).
const methodNotAllowed = () =>
  Response.json(
    {
      jsonrpc: "2.0",
      error: { code: -32000, message: "Method not allowed." },
      id: null,
    },
    { status: 405, headers: { Allow: "POST" } },
  );

export const GET = methodNotAllowed;
export const DELETE = methodNotAllowed;
