import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Actor } from "server/lists/actor";
import { jsonResult, mcpErrorResult } from "server/tools/mcpServer";
import {
  commandInputSchema,
  describeAgentError,
  parseCommandInput,
  runAgentCommand,
} from "./listAgent";

const DESCRIPTION =
  "Hand one sentence about the lists to the list agent, e.g. 'bread and butter on the shopping list' or 'undo that'. " +
  "It answers with status done, needs_choice (a question with numbered options) or error, a short message and the changes made. " +
  "Answer a question with its number as text, or with clarification_id and option. Sentences count against a daily limit; the other tools do not.";

// MCP run_command: the same agent core as /api/agent/command, including the
// daily limit (KTD10).
export const registerRunCommandTool = (server: McpServer, actor: Actor) => {
  server.registerTool(
    "run_command",
    { description: DESCRIPTION, inputSchema: commandInputSchema },
    async (raw) => {
      try {
        return jsonResult(await runAgentCommand(actor, parseCommandInput(raw)));
      } catch (error) {
        return mcpErrorResult(
          error,
          "Error running MCP run_command:",
          describeAgentError,
        );
      }
    },
  );
};
