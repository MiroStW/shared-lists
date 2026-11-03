import Anthropic from "@anthropic-ai/sdk";

// The list agent talks to the model only through this narrow interface, so
// tests can replace it with a scripted fake (KTD13).
export type AgentModelRequest = {
  system: Anthropic.TextBlockParam[];
  tools: Anthropic.Tool[];
  messages: Anthropic.MessageParam[];
};

export type AgentModelResponse = {
  content: Anthropic.ContentBlock[];
  stop_reason: Anthropic.StopReason | null;
};

export type AgentModel = {
  respond: (request: AgentModelRequest) => Promise<AgentModelResponse>;
};

export const DEFAULT_LIST_AGENT_MODEL = "claude-haiku-5-5";

// Thrown when no model is configured (no ANTHROPIC_API_KEY). The tools keep
// working; only sentences need the model (KTD10).
export class AgentUnavailableError extends Error {
  constructor() {
    super(
      "The list agent is not configured: ANTHROPIC_API_KEY is not set. The list tools still work.",
    );
    this.name = "AgentUnavailableError";
  }
}

const anthropicModel = (apiKey: string): AgentModel => {
  // A hanging model call must not hold the request open: fail after 30 s with
  // one retry, and the agent answers with an error.
  const client = new Anthropic({ apiKey, timeout: 30_000, maxRetries: 1 });
  const model =
    process.env.LIST_AGENT_MODEL?.trim() || DEFAULT_LIST_AGENT_MODEL;
  return {
    respond: async ({ system, tools, messages }) => {
      const response = await client.messages.create({
        model,
        max_tokens: 4096,
        // Short list sentences need little reasoning; low effort keeps the
        // answer fast.
        output_config: { effort: "low" },
        system,
        tools,
        messages,
      });
      return { content: response.content, stop_reason: response.stop_reason };
    },
  };
};

// The model from the environment, or null without ANTHROPIC_API_KEY.
const modelFromEnv = (): AgentModel | null => {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  return apiKey ? anthropicModel(apiKey) : null;
};

let provider: () => AgentModel | null = modelFromEnv;

export const getAgentModel = () => provider();

// Replaces where the model comes from, e.g. with a scripted fake in tests.
// Returns a function that restores the previous source.
export const setAgentModelProvider = (next: () => AgentModel | null) => {
  const previous = provider;
  provider = next;
  return () => {
    provider = previous;
  };
};
