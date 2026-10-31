import type Anthropic from "@anthropic-ai/sdk";
import type { Clarification } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "db/prisma";
import { ListServiceError } from "server/lists/access";
import type { Actor } from "server/lists/actor";
import { CommandContext } from "server/lists/command";
import type { EventFields } from "server/lists/events";
import { describeToolError, ToolInputError } from "server/tools/errors";
import { invokeTool, toolCatalog } from "server/tools/registry";
import {
  AgentUnavailableError,
  getAgentModel,
  type AgentModel,
  type AgentModelResponse,
} from "./anthropicClient";
import {
  claimClarification,
  clarificationOutput,
  createClarification,
  findOpenClarification,
  findOpenClarificationById,
  formatQuestion,
  matchAnswer,
  MAX_CLARIFICATION_OPTIONS,
  optionsOf,
  validateOptions,
  type ClarificationOutput,
} from "./clarifications";
import { assertWithinDailyLimit, CommandLimitError } from "./limits";
import { listCatalog, pendingQuestionContext, STATIC_PROMPT } from "./prompt";

// Tool rounds per sentence (KTD10).
export const MAX_ROUNDS = 8;

const ASK_USER = "ask_user";
const UNDO = "undo_last_command";

// ---- Input and output ----

export const commandInputSchema = z
  .strictObject({
    text: z
      .string()
      .trim()
      .min(1)
      .max(2000)
      .optional()
      .describe(
        "One sentence about the lists, e.g. 'bread and butter on the shopping list' or 'undo that'. A number or an option label answers an open question.",
      ),
    clarification_id: z
      .string()
      .trim()
      .min(1)
      .optional()
      .describe("Id of an open question, to answer it with option."),
    option: z
      .number()
      .int()
      .min(1)
      .optional()
      .describe("Number of the chosen option (1-based)."),
  })
  .refine(
    ({ text, clarification_id, option }) =>
      text !== undefined
        ? clarification_id === undefined && option === undefined
        : clarification_id !== undefined && option !== undefined,
    { message: "Give either text, or clarification_id with option" },
  );

export type AgentCommandInput =
  | { text: string }
  | { clarificationId: string; option: number };

// Validates a request body or MCP input. Throws ToolInputError.
export const parseCommandInput = (raw: unknown): AgentCommandInput => {
  const parsed = commandInputSchema.safeParse(raw ?? {});
  if (!parsed.success) throw ToolInputError.fromZod("command", parsed.error);
  const { text, clarification_id, option } = parsed.data;
  return text !== undefined
    ? { text }
    : { clarificationId: clarification_id!, option: option! };
};

// One written change, compact and readable: the event type with the names
// of what it touched.
export type AgentChange = {
  type: string;
  list: string | null;
  item: string | null;
  section: string | null;
};

export type AgentResponse = {
  status: "done" | "needs_choice" | "error";
  message: string;
  changes: AgentChange[];
  // The command of the sentence; for an answer, the command it was added to.
  command_id: string | null;
  clarification: ClarificationOutput | null;
};

// ---- Changes ----

const fieldsOf = (value: unknown) => (value ?? {}) as EventFields;
const nameIn = (fields: EventFields) =>
  typeof fields.name === "string" ? fields.name : undefined;

const lastEventSeq = async () =>
  (await prisma.listEvent.aggregate({ _max: { seq: true } }))._max.seq ?? 0;

