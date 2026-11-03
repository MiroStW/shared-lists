import Anthropic from "@anthropic-ai/sdk";
import { ProxyAgent, fetch as undiciFetch } from "undici";

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

// Thrown when no model is configured (neither ANTHROPIC_API_KEY nor
// ANTHROPIC_PROXY_URL). The tools keep working; only sentences need the model
// (KTD10).
export class AgentUnavailableError extends Error {
  constructor() {
    super(
      "The list agent is not configured: neither ANTHROPIC_API_KEY nor ANTHROPIC_PROXY_URL is set. The list tools still work.",
    );
    this.name = "AgentUnavailableError";
  }
}

// Behind a credential proxy (e.g. a OneCLI gateway, ANTHROPIC_PROXY_URL) the
// proxy injects the real key, so the client only sends this placeholder.
export const PROXY_PLACEHOLDER_API_KEY = "injected-by-proxy";

export type AnthropicClientConfig = {
  apiKey: string;
  proxyUrl: string | null;
};

// The client settings from the environment, or null when neither a key nor a
// proxy is configured.
export const clientConfigFromEnv = (
  env: Partial<Record<string, string>> = process.env,
): AnthropicClientConfig | null => {
  const proxyUrl = env.ANTHROPIC_PROXY_URL?.trim() || null;
  const apiKey =
    env.ANTHROPIC_API_KEY?.trim() ||
    (proxyUrl ? PROXY_PLACEHOLDER_API_KEY : null);
  return apiKey ? { apiKey, proxyUrl } : null;
};

// Node's global fetch ignores HTTPS_PROXY, so the proxy is set on this client
// only. The proxy's CA comes from NODE_EXTRA_CA_CERTS.
const proxyOptions = (proxyUrl: string) => ({
  fetch: undiciFetch as unknown as typeof fetch,
  fetchOptions: { dispatcher: new ProxyAgent(proxyUrl) },
});

const anthropicModel = ({
  apiKey,
  proxyUrl,
}: AnthropicClientConfig): AgentModel => {
  // A hanging model call must not hold the request open: fail after 30 s with
  // one retry, and the agent answers with an error.
  const client = new Anthropic({
    apiKey,
    timeout: 30_000,
    maxRetries: 1,
    ...(proxyUrl ? proxyOptions(proxyUrl) : {}),
  });
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

// The model from the environment, or null without ANTHROPIC_API_KEY and
// ANTHROPIC_PROXY_URL. Built once per configuration, so the proxy's
// connections are reused across sentences.
let cached: { key: string; model: AgentModel } | null = null;

const modelFromEnv = (): AgentModel | null => {
  const config = clientConfigFromEnv();
  if (!config) return null;
  const key = `${config.apiKey}\n${config.proxyUrl ?? ""}`;
  if (cached?.key !== key) cached = { key, model: anthropicModel(config) };
  return cached.model;
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
