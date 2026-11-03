import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { isPlainObject } from "server/http/json";
import type { Actor } from "server/lists/actor";
import { describeToolError, type ToolErrorBody } from "./errors";
import { invokeTool, tools } from "./registry";

const INSTRUCTIONS =
  "Tools for shared shopping and to-do lists. Read lists with list_lists, get_list and find_items. " +
  "Add items with add_items: it matches existing items first and reports ambiguous names instead of creating duplicates. " +
  "Every call is its own command; undo_last_command takes back the latest one. " +
  "run_command hands a whole sentence to the list agent instead.";

export const jsonResult = (
  value: unknown,
  isError = false,
): CallToolResult => ({
  content: [{ type: "text", text: JSON.stringify(value) }],
  ...(isPlainObject(value) && !isError ? { structuredContent: value } : {}),
  ...(isError ? { isError: true } : {}),
});

// An error as an MCP error result: expected errors keep their body, anything
// else is logged with context and answered generically.
export const mcpErrorResult = (
  error: unknown,
  context: string,
  describe: (
    error: unknown,
  ) => { body: ToolErrorBody } | null = describeToolError,
): CallToolResult => {
  const described = describe(error);
  if (described) return jsonResult(described.body, true);
  console.error(context, error);
  return jsonResult({ error: "Internal error" }, true);
};

// Runs a registry tool and turns its result or error into an MCP result.
export const callRegistryTool = async (
  actor: Actor,
  name: string,
  input: unknown,
): Promise<CallToolResult> => {
  try {
    return jsonResult(await invokeTool(actor, name, input));
  } catch (error) {
    return mcpErrorResult(error, `Error running MCP tool ${name}:`);
  }
};

// One server per request, bound to the request's actor; every registry tool
// becomes an MCP tool (KTD7). Further tools, such as the list agent's
// run_command, are registered on the returned server.
export const createMcpServer = (actor: Actor) => {
  const server = new McpServer(
    { name: "shared-lists", version: "1.0.0" },
    { instructions: INSTRUCTIONS },
  );
  for (const tool of tools) {
    server.registerTool(
      tool.name,
      { description: tool.description, inputSchema: tool.inputSchema },
      (input) => callRegistryTool(actor, tool.name, input),
    );
  }
  return server;
};
