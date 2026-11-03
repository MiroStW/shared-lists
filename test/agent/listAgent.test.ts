import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { Item, List, User } from "@prisma/client";
import { prisma } from "db/prisma";
import { MAX_ROUNDS, runAgentCommand } from "server/agent/listAgent";
import { STATIC_PROMPT } from "server/agent/prompt";
import { actorFromAgentToken } from "server/auth/agentAuth";
import { householdActor, personActor, type Actor } from "server/lists/actor";
import { CommandContext } from "server/lists/command";
import { addItems } from "server/lists/itemService";
import { toolCatalog } from "server/tools/registry";
import { resetDatabase } from "../setup/db";
import * as fixtures from "../lists/fixtures";
import {
  callTools,
  installFakeModel,
  reply,
  systemText,
  text,
  toolResults,
  toolUse,
  type FakeModel,
} from "./fakeModel";

// Names used for test users and lists in this file. The static prompt must
// not contain any of them (R11).
const FIXTURE_NAMES = [
  "agent-owner",
  "agent-partner",
  "agent-stranger",
  "Groceries",
  "Shared home",
  "Private one",
  "Private two",
];

let owner: User;
let groceries: List;
let milk: Item;
let oatMilk: Item;
let model: FakeModel;
let restoreModel: () => void;

const sentence = (actor: Actor, value: string) =>
  runAgentCommand(actor, { text: value });

const itemNamed = (name: string) =>
  prisma.item.findFirst({ where: { listID: groceries.id, name } });

const commandsWithText = (inputText: string) =>
  prisma.command.findMany({
    where: { inputText },
    include: { events: { orderBy: { seq: "asc" } } },
    orderBy: { seq: "asc" },
  });

type Candidate = { id: string; name: string };

// The ask_user turn for an ambiguous "Milch": option 1 reopens Milch,
// option 2 reopens Hafermilch.
const askAboutMilk =
  (preface?: string) => (request: Parameters<typeof toolResults>[0]) => {
    const results = toolResults(request).flatMap(
      (result) =>
        (result.results ?? []) as {
          status: string;
          candidates?: Candidate[];
        }[],
    );
    const ambiguous = results.find((result) => result.status === "ambiguous");
    const candidates = ambiguous?.candidates ?? [];
    const byName = (name: string) =>
      candidates.find((candidate) => candidate.name === name)!.id;
    return {
      content: [
        ...(preface ? [text(preface)] : []),
        toolUse("ask_user", {
          question: "Welche Milch?",
          options: [
            {
              label: "Milch wieder drauf",
              tool: "set_item_completed",
              input: { item_id: byName("Milch"), completed: false },
            },
            {
              label: "Hafermilch wieder drauf",
              tool: "set_item_completed",
              input: { item_id: byName("Hafermilch"), completed: false },
            },
          ],
        }),
      ],
      stop_reason: "tool_use" as const,
    };
  };

