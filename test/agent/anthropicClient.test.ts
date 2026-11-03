import { describe, expect, test } from "bun:test";
import {
  clientConfigFromEnv,
  PROXY_PLACEHOLDER_API_KEY,
} from "server/agent/anthropicClient";

describe("clientConfigFromEnv", () => {
  test("without key and proxy there is no model", () => {
    expect(clientConfigFromEnv({})).toBeNull();
    expect(
      clientConfigFromEnv({ ANTHROPIC_API_KEY: " ", ANTHROPIC_PROXY_URL: "" }),
    ).toBeNull();
  });

  test("a key alone talks to the API directly", () => {
    expect(clientConfigFromEnv({ ANTHROPIC_API_KEY: " sk-ant-x " })).toEqual({
      apiKey: "sk-ant-x",
      proxyUrl: null,
    });
  });

  test("a proxy alone sends a placeholder the proxy replaces", () => {
    expect(
      clientConfigFromEnv({ ANTHROPIC_PROXY_URL: "http://x:t@proxy:10255" }),
    ).toEqual({
      apiKey: PROXY_PLACEHOLDER_API_KEY,
      proxyUrl: "http://x:t@proxy:10255",
    });
  });

  test("with a proxy, a set key is still sent through it", () => {
    expect(
      clientConfigFromEnv({
        ANTHROPIC_API_KEY: "sk-ant-x",
        ANTHROPIC_PROXY_URL: "http://proxy:10255",
      }),
    ).toEqual({ apiKey: "sk-ant-x", proxyUrl: "http://proxy:10255" });
  });
});
