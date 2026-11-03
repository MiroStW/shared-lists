import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { Item, List, User } from "@prisma/client";
import { prisma } from "db/prisma";
import * as commandRoute from "app/api/agent/command/route";
import * as toolRoute from "app/api/agent/tools/[name]/route";
import * as itemsRoute from "app/api/lists/[id]/items/route";
import * as mcpRoute from "app/api/mcp/route";
import { resetDatabase } from "../setup/db";
import { setSessionUser } from "../setup/session";
import * as fixtures from "../lists/fixtures";
import {
  callTools,
  installFakeModel,
  reply,
  toolUse,
  type FakeModel,
} from "../agent/fakeModel";

const post = (url: string, body: unknown, token?: string) =>
  new Request(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

const command = async (body: unknown, token: string | null = currentToken) => {
  const response = await commandRoute.POST(
    post("http://localhost/api/agent/command", body, token ?? undefined),
  );
  return { status: response.status, body: await response.json() };
};

let nextRpcId = 0;
const runCommandOverMcp = async (args: Record<string, unknown>) => {
  const response = await mcpRoute.POST(
    post(
      "http://localhost/api/mcp",
      {
        jsonrpc: "2.0",
        id: ++nextRpcId,
        method: "tools/call",
        params: { name: "run_command", arguments: args },
      },
      currentToken,
    ),
  );
  const body = await response.json();
  const result = body.result as {
    isError?: boolean;
    content: { text: string }[];
  };
  return {
    isError: !!result.isError,
    json: JSON.parse(result.content[0].text),
  };
};

let owner: User;
let currentToken: string;
let groceries: List;
let milk: Item;
let oatMilk: Item;
let model: FakeModel;
let restoreModel: () => void;
const savedKey = process.env.ANTHROPIC_API_KEY;
const savedProxyUrl = process.env.ANTHROPIC_PROXY_URL;

const askAboutMilk = () =>
  callTools(
    toolUse("ask_user", {
      question: "Welche Milch?",
      options: [
        {
          label: "Milch wieder drauf",
          tool: "set_item_completed",
          input: { item_id: milk.id, completed: false },
        },
        {
          label: "Hafermilch wieder drauf",
          tool: "set_item_completed",
          input: { item_id: oatMilk.id, completed: false },
        },
      ],
    }),
  );

const completed = async (item: Item) =>
  (await prisma.item.findUniqueOrThrow({ where: { id: item.id } })).completed;

describe("/api/agent/command", () => {
  beforeEach(async () => {
    await resetDatabase();
    owner = await fixtures.createUser("command-owner");
    ({ token: currentToken } = await fixtures.createAgentAccess(owner, {
      label: "test-bridge",
    }));
    groceries = await fixtures.createList(owner.id, { name: "Groceries" });
    milk = await fixtures.createItem(groceries.id, {
      name: "Milch",
      completed: true,
    });
    oatMilk = await fixtures.createItem(groceries.id, {
      name: "Hafermilch",
      completed: true,
      order: 1,
    });
    ({ model, restore: restoreModel } = installFakeModel());
  });

  afterEach(() => {
    restoreModel();
    delete process.env.LIST_AGENT_DAILY_COMMAND_LIMIT;
    if (savedKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = savedKey;
    if (savedProxyUrl === undefined) delete process.env.ANTHROPIC_PROXY_URL;
    else process.env.ANTHROPIC_PROXY_URL = savedProxyUrl;
  });

  test("answers 401 without credentials", async () => {
    const { status } = await command({ text: "Brot drauf" }, null);
    expect(status).toBe(401);
    expect(model.calls).toBe(0);
  });

  test("answers 400 for a body without text or answer", async () => {
    expect((await command({})).status).toBe(400);
    expect((await command({ text: "  " })).status).toBe(400);
    expect((await command({ clarification_id: "x" })).status).toBe(400);
    expect((await command("not json")).status).toBe(400);
    expect(model.calls).toBe(0);
  });

  test("a sentence returns done with the model's confirmation, the changes and the command", async () => {
    model.script(
      callTools(toolUse("add_items", { list: "Groceries", items: ["Brot"] })),
      reply("Brot ist drauf."),
    );

    const { status, body } = await command({ text: "Brot drauf" });

    expect(status).toBe(200);
    expect(body).toEqual({
      status: "done",
      message: "Brot ist drauf.",
      changes: [
        {
          type: "item.created",
          list: "Groceries",
          item: "Brot",
          section: null,
        },
      ],
      command_id: expect.any(String),
      clarification: null,
    });
    expect(
      await prisma.command.findUniqueOrThrow({
        where: { id: body.command_id },
      }),
    ).toMatchObject({
      inputText: "Brot drauf",
      origin: "agent",
      channel: "test-bridge",
    });
  });

  test("F2: needs_choice, then '2' reopens Hafermilch without the model", async () => {
    model.script(
      callTools(toolUse("add_items", { list: "Groceries", items: ["Milch"] })),
      askAboutMilk(),
    );

    const asked = await command({ text: "Milch drauf" });

    expect(asked.status).toBe(200);
    expect(asked.body.status).toBe("needs_choice");
    expect(asked.body.message).toContain("1.");
    expect(asked.body.message).toContain("2.");
    expect(asked.body.changes).toEqual([]);
    expect(asked.body.clarification.options).toHaveLength(2);
    expect(await prisma.listEvent.count()).toBe(0);

    const answered = await command({ text: "2" });

    expect(model.calls).toBe(2);
    expect(answered.body).toMatchObject({
      status: "done",
      command_id: asked.body.command_id,
      clarification: null,
    });
    expect(await completed(oatMilk)).toBe(false);
    expect(await completed(milk)).toBe(true);
    expect(
      await prisma.item.count({
        where: { listID: groceries.id, completed: false },
      }),
    ).toBe(1);
    expect(await prisma.item.count()).toBe(2);
  });

  test("a structured answer with clarification_id and option 1 runs option 1", async () => {
    model.script(askAboutMilk());
    const asked = await command({ text: "Milch drauf" });

    const answered = await command({
      clarification_id: asked.body.clarification.id,
      option: 1,
    });

    expect(answered.status).toBe(200);
    expect(answered.body.status).toBe("done");
    expect(await completed(milk)).toBe(false);
    expect(model.calls).toBe(1);
  });

  test("a session user can send sentences too", async () => {
    setSessionUser({ id: owner.id, email: owner.email, name: owner.name });
    model.script(reply("Hallo."));

    const { status, body } = await command({ text: "Hallo" }, null);

    expect(status).toBe(200);
    expect(body.status).toBe("done");
    expect(
      await prisma.command.findUniqueOrThrow({
        where: { id: body.command_id },
      }),
    ).toMatchObject({ channel: "web", origin: "agent", accessId: null });
  });

  test("a read-only sentence counts against the daily limit; over it the answer is 429 without the model", async () => {
    process.env.LIST_AGENT_DAILY_COMMAND_LIMIT = "1";
    model.script(callTools(toolUse("list_lists")), reply("Eine Liste."));

    const first = await command({ text: "Welche Listen habe ich?" });
    expect(first.body.status).toBe("done");
    expect(await prisma.listEvent.count()).toBe(0);

    const second = await command({ text: "Und jetzt?" });

    expect(second.status).toBe(429);
    expect(second.body.error).toContain("limit");
    expect(model.calls).toBe(2);
    expect(await prisma.command.count()).toBe(1);
  });

  test("MCP run_command runs a sentence and is limited the same way", async () => {
    process.env.LIST_AGENT_DAILY_COMMAND_LIMIT = "1";
    model.script(
      callTools(toolUse("add_items", { list: "Groceries", items: ["Brot"] })),
      reply("Brot ist drauf."),
    );

    const first = await runCommandOverMcp({ text: "Brot drauf" });

    expect(first.isError).toBe(false);
    expect(first.json).toMatchObject({
      status: "done",
      message: "Brot ist drauf.",
    });
    expect(
      await prisma.command.findFirstOrThrow({
        where: { inputText: "Brot drauf" },
      }),
    ).toMatchObject({ origin: "agent", channel: "test-bridge" });

    const second = await runCommandOverMcp({ text: "Butter drauf" });

    expect(second.isError).toBe(true);
    expect(second.json.error).toContain("limit");
    expect(model.calls).toBe(2);
  });

  test("MCP run_command answers an open question by clarification_id", async () => {
    model.script(askAboutMilk());
    const asked = await runCommandOverMcp({ text: "Milch drauf" });
    expect(asked.json.status).toBe("needs_choice");

    const answered = await runCommandOverMcp({
      clarification_id: asked.json.clarification.id,
      option: 2,
    });

    expect(answered.json.status).toBe("done");
    expect(await completed(oatMilk)).toBe(false);
  });

  test("web clicks, tool calls and answers do not use up the daily limit", async () => {
    process.env.LIST_AGENT_DAILY_COMMAND_LIMIT = "1";
    setSessionUser({ id: owner.id, email: owner.email, name: owner.name });
    const click = await itemsRoute.POST(
      post(`http://localhost/api/lists/${groceries.id}/items`, {
        name: "Käse",
      }),
      { params: Promise.resolve({ id: groceries.id }) },
    );
    expect(click.status).toBeLessThan(300);
    setSessionUser(null);
    const tool = await toolRoute.POST(
      post(
        "http://localhost/api/agent/tools/add_items",
        { list: "Groceries", items: ["Butter"] },
        currentToken,
      ),
      { params: Promise.resolve({ name: "add_items" }) },
    );
    expect(tool.status).toBe(200);

    model.script(askAboutMilk());
    const asked = await command({ text: "Milch drauf" });
    expect(asked.body.status).toBe("needs_choice");
    const answered = await command({ text: "2" });
    expect(answered.body.status).toBe("done");

    expect((await command({ text: "Noch was" })).status).toBe(429);
  });

  test("without ANTHROPIC_API_KEY a sentence answers 503, while a number answer still works", async () => {
    model.script(askAboutMilk());
    await command({ text: "Milch drauf" });
    // Back to the real model source, without a key.
    restoreModel();
    restoreModel = () => {};
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_PROXY_URL;

    const answered = await command({ text: "2" });
    expect(answered.status).toBe(200);
    expect(answered.body.status).toBe("done");
    expect(await completed(oatMilk)).toBe(false);

    const sentence = await command({ text: "Brot drauf" });
    expect(sentence.status).toBe(503);
    expect(sentence.body.error).toContain("ANTHROPIC_API_KEY");
    expect(
      await prisma.command.count({ where: { inputText: "Brot drauf" } }),
    ).toBe(0);
  });
});
