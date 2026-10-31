import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { User } from "@prisma/client";
import { prisma } from "db/prisma";
import { liveBus, type ListChange } from "server/live/bus";
import * as toolRoute from "app/api/agent/tools/[name]/route";
import * as toolsRoute from "app/api/agent/tools/route";
import { resetDatabase } from "../setup/db";
import { setSessionUser } from "../setup/session";
import * as fixtures from "../lists/fixtures";

const request = (
  method: string,
  {
    body,
    token,
    headers = {},
  }: { body?: unknown; token?: string; headers?: Record<string, string> } = {},
) =>
  new Request("http://localhost/api/agent/tools", {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body:
      body === undefined
        ? undefined
        : typeof body === "string"
          ? body
          : JSON.stringify(body),
  });

const read = async (response: Response) => ({
  status: response.status,
  body: await response.json(),
});

const listTools = async (token?: string) =>
  read(await toolsRoute.GET(request("GET", { token })));

const callTool = async (
  name: string,
  options: Parameters<typeof request>[1] = {},
) =>
  read(
    await toolRoute.POST(request("POST", options), {
      params: Promise.resolve({ name }),
    }),
  );

let owner: User;
let token: string;
let published: ListChange[] = [];
let unsubscribe: () => void = () => {};

describe("/api/agent/tools", () => {
  beforeEach(async () => {
    await resetDatabase();
    owner = await fixtures.createUser("http-owner");
    ({ token } = await fixtures.createAgentAccess(owner, {
      label: "test-bridge",
    }));
    published = [];
    unsubscribe = liveBus.subscribe((change) => published.push(change));
  });

  afterEach(() => unsubscribe());

  test("GET lists every tool with its JSON schema", async () => {
    const { status, body } = await listTools(token);
    expect(status).toBe(200);
    const names = body.tools.map((tool: { name: string }) => tool.name);
    expect(names).toContain("add_items");
    expect(names).toContain("list_lists");
    const addItems = body.tools.find(
      (tool: { name: string }) => tool.name === "add_items",
    );
    expect(addItems.description).toBeString();
    expect(addItems.inputSchema).toMatchObject({
      type: "object",
      required: expect.arrayContaining(["list", "items"]),
    });
  });

  test("GET without a token is 401", async () => {
    expect((await listTools()).status).toBe(401);
  });

  test("POST runs a tool and answers with its result", async () => {
    const list = await fixtures.createList(owner.id, { name: "Groceries" });

    const { status, body } = await callTool("add_items", {
      token,
      body: { list: "Groceries", items: ["Bread"] },
    });

    expect(status).toBe(200);
    expect(body.result.results[0]).toMatchObject({
      name: "Bread",
      status: "created",
    });
    const command = await prisma.command.findFirstOrThrow();
    expect(command).toMatchObject({
      actorUserId: owner.id,
      channel: "test-bridge",
      origin: "tool",
    });
    expect(published.map((change) => change.listIds)).toEqual([[list.id]]);
  });

  test("POST with invalid input is 400 with field errors", async () => {
    const { status, body } = await callTool("add_items", {
      token,
      body: { list: 5, items: [] },
    });
    expect(status).toBe(400);
    expect(body.error).toBeString();
    expect(Object.keys(body.fields)).toEqual(
      expect.arrayContaining(["list", "items"]),
    );
  });

  test("POST with malformed JSON is 400", async () => {
    const { status, body } = await callTool("list_lists", {
      token,
      body: "{not json",
    });
    expect(status).toBe(400);
    expect(body.error).toContain("JSON");
  });

  test("POST without a body runs a tool with no input", async () => {
    await fixtures.createList(owner.id, { name: "Groceries" });
    const { status, body } = await callTool("list_lists", { token });
    expect(status).toBe(200);
    expect(body.result.lists).toHaveLength(1);
  });

  test("POST without, with a malformed or with a revoked token is 401", async () => {
    expect((await callTool("list_lists")).status).toBe(401);
    expect((await callTool("list_lists", { token: "sl_nope" })).status).toBe(
      401,
    );

    await prisma.agentAccess.updateMany({
      data: { revokedAt: new Date() },
    });
    expect((await callTool("list_lists", { token })).status).toBe(401);
  });

  test("POST of an unknown tool is 404", async () => {
    const { status, body } = await callTool("drop_tables", {
      token,
      body: {},
    });
    expect(status).toBe(404);
    expect(body.error).toContain("drop_tables");
  });

  test("POST on a list the access does not see is 403", async () => {
    const stranger = await fixtures.createUser("stranger");
    const hidden = await fixtures.createList(stranger.id);
    const { status } = await callTool("get_list", {
      token,
      body: { list: hidden.id },
    });
    expect(status).toBe(403);
  });

  test("POST with an unknown list name is 404 naming the visible lists", async () => {
    await fixtures.createList(owner.id, { name: "Groceries" });
    const { status, body } = await callTool("get_list", {
      token,
      body: { list: "Hardware" },
    });
    expect(status).toBe(404);
    expect(body.error).toContain("Groceries");
  });

  test("a web session may call tools too", async () => {
    await fixtures.createList(owner.id, { name: "Groceries" });
    setSessionUser({ id: owner.id, email: owner.email, name: owner.name });

    const { status, body } = await callTool("list_lists");
    expect(status).toBe(200);
    expect(body.result.lists).toHaveLength(1);
  });

  test("a household access may name its acting person", async () => {
    const partner = await fixtures.createUser("partner");
    const list = await fixtures.createList(owner.id, {
      name: "Shared",
      contributorIds: [partner.id],
    });
    const household = await fixtures.createAgentAccess(owner, {
      kind: "household",
      label: "test-household",
      memberIds: [owner.id, partner.id],
    });

    const { status } = await callTool("add_items", {
      token: household.token,
      headers: { "x-acting-user": partner.email },
      body: { list: list.id, items: ["Bread"] },
    });

    expect(status).toBe(200);
    expect(await prisma.command.findFirstOrThrow()).toMatchObject({
      actorUserId: partner.id,
      channel: "test-household",
    });
  });
});
