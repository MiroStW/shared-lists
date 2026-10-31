import type Anthropic from "@anthropic-ai/sdk";
import {
  setAgentModelProvider,
  type AgentModel,
  type AgentModelRequest,
  type AgentModelResponse,
} from "server/agent/anthropicClient";

// A scripted stand-in for the model (KTD13): each turn returns the next
// scripted response. A turn is a function of the request so far, so a script
// can read ids out of earlier tool results.
export type ScriptedTurn =
  | AgentModelResponse
  | ((request: AgentModelRequest) => AgentModelResponse);

let nextId = 0;

export const toolUse = (name: string, input: Record<string, unknown> = {}) =>
  ({
    type: "tool_use",
    id: `toolu_${++nextId}`,
    name,
    input,
  }) as Anthropic.ToolUseBlock;

export const text = (value: string) =>
  ({ type: "text", text: value, citations: null }) as Anthropic.TextBlock;

// A turn that calls the given tools.
export const callTools = (
  ...uses: Anthropic.ToolUseBlock[]
): AgentModelResponse => ({ content: uses, stop_reason: "tool_use" });

// A final turn with a confirmation.
export const reply = (value: string): AgentModelResponse => ({
  content: [text(value)],
  stop_reason: "end_turn",
});

// The parsed results of every tool call so far, in order.
export const toolResults = (request: AgentModelRequest) =>
  request.messages.flatMap((message) =>
    message.role === "user" && Array.isArray(message.content)
      ? message.content.flatMap((block) =>
          block.type === "tool_result" && typeof block.content === "string"
            ? [JSON.parse(block.content) as Record<string, unknown>]
            : [],
        )
      : [],
  );

export const systemText = (request: AgentModelRequest) =>
  request.system.map((block) => block.text).join("\n\n");

export class FakeModel implements AgentModel {
  readonly requests: AgentModelRequest[] = [];
  private readonly turns: ScriptedTurn[] = [];

  script(...turns: ScriptedTurn[]) {
    this.turns.push(...turns);
    return this;
  }

  get calls() {
    return this.requests.length;
  }

  respond = async (request: AgentModelRequest) => {
    // Copy the messages: the agent keeps appending to its array.
    const snapshot = { ...request, messages: [...request.messages] };
    this.requests.push(snapshot);
    const turn = this.turns.shift();
    if (!turn) throw new Error("FakeModel: no scripted turn left");
    return typeof turn === "function" ? turn(snapshot) : turn;
  };
}

// Installs a fresh fake as the agent's model. Returns it and a restore
// function for afterEach.
export const installFakeModel = () => {
  const model = new FakeModel();
  const restore = setAgentModelProvider(() => model);
  return { model, restore };
};
