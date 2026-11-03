import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { User } from "@prisma/client";
import { prisma } from "db/prisma";
import { actorFromAgentToken } from "server/auth/agentAuth";
import { ListServiceError } from "server/lists/access";
import { householdActor, personActor, type Actor } from "server/lists/actor";
import { CommandContext } from "server/lists/command";
import { EVENT } from "server/lists/events";
import { liveBus, type ListChange } from "server/live/bus";
import { ToolInputError, UnknownToolError } from "server/tools/errors";
import { invokeTool, toolCatalog, tools } from "server/tools/registry";
import { resetDatabase } from "../setup/db";
import * as fixtures from "../lists/fixtures";

type AddResult = {
  name: string;
  status: "created" | "reopened" | "already_open" | "ambiguous";
  item?: {
    id: string;
    name: string;
    note: string;
    completed: boolean;
    section: { id: string; name: string } | null;
  };
  candidates?: {
    id: string;
    name: string;
    completed: boolean;
    reason: string;
    score: number;
  }[];
  hints?: { id: string; name: string; reason: string }[];
};

// Typed shortcuts for the tools' JSON results.
const call = <T = Record<string, unknown>>(
  actor: Actor,
  name: string,
  input: unknown,
  options?: { command?: CommandContext },
) => invokeTool(actor, name, input, options) as Promise<T>;

const addItems = async (actor: Actor, input: Record<string, unknown>) =>
  (
    await call<{ list: { id: string; name: string }; results: AddResult[] }>(
      actor,
      "add_items",
      input,
    )
  ).results;

const caughtServiceError = async (fn: () => Promise<unknown>) => {
  const error = await fixtures.caught(fn);
  expect(error).toBeInstanceOf(ListServiceError);
  return error as ListServiceError;
};

const itemsNamed = (listID: string, name: string) =>
  prisma.item.findMany({ where: { listID, name } });

let owner: User;
let actor: Actor;
let published: ListChange[] = [];
let unsubscribe: () => void = () => {};

