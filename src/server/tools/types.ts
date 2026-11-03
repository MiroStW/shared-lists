import type { z } from "zod";
import type { Actor } from "server/lists/actor";
import type { CommandContext } from "server/lists/command";
import { ToolInputError } from "./errors";

// One tool of the registry (KTD7). The same definition serves the HTTP
// endpoint, the MCP server and the list agent. Inputs are validated with the
// zod schema before the handler runs; results are plain JSON.
export type Tool = {
  name: string;
  // Generic English text for models; never personal data (R11).
  description: string;
  inputSchema: z.ZodType;
  // Validates raw input and runs the handler. Writes go into command.
  run: (
    actor: Actor,
    input: unknown,
    command: CommandContext,
  ) => Promise<unknown>;
};

export const defineTool = <S extends z.ZodType>({
  name,
  description,
  inputSchema,
  handler,
}: {
  name: string;
  description: string;
  inputSchema: S;
  handler: (
    actor: Actor,
    input: z.output<S>,
    command: CommandContext,
  ) => Promise<unknown>;
}): Tool => ({
  name,
  description,
  inputSchema,
  run: async (actor, input, command) => {
    const parsed = inputSchema.safeParse(input ?? {});
    if (!parsed.success) throw ToolInputError.fromZod(name, parsed.error);
    return handler(actor, parsed.data, command);
  },
});
