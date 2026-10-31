import { z } from "zod";
import type { Actor } from "server/lists/actor";
import { CommandContext } from "server/lists/command";
import {
  addItemsTool,
  findItemsTool,
  setItemCompletedTool,
  updateItemTool,
} from "./definitions/items";
import {
  createListTool,
  createSectionTool,
  getListTool,
  listListsTool,
} from "./definitions/lists";
import { recentChangesTool, undoLastCommandTool } from "./definitions/history";
import { UnknownToolError } from "./errors";
import type { Tool } from "./types";

export type { Tool } from "./types";

// Every tool, once (KTD7). HTTP (/api/agent/tools), MCP (/api/mcp) and the
// list agent all read this registry.
export const tools: readonly Tool[] = [
  listListsTool,
  getListTool,
  findItemsTool,
  addItemsTool,
  setItemCompletedTool,
  updateItemTool,
  createListTool,
  createSectionTool,
  undoLastCommandTool,
  recentChangesTool,
];

const byName = new Map(tools.map((tool) => [tool.name, tool]));

export const findTool = (name: string) => byName.get(name) ?? null;

export type JsonSchema = { type?: string; [key: string]: unknown };

// The tool's input as JSON Schema, as models and HTTP clients expect it.
export const toolJsonSchema = (tool: Tool): JsonSchema => {
  const schema: JsonSchema = z.toJSONSchema(tool.inputSchema, { io: "input" });
  delete schema.$schema;
  return schema;
};

export const toolCatalog = () =>
  tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: toolJsonSchema(tool),
  }));

// Validates and runs a tool. Without a command each call is a command of its
// own; the list agent passes one context per sentence instead (KTD3).
// Throws UnknownToolError, ToolInputError or ListServiceError.
export const invokeTool = async (
  actor: Actor,
  name: string,
  input: unknown,
  { command }: { command?: CommandContext } = {},
) => {
  const tool = findTool(name);
  if (!tool) throw new UnknownToolError(name);
  return tool.run(actor, input, command ?? new CommandContext(actor));
};