describe("agent tools", () => {
  beforeEach(async () => {
    await resetDatabase();
    owner = await fixtures.createUser("tool-owner");
    actor = personActor(owner.id, { channel: "test-agent", origin: "tool" });
    published = [];
    unsubscribe = liveBus.subscribe((change) => published.push(change));
  });

  afterEach(() => unsubscribe());

  describe("registry", () => {
    test("defines every tool once with an English description and a JSON schema", () => {
      expect(tools.map((tool) => tool.name).sort()).toEqual([
        "add_items",
        "create_list",
        "create_section",
        "find_items",
        "get_list",
        "list_lists",
        "recent_changes",
        "set_item_completed",
        "undo_last_command",
        "update_item",
      ]);
      for (const entry of toolCatalog()) {
        expect(entry.description.length).toBeGreaterThan(20);
        expect(entry.inputSchema.type).toBe("object");
        expect(entry.inputSchema).not.toHaveProperty("$schema");
      }
    });

    test("rejects invalid input with field errors", async () => {
      const error = await fixtures.caught(() =>
        call(actor, "add_items", { list: "", items: [], extra: 1 }),
      );
      expect(error).toBeInstanceOf(ToolInputError);
      const fields = (error as ToolInputError).fields;
      expect(Object.keys(fields)).toEqual(
        expect.arrayContaining(["list", "items"]),
      );
      expect(await fixtures.countCommandsAndEvents()).toEqual({
        commands: 0,
        events: 0,
      });
    });

    test("rejects an unknown tool", async () => {
      expect(
        await fixtures.caught(() => call(actor, "drop_tables", {})),
      ).toBeInstanceOf(UnknownToolError);
    });

    test("each call is its own command unless a shared context is passed", async () => {
      const list = await fixtures.createList(owner.id);
      await addItems(actor, { list: list.id, items: ["Bread"] });
      await addItems(actor, { list: list.id, items: ["Butter"] });
      expect(await prisma.command.count()).toBe(2);

      const shared = new CommandContext(actor, { inputText: "a sentence" });
      await call(
        actor,
        "add_items",
        { list: list.id, items: ["Jam"] },
        {
          command: shared,
        },
      );
      await call(
        actor,
        "add_items",
        { list: list.id, items: ["Tea"] },
        {
          command: shared,
        },
      );
      expect(await prisma.command.count()).toBe(3);
      expect(await fixtures.eventsOf(shared.commandId!)).toHaveLength(2);
    });
  });

  describe("add_items matching", () => {
    test("reopens a single completed exact match instead of creating one (G-AE1)", async () => {
      const list = await fixtures.createList(owner.id);
      const milk = await fixtures.createItem(list.id, {
        name: "Milch",
        completed: true,
      });

      const [result] = await addItems(actor, {
        list: list.id,
        items: ["milch"],
      });

      expect(result.status).toBe("reopened");
      expect(result.item).toMatchObject({ id: milk.id, completed: false });
      expect(await prisma.item.count()).toBe(1);
      const command = await prisma.command.findFirstOrThrow();
      expect(
        (await fixtures.eventsOf(command.id)).map((event) => event.type),
      ).toEqual([EVENT.itemReopened]);
    });

    test("reports an open match as already_open and writes nothing", async () => {
      const list = await fixtures.createList(owner.id);
      const milk = await fixtures.createItem(list.id, { name: "Milch" });

      const [result] = await addItems(actor, {
        list: list.id,
        items: ["Milch"],
      });

      expect(result.status).toBe("already_open");
      expect(result.item?.id).toBe(milk.id);
      expect(await fixtures.countCommandsAndEvents()).toEqual({
        commands: 0,
        events: 0,
      });
      expect(published).toHaveLength(0);
    });

    test("an open exact match wins over a completed compound", async () => {
      const list = await fixtures.createList(owner.id);
      await fixtures.createItem(list.id, { name: "Milch" });
      await fixtures.createItem(list.id, {
        name: "Hafermilch",
        completed: true,
      });

      const [result] = await addItems(actor, {
        list: list.id,
        items: ["Milch"],
      });

      expect(result.status).toBe("already_open");
      expect(result.candidates).toBeUndefined();
    });

    test("several completed candidates are ambiguous and nothing is written for that name (G-AE2)", async () => {
      const list = await fixtures.createList(owner.id);
      const milk = await fixtures.createItem(list.id, {
        name: "Milch",
        completed: true,
      });
      const oatMilk = await fixtures.createItem(list.id, {
        name: "Hafermilch",
        completed: true,
      });

      const [result] = await addItems(actor, {
        list: list.id,
        items: ["Milch"],
      });

      expect(result.status).toBe("ambiguous");
      expect(result.item).toBeUndefined();
      expect(
        result.candidates?.map(({ id, name, completed, reason }) => ({
          id,
          name,
          completed,
          reason,
        })),
      ).toEqual([
        { id: milk.id, name: "Milch", completed: true, reason: "exact" },
        {
          id: oatMilk.id,
          name: "Hafermilch",
          completed: true,
          reason: "compound",
        },
      ]);
      expect(typeof result.candidates?.[0].score).toBe("number");
      expect(await fixtures.countCommandsAndEvents()).toEqual({
        commands: 0,
        events: 0,
      });
      expect(await prisma.item.count({ where: { completed: false } })).toBe(0);
    });

    test("clear names of the same call are written next to an ambiguous one", async () => {
      const list = await fixtures.createList(owner.id);
      await fixtures.createItem(list.id, { name: "Milch", completed: true });
      await fixtures.createItem(list.id, {
        name: "Hafermilch",
        completed: true,
      });

      const results = await addItems(actor, {
        list: list.id,
        items: ["Milch", "Brot"],
      });

      expect(results.map((result) => result.status)).toEqual([
        "ambiguous",
        "created",
      ]);
      expect(await itemsNamed(list.id, "Brot")).toHaveLength(1);
      expect(await prisma.command.count()).toBe(1);
    });

    test("a completed compound alone is ambiguous rather than a silent duplicate", async () => {
      const list = await fixtures.createList(owner.id);
      await fixtures.createItem(list.id, {
        name: "Hafermilch",
        completed: true,
      });

      const [result] = await addItems(actor, {
        list: list.id,
        items: ["Milch"],
      });

      expect(result.status).toBe("ambiguous");
      expect(result.candidates?.map((candidate) => candidate.reason)).toEqual([
        "compound",
      ]);
      expect(await prisma.item.count()).toBe(1);
    });

    test("short names create a new item; fuzzy matches are hints only", async () => {
      const list = await fixtures.createList(owner.id);
      await fixtures.createItem(list.id, { name: "Reis", completed: true });

      const [egg, ice] = await addItems(actor, {
        list: list.id,
        items: ["Ei", "Eis"],
      });

      expect(egg.status).toBe("created");
      expect(ice.status).toBe("created");
      expect(ice.hints?.map((hint) => [hint.name, hint.reason])).toEqual([
        ["Reis", "fuzzy"],
      ]);
      expect(await prisma.item.count()).toBe(3);
    });

    test("create_new forces a new item despite a match", async () => {
      const list = await fixtures.createList(owner.id);
      await fixtures.createItem(list.id, { name: "Milch" });

      const [result] = await addItems(actor, {
        list: list.id,
        items: ["Milch"],
        create_new: true,
      });

      expect(result.status).toBe("created");
      expect(await itemsNamed(list.id, "Milch")).toHaveLength(2);
    });

    test("the same name twice in one call is created once", async () => {
      const list = await fixtures.createList(owner.id);

      const results = await addItems(actor, {
        list: list.id,
        items: ["Brot", "brot"],
      });

      expect(results.map((result) => result.status)).toEqual([
        "created",
        "already_open",
      ]);
      expect(await prisma.item.count()).toBe(1);
    });

    test("new items go to the end of their section", async () => {
      const list = await fixtures.createList(owner.id);
      await fixtures.createItem(list.id, { name: "First", order: 4 });

      const [result] = await addItems(actor, {
        list: list.id,
        items: ["Second"],
      });

      const item = await prisma.item.findUniqueOrThrow({
        where: { id: result.item!.id },
      });
      expect(item.order).toBe(5);
      expect(item.normalized).toBe("second");
    });
  });

  describe("add_items addressing", () => {
    test("creates in a section addressed by name, per call or per item", async () => {
      const list = await fixtures.createList(owner.id, { name: "Groceries" });
      const dairy = await fixtures.createSection(list.id, "Dairy");
      const bakery = await fixtures.createSection(list.id, "Bakery");

      const [cheese, bread] = await addItems(actor, {
        list: "groceries",
        section: "dairy",
        items: ["Cheese", { name: "Bread", section: "BAKERY" }],
      });

      expect(cheese.item?.section).toEqual({ id: dairy.id, name: "Dairy" });
      expect(bread.item?.section).toEqual({ id: bakery.id, name: "Bakery" });
    });

    test("an unknown section name is an error listing the sections, and nothing is written", async () => {
      const list = await fixtures.createList(owner.id);
      await fixtures.createSection(list.id, "Dairy");
      await fixtures.createSection(list.id, "Bakery");

      const error = await caughtServiceError(() =>
        addItems(actor, {
          list: list.id,
          items: ["Bread", { name: "Cheese", section: "Cheese counter" }],
        }),
      );

      expect(error.kind).toBe("not_found");
      expect(error.message).toContain("Cheese counter");
      expect(error.message).toContain("Dairy");
      expect(error.message).toContain("Bakery");
      expect(await prisma.item.count()).toBe(0);
      expect(await prisma.command.count()).toBe(0);
    });

    test("an agent access adds by list name with a note; the event carries its person and label (F1)", async () => {
      const giftList = await fixtures.createList(owner.id, {
        name: "Gift ideas",
      });
      const { token } = await fixtures.createAgentAccess(owner, {
        label: "claude-code",
      });
      const accessActor = await actorFromAgentToken(token);

      const [result] = await addItems(accessActor, {
        list: "gift ideas",
        items: [{ name: "Scarf", note: "for a relative" }],
      });

      expect(result.status).toBe("created");
      expect(result.item).toMatchObject({
        name: "Scarf",
        note: "for a relative",
      });
      const event = await prisma.listEvent.findFirstOrThrow({
        include: { command: true },
      });
      expect(event).toMatchObject({
        type: EVENT.itemCreated,
        listId: giftList.id,
      });
      expect(event.command).toMatchObject({
        actorUserId: owner.id,
        channel: "claude-code",
        origin: "tool",
        kind: "change",
      });
    });

    test("a list name matching several lists is an error naming them", async () => {
      const first = await fixtures.createList(owner.id, { name: "Shopping" });
      const second = await fixtures.createList(owner.id, { name: "shopping" });

      const error = await caughtServiceError(() =>
        addItems(actor, { list: "Shopping", items: ["Bread"] }),
      );

      expect(error.kind).toBe("invalid");
      expect(error.message).toContain(first.id);
      expect(error.message).toContain(second.id);
    });

    test("an unknown list name is an error listing the visible lists only", async () => {
      await fixtures.createList(owner.id, { name: "Groceries" });
      const stranger = await fixtures.createUser("stranger");
      await fixtures.createList(stranger.id, { name: "Hidden plans" });

      const error = await caughtServiceError(() =>
        addItems(actor, { list: "Hardware", items: ["Nails"] }),
      );

      expect(error.kind).toBe("not_found");
      expect(error.message).toContain("Groceries");
      expect(error.message).not.toContain("Hidden plans");
    });

    test("a foreign list's name is not resolved", async () => {
      const stranger = await fixtures.createUser("stranger");
      await fixtures.createList(stranger.id, { name: "Hidden plans" });

      const error = await caughtServiceError(() =>
        addItems(actor, { list: "Hidden plans", items: ["Nails"] }),
      );
      expect(error.kind).toBe("not_found");
    });
  });

  describe("reads", () => {
    test("list_lists returns the visible lists with their sections", async () => {
      const list = await fixtures.createList(owner.id, { name: "Groceries" });
      const section = await fixtures.createSection(list.id, "Dairy");
      await fixtures.createItem(list.id, { name: "Milk" });
      await fixtures.createItem(list.id, { name: "Bread", completed: true });
      await fixtures.createList(owner.id, { name: "Old", isArchived: true });
      const stranger = await fixtures.createUser("stranger");
      await fixtures.createList(stranger.id, { name: "Hidden" });

      const { lists } = await call<{ lists: unknown[] }>(
        actor,
        "list_lists",
        {},
      );

      expect(lists).toEqual([
        {
          id: list.id,
          name: "Groceries",
          archived: false,
          open_items: 1,
          sections: [{ id: section.id, name: "Dairy" }],
        },
      ]);

      const all = await call<{ lists: { name: string }[] }>(
        actor,
        "list_lists",
        { include_archived: true },
      );
      expect(all.lists.map((entry) => entry.name)).toEqual([
        "Groceries",
        "Old",
      ]);
    });

    test("list_lists for a household shows only shared lists", async () => {
      const partner = await fixtures.createUser("partner");
      await fixtures.createList(owner.id, {
        name: "Shared",
        contributorIds: [partner.id],
      });
      await fixtures.createList(owner.id, { name: "Private" });
      const household = householdActor([owner.id, partner.id], {
        accessId: null,
        channel: "test-household",
      });

      const { lists } = await call<{ lists: { name: string }[] }>(
        household,
        "list_lists",
        {},
      );
      expect(lists.map((entry) => entry.name)).toEqual(["Shared"]);
    });

    test("get_list returns open items by default and all on request", async () => {
      const list = await fixtures.createList(owner.id, { name: "Groceries" });
      const section = await fixtures.createSection(list.id, "Dairy");
      await fixtures.createItem(list.id, {
        name: "Milk",
        sectionID: section.id,
      });
      await fixtures.createItem(list.id, { name: "Bread", completed: true });

      const open = await call<{
        list: { id: string; name: string };
        sections: unknown[];
        items: { name: string; section: unknown }[];
      }>(actor, "get_list", { list: "Groceries" });
      expect(open.list).toMatchObject({ id: list.id, name: "Groceries" });
      expect(open.sections).toEqual([{ id: section.id, name: "Dairy" }]);
      expect(open.items.map((item) => item.name)).toEqual(["Milk"]);
      expect(open.items[0].section).toEqual({ id: section.id, name: "Dairy" });

      const all = await call<{ items: { name: string }[] }>(actor, "get_list", {
        list: list.id,
        filter: "all",
      });
      expect(all.items.map((item) => item.name).sort()).toEqual([
        "Bread",
        "Milk",
      ]);
    });

    test("get_list on a list the actor does not see is a forbidden error", async () => {
      const stranger = await fixtures.createUser("stranger");
      const hidden = await fixtures.createList(stranger.id);

      const error = await caughtServiceError(() =>
        call(actor, "get_list", { list: hidden.id }),
      );
      expect(error.kind).toBe("forbidden");
    });

    test("find_items searches all visible lists, including translations", async () => {
      const groceries = await fixtures.createList(owner.id, {
        name: "Groceries",
      });
      const market = await fixtures.createList(owner.id, { name: "Market" });
      await fixtures.createItem(groceries.id, { name: "coriander" });
      await fixtures.createItem(market.id, {
        name: "Fresh coriander",
        completed: true,
      });
      await fixtures.createItem(market.id, { name: "Parsley" });
      const stranger = await fixtures.createUser("stranger");
      const hidden = await fixtures.createList(stranger.id);
      await fixtures.createItem(hidden.id, { name: "coriander" });

      const found = await call<{
        items: { name: string; list: { name: string }; reason: string }[];
      }>(actor, "find_items", { query: "Koriander" });
      expect(
        found.items.map((item) => [item.name, item.list.name, item.reason]),
      ).toEqual([
        ["coriander", "Groceries", "alias"],
        ["Fresh coriander", "Market", "compound"],
      ]);

      const partial = await call<{ items: { name: string; reason: string }[] }>(
        actor,
        "find_items",
        { query: "pars" },
      );
      expect(partial.items.map((item) => [item.name, item.reason])).toEqual([
        ["Parsley", "contains"],
      ]);

      const contains = await call<{ items: { name: string }[] }>(
        actor,
        "find_items",
        { query: "coriander", include_completed: false },
      );
      expect(contains.items.map((item) => item.name)).toEqual(["coriander"]);

      const inList = await call<{ items: { name: string }[] }>(
        actor,
        "find_items",
        { list: "Market" },
      );
      expect(inList.items.map((item) => item.name).sort()).toEqual([
        "Fresh coriander",
        "Parsley",
      ]);
    });

    test("recent_changes lists only events of visible lists", async () => {
      const mine = await fixtures.createList(owner.id, { name: "Mine" });
      const stranger = await fixtures.createUser("stranger");
      const theirs = await fixtures.createList(stranger.id, { name: "Theirs" });
      await addItems(actor, { list: mine.id, items: ["Bread"] });
      await addItems(personActor(stranger.id), {
        list: theirs.id,
        items: ["Secret"],
      });

      const { changes } = await call<{
        changes: {
          type: string;
          list: { id: string; name: string };
          after: Record<string, unknown>;
          channel: string;
        }[];
      }>(actor, "recent_changes", {});

      expect(changes).toHaveLength(1);
      expect(changes[0]).toMatchObject({
        type: EVENT.itemCreated,
        list: { id: mine.id, name: "Mine" },
        channel: "test-agent",
      });
      expect(changes[0].after).toMatchObject({ name: "Bread" });
      expect(JSON.stringify(changes)).not.toContain("Secret");
    });
  });

  describe("writes", () => {
    test("set_item_completed and update_item change an item by id", async () => {
      const list = await fixtures.createList(owner.id);
      const dairy = await fixtures.createSection(list.id, "Dairy");
      const item = await fixtures.createItem(list.id, { name: "Milk" });

      const completed = await call<{ item: { completed: boolean } }>(
        actor,
        "set_item_completed",
        { item_id: item.id, completed: true },
      );
      expect(completed.item.completed).toBe(true);

      const updated = await call<{ item: Record<string, unknown> }>(
        actor,
        "update_item",
        { item_id: item.id, name: "Oat milk", note: "1 l", section: "dairy" },
      );
      expect(updated.item).toMatchObject({
        name: "Oat milk",
        note: "1 l",
        section: { id: dairy.id, name: "Dairy" },
      });

      const moved = await call<{ item: { section: unknown } }>(
        actor,
        "update_item",
        { item_id: item.id, section: null },
      );
      expect(moved.item.section).toBeNull();
      expect(await prisma.command.count()).toBe(3);
    });

    test("update_item needs at least one change", async () => {
      const list = await fixtures.createList(owner.id);
      const item = await fixtures.createItem(list.id);
      expect(
        await fixtures.caught(() =>
          call(actor, "update_item", { item_id: item.id }),
        ),
      ).toBeInstanceOf(ToolInputError);
    });

    test("create_list and create_section create by name", async () => {
      const { list } = await call<{ list: { id: string; name: string } }>(
        actor,
        "create_list",
        { name: "Hardware" },
      );
      expect(list.name).toBe("Hardware");

      const { section } = await call<{
        section: { id: string; name: string; list_id: string };
      }>(actor, "create_section", { list: "hardware", name: "Screws" });
      expect(section).toMatchObject({ name: "Screws", list_id: list.id });
      expect(await prisma.command.count()).toBe(2);
    });

    test("undo_last_command takes back the actor's last tool call", async () => {
      const list = await fixtures.createList(owner.id);
      await addItems(actor, { list: list.id, items: ["Bread"] });

      const result = await call<{
        status: string;
        reverted: { type: string }[];
        hidden_skipped_count: number;
      }>(actor, "undo_last_command", {});

      expect(result.status).toBe("undone");
      expect(result.reverted.map((entry) => entry.type)).toEqual([
        EVENT.itemCreated,
      ]);
      expect(result.hidden_skipped_count).toBe(0);
      expect(await prisma.item.count()).toBe(0);

      const again = await call<{ status: string }>(
        actor,
        "undo_last_command",
        {},
      );
      expect(again.status).toBe("nothing_to_undo");
    });

    test("a tool call publishes the change to the live bus", async () => {
      const partner = await fixtures.createUser("partner");
      const list = await fixtures.createList(owner.id, {
        contributorIds: [partner.id],
      });

      await addItems(actor, { list: list.id, items: ["Bread"] });

      expect(published).toHaveLength(1);
      expect(published[0].listIds).toEqual([list.id]);
      expect(published[0].recipientUserIds.sort()).toEqual(
        [owner.id, partner.id].sort(),
      );
    });
  });
});