describe("list agent", () => {
  beforeEach(async () => {
    await resetDatabase();
    owner = await fixtures.createUser("agent-owner");
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

  afterEach(() => restoreModel());

  test("all tool calls of a sentence land in one command with the sentence", async () => {
    model.script(
      callTools(
        toolUse("create_section", { list: "Groceries", name: "Bakery" }),
      ),
      callTools(
        toolUse("add_items", {
          list: "Groceries",
          items: ["Brot"],
          section: "Bakery",
        }),
      ),
      reply("Brot ist drauf."),
    );

    const response = await sentence(personActor(owner.id), "Brot drauf");

    expect(response).toMatchObject({
      status: "done",
      message: "Brot ist drauf.",
      clarification: null,
    });
    const commands = await prisma.command.findMany({
      include: { events: true },
    });
    expect(commands).toHaveLength(1);
    expect(commands[0]).toMatchObject({
      id: response.command_id,
      inputText: "Brot drauf",
      origin: "agent",
      kind: "change",
      actorUserId: owner.id,
    });
    expect(commands[0].events.map((event) => event.type)).toEqual([
      "section.created",
      "item.created",
    ]);
    expect(response.changes).toEqual([
      {
        type: "section.created",
        list: "Groceries",
        item: null,
        section: "Bakery",
      },
      {
        type: "item.created",
        list: "Groceries",
        item: "Brot",
        section: "Bakery",
      },
    ]);
  });

  test("the model gets the sentence, the catalog and every tool including ask_user", async () => {
    await fixtures.createSection(groceries.id, "Bakery");
    model.script(reply("Nichts zu tun."));

    await sentence(personActor(owner.id), "Hallo");

    const [request] = model.requests;
    expect(request.messages[0]).toEqual({ role: "user", content: "Hallo" });
    expect(systemText(request)).toContain("- Groceries (sections: Bakery)");
    const names = request.tools.map((tool) => tool.name);
    expect(names).toContain("add_items");
    expect(names).toContain("undo_last_command");
    expect(names).toContain("ask_user");
  });

  test("a tool error goes back to the model, which can recover", async () => {
    model.script(
      callTools(toolUse("add_items", { list: "Nope", items: ["Brot"] })),
      callTools(toolUse("add_items", { list: "Groceries", items: ["Brot"] })),
      reply("Brot ist auf Groceries."),
    );

    const response = await sentence(personActor(owner.id), "Brot auf Nope");

    const lastMessage = model.requests[1].messages.at(-1)!;
    expect(lastMessage.role).toBe("user");
    const [result] = lastMessage.content as {
      is_error?: boolean;
      content: string;
    }[];
    expect(result.is_error).toBe(true);
    expect(JSON.parse(result.content).error).toContain('"Groceries"');
    expect(response.status).toBe("done");
    expect(await itemNamed("Brot")).not.toBeNull();
  });

  test("a failing model call ends the sentence with status error and the changes made", async () => {
    // The second turn is missing, so the fake model throws.
    model.script(
      callTools(toolUse("add_items", { list: "Groceries", items: ["Brot"] })),
    );
    const originalError = console.error;
    console.error = () => {};
    try {
      const response = await sentence(personActor(owner.id), "Brot drauf");

      expect(response.status).toBe("error");
      expect(response.changes).toEqual([
        {
          type: "item.created",
          list: "Groceries",
          item: "Brot",
          section: null,
        },
      ]);
    } finally {
      console.error = originalError;
    }
  });

  test("'Milch und Brot drauf': Brot is added, Milch asked about, and one undo takes back both", async () => {
    model.script(
      callTools(
        toolUse("add_items", { list: "Groceries", items: ["Milch", "Brot"] }),
      ),
      askAboutMilk("Brot ist drauf."),
    );
    const actor = personActor(owner.id);

    const asked = await sentence(actor, "Milch und Brot drauf");

    expect(asked.status).toBe("needs_choice");
    expect(asked.message).toContain("Brot ist drauf.");
    expect(asked.message).toContain("1. Milch wieder drauf");
    expect(asked.message).toContain("2. Hafermilch wieder drauf");
    expect(asked.changes).toEqual([
      { type: "item.created", list: "Groceries", item: "Brot", section: null },
    ]);

    const answered = await sentence(actor, "2");

    expect(model.calls).toBe(2);
    expect(answered).toMatchObject({
      status: "done",
      command_id: asked.command_id,
      changes: [
        { type: "item.reopened", list: "Groceries", item: "Hafermilch" },
      ],
    });
    const [command] = await commandsWithText("Milch und Brot drauf");
    expect(command.events.map((event) => event.type)).toEqual([
      "item.created",
      "item.reopened",
    ]);

    model.script(callTools(toolUse("undo_last_command")), reply("Erledigt."));
    const undone = await sentence(actor, "mach das rückgängig");

    expect(undone.status).toBe("done");
    expect(await itemNamed("Brot")).toBeNull();
    expect((await itemNamed("Hafermilch"))!.completed).toBe(true);
    expect((await itemNamed("Milch"))!.completed).toBe(true);
  });

  test("AE10: undo over another channel takes back only the last command of the same person", async () => {
    const partner = await fixtures.createUser("agent-partner");
    await prisma.list.update({
      where: { id: groceries.id },
      data: { contributors: { connect: { id: partner.id } } },
    });
    const eggs = await fixtures.createItem(groceries.id, { name: "Eier" });
    const { token: claudeCode } = await fixtures.createAgentAccess(owner, {
      label: "claude-code",
    });
    const { token: nanoclaw } = await fixtures.createAgentAccess(owner, {
      label: "nanoclaw",
    });

    model.script(
      callTools(
        toolUse("add_items", { list: "Groceries", items: ["Brot"] }),
        toolUse("set_item_completed", { item_id: eggs.id, completed: true }),
      ),
      reply("Brot drauf, Eier abgehakt."),
    );
    await sentence(
      await actorFromAgentToken(claudeCode),
      "Brot drauf und Eier abhaken",
    );
    // The partner changes something afterwards over the web.
    await addItems(new CommandContext(personActor(partner.id)), {
      listId: groceries.id,
      entries: [{ name: "Käse" }],
    });

    model.script(
      callTools(toolUse("undo_last_command")),
      reply("Zurückgenommen."),
    );
    const response = await sentence(
      await actorFromAgentToken(nanoclaw),
      "mach das rückgängig",
    );

    expect(response.status).toBe("done");
    expect(await itemNamed("Brot")).toBeNull();
    expect((await itemNamed("Eier"))!.completed).toBe(false);
    expect(await itemNamed("Käse")).not.toBeNull();
    const undo = await prisma.command.findFirstOrThrow({
      where: { kind: "undo" },
    });
    expect(undo).toMatchObject({
      channel: "nanoclaw",
      origin: "agent",
      inputText: "mach das rückgängig",
    });
    expect(response.changes.map((change) => change.type).sort()).toEqual([
      "item.deleted",
      "item.reopened",
    ]);
  });

  test("G-F5: 'undo, I meant Hafermilch' is an undo plus a new change; the next undo takes back only Hafermilch", async () => {
    const actor = personActor(owner.id);
    model.script(
      callTools(
        toolUse("set_item_completed", { item_id: milk.id, completed: false }),
      ),
      reply("Milch ist wieder drauf."),
    );
    await sentence(actor, "Milch drauf");

    const correction = "mach das rückgängig, ich meinte Hafermilch";
    model.script(
      callTools(toolUse("undo_last_command")),
      callTools(
        toolUse("set_item_completed", {
          item_id: oatMilk.id,
          completed: false,
        }),
      ),
      reply("Hafermilch statt Milch."),
    );
    const response = await sentence(actor, correction);

    expect(response.status).toBe("done");
    expect((await itemNamed("Milch"))!.completed).toBe(true);
    expect((await itemNamed("Hafermilch"))!.completed).toBe(false);
    const commands = await commandsWithText(correction);
    expect(commands.map((command) => command.kind).sort()).toEqual([
      "change",
      "undo",
    ]);
    const change = commands.find((command) => command.kind === "change")!;
    expect(change.events.map((event) => [event.type, event.itemId])).toEqual([
      ["item.reopened", oatMilk.id],
    ]);
    expect(response.changes).toEqual([
      {
        type: "item.completed",
        list: "Groceries",
        item: "Milch",
        section: null,
      },
      {
        type: "item.reopened",
        list: "Groceries",
        item: "Hafermilch",
        section: null,
      },
    ]);

    model.script(callTools(toolUse("undo_last_command")), reply("Zurück."));
    await sentence(actor, "rückgängig");

    expect((await itemNamed("Hafermilch"))!.completed).toBe(true);
    expect((await itemNamed("Milch"))!.completed).toBe(true);
  });

  test("a change after an undo of the sentence's own change goes into a new command", async () => {
    const actor = personActor(owner.id);
    const input = "Brot drauf, nein doch nicht, Butter";
    model.script(
      callTools(toolUse("add_items", { list: "Groceries", items: ["Brot"] })),
      callTools(toolUse("undo_last_command")),
      callTools(toolUse("add_items", { list: "Groceries", items: ["Butter"] })),
      reply("Butter ist drauf."),
    );

    await sentence(actor, input);

    expect(await itemNamed("Brot")).toBeNull();
    expect(await itemNamed("Butter")).not.toBeNull();
    const commands = await commandsWithText(input);
    expect(
      commands.map((command) => [command.kind, command.undoState]),
    ).toEqual([
      ["change", "undone"],
      ["undo", "none"],
      ["change", "none"],
    ]);

    model.script(callTools(toolUse("undo_last_command")), reply("Zurück."));
    await sentence(actor, "rückgängig");

    expect(await itemNamed("Butter")).toBeNull();
    expect(await itemNamed("Brot")).toBeNull();
  });

  test("G-AE4: a household's catalog holds only the lists all members share", async () => {
    const partner = await fixtures.createUser("agent-partner");
    const shared = await fixtures.createList(owner.id, {
      name: "Shared home",
      contributorIds: [partner.id],
    });
    await fixtures.createList(owner.id, { name: "Private one" });
    await fixtures.createList(partner.id, { name: "Private two" });
    const { access } = await fixtures.createAgentAccess(owner, {
      kind: "household",
      label: "household",
      memberIds: [owner.id, partner.id],
    });
    model.script(callTools(toolUse("list_lists")), reply("Eine Liste."));

    await sentence(
      householdActor([owner.id, partner.id], {
        accessId: access.id,
        channel: "household",
      }),
      "Welche Listen haben wir?",
    );

    const system = systemText(model.requests[0]);
    expect(system).toContain("- Shared home");
    expect(system).not.toContain("Private one");
    expect(system).not.toContain("Private two");
    expect(system).not.toContain("Groceries");
    const [listed] = toolResults(model.requests[1]);
    expect((listed.lists as { id: string }[]).map((list) => list.id)).toEqual([
      shared.id,
    ]);
  });

  test(`the loop stops after ${MAX_ROUNDS} rounds and reports the changes made so far`, async () => {
    let round = 0;
    const addOne = () =>
      callTools(
        toolUse("add_items", { list: "Groceries", items: [`Teil ${++round}`] }),
      );
    model.script(...Array.from({ length: MAX_ROUNDS + 2 }, () => addOne));

    const response = await sentence(personActor(owner.id), "Viele Teile drauf");

    expect(model.calls).toBe(MAX_ROUNDS);
    expect(response.status).toBe("error");
    expect(response.message).toContain(String(MAX_ROUNDS));
    expect(response.changes).toHaveLength(MAX_ROUNDS);
    expect(
      response.changes.every((change) => change.type === "item.created"),
    ).toBe(true);
    expect(await prisma.item.count({ where: { listID: groceries.id } })).toBe(
      2 + MAX_ROUNDS,
    );
  });

  test("the static prompt and tool texts contain no e-mail addresses and no fixture names (R11)", () => {
    const texts = [
      STATIC_PROMPT,
      ...toolCatalog().map(
        (tool) => `${tool.description} ${JSON.stringify(tool.inputSchema)}`,
      ),
    ];
    for (const value of texts) {
      expect(value).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
      for (const name of FIXTURE_NAMES) {
        expect(value.toLowerCase()).not.toContain(name.toLowerCase());
      }
    }
  });
});