// The events of the given commands, after afterSeq, as changes.
const changesOf = async (
  commandIds: string[],
  afterSeq = 0,
): Promise<AgentChange[]> => {
  if (commandIds.length === 0) return [];
  const events = await prisma.listEvent.findMany({
    where: { commandId: { in: commandIds }, seq: { gt: afterSeq } },
    orderBy: { seq: "asc" },
  });
  const ids = (key: "listId" | "itemId" | "sectionId") => [
    ...new Set(events.flatMap((event) => (event[key] ? [event[key]] : []))),
  ];
  const [lists, items, sections] = await Promise.all([
    prisma.list.findMany({
      where: { id: { in: ids("listId") } },
      select: { id: true, name: true },
    }),
    prisma.item.findMany({
      where: { id: { in: ids("itemId") } },
      select: { id: true, name: true },
    }),
    prisma.section.findMany({
      where: { id: { in: ids("sectionId") } },
      select: { id: true, name: true },
    }),
  ]);
  const names = (rows: { id: string; name: string }[]) =>
    new Map(rows.map(({ id, name }) => [id, name]));
  const listNames = names(lists);
  const itemNames = names(items);
  const sectionNames = names(sections);

  return events.map((event) => {
    const own = nameIn(fieldsOf(event.after)) ?? nameIn(fieldsOf(event.before));
    const target = event.type.split(".")[0];
    return {
      type: event.type,
      list:
        (target === "list" ? own : undefined) ??
        listNames.get(event.listId) ??
        null,
      item: event.itemId
        ? ((target === "item" ? own : undefined) ??
          itemNames.get(event.itemId) ??
          null)
        : null,
      section: event.sectionId
        ? ((target === "section" ? own : undefined) ??
          sectionNames.get(event.sectionId) ??
          null)
        : null,
    };
  });
};

// ---- Tools for the model ----

const ASK_USER_TOOL: Anthropic.Tool = {
  name: ASK_USER,
  description:
    "Ask the person to choose when you are unsure, e.g. when add_items reports an ambiguous name. Every option is a complete call of another tool that is run when the person picks it. This ends your turn; the question is shown with numbered options.",
  input_schema: {
    type: "object",
    properties: {
      question: {
        type: "string",
        description: "Short question in the language of the sentence.",
      },
      options: {
        type: "array",
        minItems: 1,
        maxItems: MAX_CLARIFICATION_OPTIONS,
        items: {
          type: "object",
          properties: {
            label: {
              type: "string",
              description:
                "Short description of the action, in the language of the sentence.",
            },
            tool: {
              type: "string",
              description:
                "Name of the tool to run for this option, e.g. set_item_completed or add_items.",
            },
            input: {
              type: "object",
              description: "The complete input of that tool.",
            },
          },
          required: ["label", "tool", "input"],
          additionalProperties: false,
        },
      },
    },
    required: ["question", "options"],
    additionalProperties: false,
  },
};

let agentTools: Anthropic.Tool[] | null = null;

// The registry tools (KTD7) plus ask_user, which only the agent has.
const getAgentTools = () =>
  (agentTools ??= [
    ...toolCatalog().map(
      ({ name, description, inputSchema }): Anthropic.Tool => ({
        name,
        description,
        input_schema: inputSchema as Anthropic.Tool.InputSchema,
      }),
    ),
    ASK_USER_TOOL,
  ]);

const textOf = (content: Anthropic.ContentBlock[]) =>
  content
    .flatMap((block) => (block.type === "text" ? [block.text.trim()] : []))
    .filter(Boolean)
    .join("\n");

// ---- One sentence ----

class Sentence {
  // The change command that the next writes go into. After an undo it is
  // replaced when it already holds events (KTD4.6).
  private current: CommandContext;
  private readonly contexts: CommandContext[];
  private readonly undoCommandIds: string[] = [];

  constructor(
    private readonly actor: Actor,
    private readonly text: string,
    private readonly entry: CommandContext,
  ) {
    this.current = entry;
    this.contexts = [entry];
  }

  private commandIds() {
    return [
      ...this.contexts.flatMap((ctx) => (ctx.commandId ? [ctx.commandId] : [])),
      ...this.undoCommandIds,
    ];
  }

  private async respond(
    status: AgentResponse["status"],
    message: string,
    clarification: Clarification | null = null,
  ): Promise<AgentResponse> {
    return {
      status,
      message,
      changes: await changesOf(this.commandIds()),
      command_id: this.entry.commandId,
      clarification: clarification ? clarificationOutput(clarification) : null,
    };
  }

