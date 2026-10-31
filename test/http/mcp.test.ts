import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { User } from "@prisma/client";
import { prisma } from "db/prisma";
import { liveBus, type ListChange } from "server/live/bus";
import { tools } from "server/tools/registry";
import * as mcpRoute from "app/api/mcp/route";
import { resetDatabase } from "../setup/db";
import { setSessionUser } from "../setup/session";
import * as fixtures from "../lists/fixtures";

let nextId = 0;

const rpcRequest = (
  method: string,
  params: Record<string, unknown> | undefined,
  token: string | null,
) =>
  new Request("http://localhost/api/mcp", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: ++nextId, method, params }),
  });

const rpc = async (
  method: string,
  params?: Record<string, unknown>,
  token: string | null = currentToken,
) => {
  const response = await mcpRoute.POST(rpcRequest(method, params, token));
  return { status: response.status, body: await response.json() };
};

type ToolResult = {
  isError?: boolean;
  content: { type: string; text: string }[];
  structuredContent?: Record<string, unknown>;
};

const callTool = async (name: string, args: Record<string, unknown> = {}) => {
  const { status, body } = await rpc("tools/call", { name, arguments: args });
  expect(status).toBe(200);
  const result = body.result as ToolResult;
  return { result, json: JSON.parse(result.content[0].text) };
};

let owner: User;
let currentToken: string;
let published: ListChange[] = [];
let unsubscribe: () => void = () => {};

describe("/api/mcp", () => {
  beforeEach(async () => {
    await resetDatabase();
    owner = await fixtures.createUser("mcp-owner");
    ({ token: currentToken } = await fixtures.createAgentAccess(owner, {
      label: "claude-code",
    }));
    published = [];
    unsubscribe = liveBus.subscribe((change) => published.push(change));
  });

  afterEach(() => unsubscribe());

  test("initialize answers with the server info and tool capability", async () => {
    const { status, body } = await rpc("initialize", {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "test-client", version: "1.0.0" },
    });
    expect(status).toBe(200);
    expect(body.result.serverInfo.name).toBe("shared-lists");
    expect(body.result.capabilities.tools).toBeDefined();
  });

  test("tools/list returns every registry tool with an object schema", async () => {
    const { status, body } = await rpc("tools/list", {});
    expect(status).toBe(200);
    const listed = body.result.tools as {
      name: string;
      description: string;
      inputSchema: { type: string };
    }[];
    expect(listed.map((tool) => tool.name).sort()).toEqual(
      tools.map((tool) => tool.name).sort(),
    );
    for (const tool of listed) {
      expect(tool.description).toBeString();
      expect(tool.inputSchema.type).toBe("object");
    }
  });

  test("tools/call list_lists returns the access's visible lists", async () => {
    const list = await fixtures.createList(owner.id, { name: "Groceries" });
    const stranger = await fixtures.createUser("stranger");
    await fixtures.createList(stranger.id, { name: "Hidden" });

    const { result, json } = await callTool("list_lists");

    expect(result.isError).toBeFalsy();
    expect(json.lists.map((entry: { id: string }) => entry.id)).toEqual([
      list.id,
    ]);
    expect(result.structuredContent).toEqual(json);
  });

  test("tools/call add_items writes as the access and publishes to the bus", async () => {
    const list = await fixtures.createList(owner.id, { name: "Groceries" });

    const { json } = await callTool("add_items", {
      list: "Groceries",
      items: ["Bread"],
    });

    expect(json.results[0].status).toBe("created");
    expect(await prisma.command.findFirstOrThrow()).toMatchObject({
      actorUserId: owner.id,
      channel: "claude-code",
      origin: "tool",
    });
    expect(published.map((change) => change.listIds)).toEqual([[list.id]]);
  });

  test("tool errors come back as error results", async () => {
    const stranger = await fixtures.createUser("stranger");
    const hidden = await fixtures.createList(stranger.id);

    const forbidden = await callTool("get_list", { list: hidden.id });
    expect(forbidden.result.isError).toBe(true);
    expect(forbidden.json.error).toBe("Forbidden");

    const invalid = await rpc("tools/call", {
      name: "add_items",
      arguments: { list: "x", items: [] },
    });
    expect(invalid.body.result.isError).toBe(true);
  });

  test("requires an agent token; a web session is not enough", async () => {
    setSessionUser({ id: owner.id, email: owner.email, name: owner.name });
    const missing = await rpc("tools/list", {}, null);
    expect(missing.status).toBe(401);
    expect(missing.body.error).toBeString();

    const wrong = await rpc("tools/list", {}, "sl_abcdefgh_wrong");
    expect(wrong.status).toBe(401);
  });

  test("GET and DELETE are not allowed on the stateless endpoint", async () => {
    for (const handler of [mcpRoute.GET, mcpRoute.DELETE]) {
      const response = await handler();
      expect(response.status).toBe(405);
      expect(response.headers.get("allow")).toBe("POST");
    }
  });
});
