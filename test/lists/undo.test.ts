import { beforeEach, describe, expect, test } from "bun:test";
import { prisma } from "db/prisma";
import { householdActor, personActor } from "server/lists/actor";
import { CommandContext } from "server/lists/command";
import { EVENT } from "server/lists/events";
import {
  createItem,
  deleteItem,
  reorderItems,
  setItemCompleted,
  updateItem,
} from "server/lists/itemService";
import {
  createSection,
  deleteList,
  deleteSection,
} from "server/lists/listService";
import { undoLastCommand } from "server/lists/undo";
import { liveBus, type ListChange } from "server/live/bus";
import { resetDatabase } from "../setup/db";
import * as fixtures from "./fixtures";

const itemById = (id: string) => prisma.item.findUnique({ where: { id } });

describe("undo", () => {
  beforeEach(resetDatabase);

  test("covers G-AE5: two completions and one creation are fully undone", async () => {
    const a = await fixtures.createUser("person-a");
    const list = await fixtures.createList(a.id);
    const milk = await fixtures.createItem(list.id, { name: "Milk" });
    const bread = await fixtures.createItem(list.id, { name: "Bread" });
    const actor = personActor(a.id, {
      channel: "claude-code",
      origin: "agent",
    });
    const ctx = new CommandContext(actor, {
      inputText: "milk and bread done, add eggs",
    });

    await setItemCompleted(ctx, milk.id, true);
    await setItemCompleted(ctx, bread.id, true);
    const eggs = await createItem(ctx, { listId: list.id, name: "Eggs" });

    const result = await undoLastCommand(actor, { inputText: "undo" });

    expect(result.status).toBe("undone");
    expect(result.commandId).toBe(ctx.commandId!);
    expect(result.reverted.map((entry) => entry.type)).toEqual([
      EVENT.itemCreated,
      EVENT.itemCompleted,
      EVENT.itemCompleted,
    ]);
    expect(result.skipped).toEqual([]);
    expect(result.hiddenSkippedCount).toBe(0);
    expect((await itemById(milk.id))?.completed).toBe(false);
    expect((await itemById(bread.id))?.completed).toBe(false);
    expect(await itemById(eggs.id)).toBeNull();

    const original = await prisma.command.findUniqueOrThrow({
      where: { id: ctx.commandId! },
    });
    expect(original.undoState).toBe("undone");
    expect(original.undoneAt).not.toBeNull();
    const undoCommand = await prisma.command.findUniqueOrThrow({
      where: { id: result.undoCommandId! },
      include: { events: { orderBy: { seq: "asc" } } },
    });
    expect(undoCommand).toMatchObject({
      kind: "undo",
      undoOfId: ctx.commandId,
      inputText: "undo",
      actorUserId: a.id,
    });
    expect(undoCommand.events.map((event) => event.type)).toEqual([
      EVENT.itemDeleted,
      EVENT.itemReopened,
      EVENT.itemReopened,
    ]);
  });

  test("covers AE10: undo over another channel takes back only the person's own command", async () => {
    const a = await fixtures.createUser("person-a");
    const b = await fixtures.createUser("person-b");
    const list = await fixtures.createList(a.id, { contributorIds: [b.id] });
    const milk = await fixtures.createItem(list.id, { name: "Milk" });
    const bread = await fixtures.createItem(list.id, { name: "Bread" });
    const viaAgent = personActor(a.id, {
      channel: "claude-code",
      origin: "agent",
    });

    const ctx = new CommandContext(viaAgent);
    const eggs = await createItem(ctx, { listId: list.id, name: "Eggs" });
    await setItemCompleted(ctx, milk.id, true);
    await setItemCompleted(
      new CommandContext(personActor(b.id)),
      bread.id,
      true,
    );

    const result = await undoLastCommand(personActor(a.id));

    expect(result.status).toBe("undone");
    expect(result.commandId).toBe(ctx.commandId!);
    expect(await itemById(eggs.id)).toBeNull();
    expect((await itemById(milk.id))?.completed).toBe(false);
    expect((await itemById(bread.id))?.completed).toBe(true);
  });

  test("a field changed by someone else is skipped and the command becomes partial", async () => {
    const a = await fixtures.createUser("person-a");
    const b = await fixtures.createUser("person-b");
    const list = await fixtures.createList(a.id, { contributorIds: [b.id] });
    const item = await fixtures.createItem(list.id, { name: "Milk" });

    const ctx = new CommandContext(personActor(a.id));
    await updateItem(ctx, item.id, {
      name: "Oat milk",
      description: "1 litre",
    });
    await updateItem(new CommandContext(personActor(b.id)), item.id, {
      name: "Soy milk",
    });

    const result = await undoLastCommand(personActor(a.id));

    expect(result.status).toBe("partial");
    expect(result.reverted).toEqual([
      expect.objectContaining({
        type: EVENT.itemNoteSet,
        fields: ["description"],
      }),
    ]);
    expect(result.skipped).toEqual([
      expect.objectContaining({
        type: EVENT.itemRenamed,
        itemId: item.id,
        fields: ["name"],
        reason: "field_changed",
      }),
    ]);
    const current = await itemById(item.id);
    expect(current).toMatchObject({ name: "Soy milk", description: "" });
    expect(
      (
        await prisma.command.findUniqueOrThrow({
          where: { id: ctx.commandId! },
        })
      ).undoState,
    ).toBe("partial");
  });

  test("undo without an open command reports nothing to undo", async () => {
    const a = await fixtures.createUser("person-a");

    const result = await undoLastCommand(personActor(a.id));

    expect(result).toMatchObject({
      status: "nothing_to_undo",
      commandId: null,
      undoCommandId: null,
      reverted: [],
      skipped: [],
      hiddenSkippedCount: 0,
    });
    expect(await prisma.command.count()).toBe(0);
  });

  test("an already undone command is skipped and the next older one is undone", async () => {
    const a = await fixtures.createUser("person-a");
    const list = await fixtures.createList(a.id);
    const milk = await fixtures.createItem(list.id, { name: "Milk" });
    const bread = await fixtures.createItem(list.id, { name: "Bread" });
    const first = new CommandContext(personActor(a.id));
    const second = new CommandContext(personActor(a.id));
    await setItemCompleted(first, milk.id, true);
    await setItemCompleted(second, bread.id, true);

    expect((await undoLastCommand(personActor(a.id))).commandId).toBe(
      second.commandId!,
    );
    const result = await undoLastCommand(personActor(a.id));

    expect(result.commandId).toBe(first.commandId!);
    expect((await itemById(milk.id))?.completed).toBe(false);
    expect((await undoLastCommand(personActor(a.id))).status).toBe(
      "nothing_to_undo",
    );
  });

  test("a reorder and an event-less command after a change do not block its undo", async () => {
    const a = await fixtures.createUser("person-a");
    const list = await fixtures.createList(a.id);
    const milk = await fixtures.createItem(list.id, { name: "Milk", order: 0 });
    const bread = await fixtures.createItem(list.id, {
      name: "Bread",
      order: 1,
    });
    const change = new CommandContext(personActor(a.id));
    await setItemCompleted(change, milk.id, true);
    await reorderItems(new CommandContext(personActor(a.id)), list.id, [
      { id: milk.id, order: 1 },
      { id: bread.id, order: 0 },
    ]);
    await CommandContext.start(
      personActor(a.id, { origin: "agent", channel: "claude-code" }),
      {
        inputText: "what is on the list?",
      },
    );

    const result = await undoLastCommand(personActor(a.id));

    expect(result.commandId).toBe(change.commandId!);
    expect((await itemById(milk.id))?.completed).toBe(false);
  });

  test("a household acting as B cannot undo B's change on B's private list", async () => {
    const a = await fixtures.createUser("person-a");
    const b = await fixtures.createUser("person-b");
    const privateList = await fixtures.createList(b.id);
    const item = await fixtures.createItem(privateList.id);
    const ctx = new CommandContext(personActor(b.id));
    await setItemCompleted(ctx, item.id, true);

    const household = householdActor([a.id, b.id], {
      actingUserId: b.id,
      accessId: null,
      channel: "household",
    });
    const result = await undoLastCommand(household);

    expect(result).toMatchObject({
      status: "nothing_to_undo",
      reverted: [],
      skipped: [],
      hiddenSkippedCount: 1,
    });
    expect((await itemById(item.id))?.completed).toBe(true);
    expect(
      (
        await prisma.command.findUniqueOrThrow({
          where: { id: ctx.commandId! },
        })
      ).undoState,
    ).toBe("none");

    // B can still undo it personally.
    expect((await undoLastCommand(personActor(b.id))).status).toBe("undone");
  });

  test("events on invisible lists are counted, visible ones are undone", async () => {
    const a = await fixtures.createUser("person-a");
    const b = await fixtures.createUser("person-b");
    const shared = await fixtures.createList(a.id, { contributorIds: [b.id] });
    const privateList = await fixtures.createList(b.id);
    const sharedItem = await fixtures.createItem(shared.id);
    const privateItem = await fixtures.createItem(privateList.id);
    const ctx = new CommandContext(personActor(b.id));
    await setItemCompleted(ctx, sharedItem.id, true);
    await setItemCompleted(ctx, privateItem.id, true);

    const result = await undoLastCommand(
      householdActor([a.id, b.id], {
        actingUserId: b.id,
        accessId: null,
        channel: "household",
      }),
    );

    expect(result.status).toBe("partial");
    expect(result.hiddenSkippedCount).toBe(1);
    expect(result.reverted.map((entry) => entry.itemId)).toEqual([
      sharedItem.id,
    ]);
    expect(JSON.stringify(result)).not.toContain(privateItem.id);
    expect(JSON.stringify(result)).not.toContain(privateList.id);
  });

  test("without an acting person undo uses the same access", async () => {
    const a = await fixtures.createUser("person-a");
    const b = await fixtures.createUser("person-b");
    const shared = await fixtures.createList(a.id, { contributorIds: [b.id] });
    const item = await fixtures.createItem(shared.id);
    const access = await prisma.agentAccess.create({
      data: {
        label: "household",
        kind: "household",
        tokenId: "abcd1234",
        tokenHash: "hash",
        createdById: a.id,
        members: { connect: [{ id: a.id }, { id: b.id }] },
      },
    });
    const household = householdActor([a.id, b.id], {
      accessId: access.id,
      channel: "household",
    });
    const ctx = new CommandContext(household);
    await setItemCompleted(ctx, item.id, true);

    expect((await undoLastCommand(personActor(a.id))).status).toBe(
      "nothing_to_undo",
    );
    const result = await undoLastCommand(household);

    expect(result.commandId).toBe(ctx.commandId!);
    expect((await itemById(item.id))?.completed).toBe(false);
  });

  test("undoing an item deletion restores it without section when the section is gone", async () => {
    const a = await fixtures.createUser("person-a");
    const b = await fixtures.createUser("person-b");
    const list = await fixtures.createList(a.id, { contributorIds: [b.id] });
    const section = await fixtures.createSection(list.id);
    const item = await fixtures.createItem(list.id, {
      name: "Milk",
      sectionID: section.id,
      completed: true,
      order: 4,
    });
    await deleteItem(new CommandContext(personActor(a.id)), item.id);
    await deleteSection(new CommandContext(personActor(b.id)), section.id);

    const result = await undoLastCommand(personActor(a.id));

    expect(result.status).toBe("undone");
    const restored = await itemById(item.id);
    expect(restored).toMatchObject({
      id: item.id,
      name: "Milk",
      completed: true,
      sectionID: null,
      order: 4,
      listID: list.id,
    });
    expect(restored?.createdDate.toISOString()).toBe(
      item.createdDate.toISOString(),
    );
  });

  test("undoing an item deletion keeps its section when it still exists", async () => {
    const a = await fixtures.createUser("person-a");
    const list = await fixtures.createList(a.id);
    const section = await fixtures.createSection(list.id);
    const item = await fixtures.createItem(list.id, { sectionID: section.id });
    await deleteItem(new CommandContext(personActor(a.id)), item.id);

    await undoLastCommand(personActor(a.id));

    expect((await itemById(item.id))?.sectionID).toBe(section.id);
  });

  test("a created item that was changed since is not deleted by undo", async () => {
    const a = await fixtures.createUser("person-a");
    const b = await fixtures.createUser("person-b");
    const list = await fixtures.createList(a.id, { contributorIds: [b.id] });
    const item = await createItem(new CommandContext(personActor(a.id)), {
      listId: list.id,
      name: "Milk",
    });
    await setItemCompleted(
      new CommandContext(personActor(b.id)),
      item.id,
      true,
    );

    const result = await undoLastCommand(personActor(a.id));

    expect(result.status).toBe("partial");
    expect(result.skipped).toEqual([
      expect.objectContaining({ type: EVENT.itemCreated, reason: "changed" }),
    ]);
    expect(await itemById(item.id)).not.toBeNull();
  });

  test("deleted sections and lists are not undoable", async () => {
    const a = await fixtures.createUser("person-a");
    const list = await fixtures.createList(a.id);
    const section = await fixtures.createSection(list.id);
    await fixtures.createItem(list.id, { sectionID: section.id });
    await deleteSection(new CommandContext(personActor(a.id)), section.id);

    const sectionResult = await undoLastCommand(personActor(a.id));
    expect(sectionResult.status).toBe("partial");
    expect(sectionResult.reverted).toEqual([]);
    expect(
      sectionResult.skipped.map((entry) => [entry.type, entry.reason]),
    ).toEqual([
      [EVENT.sectionDeleted, "not_undoable"],
      [EVENT.itemDeleted, "not_undoable"],
    ]);
    expect(await prisma.section.count()).toBe(0);
    expect(await prisma.item.count()).toBe(0);

    await deleteList(new CommandContext(personActor(a.id)), list.id);
    const listResult = await undoLastCommand(personActor(a.id));
    expect(listResult.status).toBe("partial");
    expect(listResult.skipped.map((entry) => entry.reason)).toEqual([
      "not_undoable",
    ]);
    expect(await prisma.list.count()).toBe(0);
  });

  test("undoing a section creation removes the still empty section", async () => {
    const a = await fixtures.createUser("person-a");
    const list = await fixtures.createList(a.id);
    const section = await createSection(new CommandContext(personActor(a.id)), {
      listId: list.id,
      name: "Dairy",
    });

    const result = await undoLastCommand(personActor(a.id));

    expect(result.status).toBe("undone");
    expect(
      await prisma.section.findUnique({ where: { id: section.id } }),
    ).toBeNull();
  });

  test("undo publishes one bus message for the reverted lists", async () => {
    const a = await fixtures.createUser("person-a");
    const list = await fixtures.createList(a.id);
    const item = await fixtures.createItem(list.id);
    await setItemCompleted(
      new CommandContext(personActor(a.id)),
      item.id,
      true,
    );
    const published: ListChange[] = [];
    const unsubscribe = liveBus.subscribe((change) => published.push(change));

    try {
      const result = await undoLastCommand(
        personActor(a.id, { clientId: "tab-2" }),
      );
      expect(published).toEqual([
        {
          listIds: [list.id],
          commandId: result.undoCommandId,
          clientId: "tab-2",
          recipientUserIds: [a.id],
        },
      ]);
    } finally {
      unsubscribe();
    }
  });
});