  private async hasEvents(ctx: CommandContext) {
    if (!ctx.commandId) return false;
    return (
      (await prisma.listEvent.count({ where: { commandId: ctx.commandId } })) >
      0
    );
  }

  private async runTool(
    use: Anthropic.ToolUseBlock,
  ): Promise<Anthropic.ToolResultBlockParam> {
    try {
      const result = await invokeTool(this.actor, use.name, use.input, {
        command: this.current,
      });
      if (use.name === UNDO) {
        const { undo_command_id } = result as {
          undo_command_id: string | null;
        };
        if (undo_command_id) this.undoCommandIds.push(undo_command_id);
        // Later changes of this sentence go into a new change command, unless
        // the current one is still empty.
        if (await this.hasEvents(this.current)) {
          this.current = this.current.next();
          this.contexts.push(this.current);
        }
      }
      return {
        type: "tool_result",
        tool_use_id: use.id,
        content: JSON.stringify(result),
      };
    } catch (error) {
      const described = describeToolError(error);
      if (!described)
        console.error(`List agent tool ${use.name} failed:`, error);
      return {
        type: "tool_result",
        tool_use_id: use.id,
        content: JSON.stringify(described?.body ?? { error: "Internal error" }),
        is_error: true,
      };
    }
  }

  // Stores the question with the command of this sentence (KTD11).
  private async ask(use: Anthropic.ToolUseBlock, text: string) {
    const input = (use.input ?? {}) as {
      question?: unknown;
      options?: unknown;
    };
    const question =
      typeof input.question === "string" ? input.question.trim() : "";
    const options = validateOptions(input.options);
    if (!question || options.length === 0) {
      return this.respond(
        "error",
        [
          text,
          "I could not prepare a valid choice for this. Please say it more precisely.",
        ]
          .filter(Boolean)
          .join("\n\n"),
      );
    }
    this.current.commandId ??= (
      await prisma.command.create({ data: this.current.commandData() })
    ).id;
    const clarification = await createClarification(this.actor, {
      commandId: this.current.commandId,
      question,
      options,
      inputText: this.text,
    });
    return this.respond(
      "needs_choice",
      [text, formatQuestion(question, options)].filter(Boolean).join("\n\n"),
      clarification,
    );
  }

  async run(
    model: AgentModel,
    system: Anthropic.TextBlockParam[],
  ): Promise<AgentResponse> {
    const messages: Anthropic.MessageParam[] = [
      { role: "user", content: this.text },
    ];
    const tools = getAgentTools();

    for (let round = 0; round < MAX_ROUNDS; round++) {
      let response: AgentModelResponse;
      try {
        response = await model.respond({ system, tools, messages });
      } catch (error) {
        console.error("List agent model call failed:", error);
        return this.respond(
          "error",
          "The list agent could not reach the model. The changes listed were made.",
        );
      }
      messages.push({ role: "assistant", content: response.content });
      const text = textOf(response.content);
      const uses = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
      );

      if (uses.length === 0) {
        if (response.stop_reason === "refusal") {
          return this.respond("error", text || "I cannot help with that.");
        }
        return this.respond("done", text || "Done.");
      }

      // Other calls of the same turn run first; ask_user ends the sentence.
      const results: Anthropic.ToolResultBlockParam[] = [];
      for (const use of uses) {
        if (use.name !== ASK_USER) results.push(await this.runTool(use));
      }
      const question = uses.find((use) => use.name === ASK_USER);
      if (question) return this.ask(question, text);
      messages.push({ role: "user", content: results });
    }

    return this.respond(
      "error",
      `Stopped after ${MAX_ROUNDS} steps without finishing. The changes listed were made.`,
    );
  }
}

const runSentence = async (
  actor: Actor,
  text: string,
  pending: Clarification | null,
) => {
  const model = getAgentModel();
  if (!model) throw new AgentUnavailableError();
  await assertWithinDailyLimit(actor);
  // The sentence did not answer the open question: it lapses.
  if (pending) await claimClarification(pending.id);

  // Created on entry so the sentence counts against the limit even if it
  // changes nothing (KTD10).
  const entry = await CommandContext.start(actor, { inputText: text });
  const runtime = [
    await listCatalog(actor),
    ...(pending ? [pendingQuestionContext(pending)] : []),
  ].join("\n\n");
  const system: Anthropic.TextBlockParam[] = [
    { type: "text", text: STATIC_PROMPT, cache_control: { type: "ephemeral" } },
    { type: "text", text: runtime },
  ];
  return new Sentence(actor, text, entry).run(model, system);
};

// ---- Answers without the model ----

// Runs the stored call of the chosen option and adds its events to the
// command of the sentence that asked, so one undo takes back the whole
// sentence (KTD11). Needs no model and does not count against the limit.
const answerClarification = async (
  actor: Actor,
  clarification: Clarification,
  choice: number,
): Promise<AgentResponse> => {
  if (!(await claimClarification(clarification.id))) {
    throw new ListServiceError(
      "not_found",
      "This question was already answered.",
    );
  }
  const option = optionsOf(clarification)[choice - 1];
  const ctx = new CommandContext(actor, { inputText: clarification.inputText });
  const original = await prisma.command.findUnique({
    where: { id: clarification.commandId },
    select: { undoState: true },
  });
  // A sentence that was undone meanwhile stays undone; the answer becomes a
  // change of its own.
  if (original?.undoState === "none") ctx.commandId = clarification.commandId;

  const before = await lastEventSeq();
  try {
    await invokeTool(actor, option.tool, option.input, { command: ctx });
  } catch (error) {
    const described = describeToolError(error);
    if (!described) throw error;
    return {
      status: "error",
      message: described.body.error,
      changes: [],
      command_id: ctx.commandId,
      clarification: null,
    };
  }
  return {
    status: "done",
    // The label was written by the model in the language of the sentence.
    message: `OK: ${option.label}`,
    changes: ctx.commandId ? await changesOf([ctx.commandId], before) : [],
    command_id: ctx.commandId,
    clarification: null,
  };
};

// ---- Entry point ----

// Runs one input of /api/agent/command or MCP run_command: an answer to the
// open question, or a sentence for the model. The actor's origin becomes
// "agent". Throws AgentUnavailableError, CommandLimitError, ListServiceError
// and ToolInputError.
export const runAgentCommand = async (
  requestActor: Actor,
  input: AgentCommandInput,
): Promise<AgentResponse> => {
  const actor: Actor = { ...requestActor, origin: "agent" };

  if ("clarificationId" in input) {
    const clarification = await findOpenClarificationById(
      actor,
      input.clarificationId,
    );
    if (!clarification) {
      throw new ListServiceError(
        "not_found",
        "No open question with this id. It may have expired or been answered already.",
      );
    }
    const count = optionsOf(clarification).length;
    if (input.option > count) {
      throw new ListServiceError(
        "invalid",
        `Option must be between 1 and ${count}.`,
      );
    }
    return answerClarification(actor, clarification, input.option);
  }

  const text = input.text.trim();
  const pending = await findOpenClarification(actor);
  if (pending) {
    const choice = matchAnswer(optionsOf(pending), text);
    if (choice) return answerClarification(actor, pending, choice);
  }
  return runSentence(actor, text, pending);
};

// ---- Errors ----

export const describeAgentError = (error: unknown) => {
  if (error instanceof AgentUnavailableError) {
    return { status: 503, body: { error: error.message } };
  }
  if (error instanceof CommandLimitError) {
    return { status: 429, body: { error: error.message } };
  }
  return describeToolError(error);
};

export const agentErrorResponse = (error: unknown) => {
  const described = describeAgentError(error);
  if (described) {
    return NextResponse.json(described.body, { status: described.status });
  }
  console.error("Error running agent command:", error);
  return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
};
