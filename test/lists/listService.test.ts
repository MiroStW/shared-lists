import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { prisma } from "db/prisma";
import { ListServiceError } from "server/lists/access";
import { householdActor, personActor } from "server/lists/actor";
import { CommandContext, runWrite } from "server/lists/command";
import { EVENT } from "server/lists/events";
import {
  createItem,
  deleteItem,
  reorderItems,
  setItemCompleted,
  setItemSection,
  updateItem,
} from "server/lists/itemService";
import {
  createList,
  createSection,
  deleteList,
  deleteSection,
  getList,
  getRecentEvents,
  setListArchived,
} from "server/lists/listService";
import { liveBus, type ListChange } from "server/live/bus";
import { resetDatabase } from "../setup/db";
import * as fixtures from "./fixtures";

let published: ListChange[] = [];
let unsubscribe: () => void = () => {};

describe("list service", () => {
  beforeEach(async () => {
    await resetDatabase();
    published = [];
    unsubscribe = liveBus.subscribe((change) => published.push(change));
  });

  afterEach(() => unsubscribe());

  test("creating an item writes a command with one item.created event", async () => {
    const a = await fixtures.createUser("person-a");
    const list = await fixtures.createList(a.id);
    const section = await fixtures.createSection(list.id);
    const ctx = new CommandContext(personActor(a.id));

    const item = await createItem(ctx, {
      listId: list.id,
      name: "Milk",
      sectionId: section.id,
      description: "2 litres",
    });

    expect(item.normalized).toBe("milk");
    const command = await prisma.command.findUniqueOrThrow({
      where: { id: ctx.commandId! },
      include: { events: true },
    });
    expect(command).toMatchObject({
      actorUserId: a.id,
      accessId: null,
      channel: "web",
      origin: "web",
      kind: "change",
      undoState: "none",
    });
    expect(command.events).toHaveLength(1);
    expect(command.events[0]).toMatchObject({
      type: EVENT.itemCreated,
      listId: list.id,
      itemId: item.id,
      sectionId: section.id,
      before: null,
      after: {
        name: "Milk",
        sectionID: section.id,
        description: "2 litres",
        completed: false,
      },
    });
  });

  test("completing an item writes item.completed with before and after", async () => {
    const a = await fixtures.createUser("person-a");
    const list = await fixtures.createList(a.id);
    const item = await fixtures.createItem(list.id);
    const ctx = new CommandContext(personActor(a.id));

    await setItemCompleted(ctx, item.id, true);

    const [event] = await fixtures.eventsOf(ctx.commandId!);
    expect(event).toMatchObject({
      type: EVENT.itemCompleted,
      itemId: item.id,
      before: { completed: false },
      after: { completed: true },
    });

    const reopenCtx = new CommandContext(personActor(a.id));
    await setItemCompleted(reopenCtx, item.id, false);
    const [reopened] = await fixtures.eventsOf(reopenCtx.commandId!);
    expect(reopened.type).toBe(EVENT.itemReopened);
  });

  test("an update without an actual change writes no command", async () => {
    const a = await fixtures.createUser("person-a");
    const list = await fixtures.createList(a.id);
    const item = await fixtures.createItem(list.id, { name: "Milk" });
    const ctx = new CommandContext(personActor(a.id));

    await updateItem(ctx, item.id, { name: "Milk", completed: false });

    expect(ctx.commandId).toBeNull();
    expect(await fixtures.countCommandsAndEvents()).toEqual({
      commands: 0,
      events: 0,
    });
  });

  test("an empty name is rejected as invalid without writing anything", async () => {
    const a = await fixtures.createUser("person-a");
    const list = await fixtures.createList(a.id);
    const item = await fixtures.createItem(list.id, { name: "Milk" });
    const ctx = new CommandContext(personActor(a.id));

    for (const attempt of [
      () => createItem(ctx, { listId: list.id, name: "" }),
      () => updateItem(ctx, item.id, { name: "" }),
      () => createList(ctx, { name: "" }),
    ]) {
      const error = await fixtures.caught(attempt);
      expect(error).toBeInstanceOf(ListServiceError);
      expect((error as ListServiceError).kind).toBe("invalid");
    }
    expect(await fixtures.countCommandsAndEvents()).toEqual({
      commands: 0,
      events: 0,
    });
    expect(published).toEqual([]);
  });

  test("a pure reorder writes no event, a section move writes item.section_set", async () => {
    const a = await fixtures.createUser("person-a");
    const list = await fixtures.createList(a.id);
    const section = await fixtures.createSection(list.id);
    const first = await fixtures.createItem(list.id, { order: 0 });
    const second = await fixtures.createItem(list.id, { order: 1 });

    const reorderCtx = new CommandContext(personActor(a.id));
    await reorderItems(reorderCtx, list.id, [
      { id: first.id, order: 1, sectionId: null },
      { id: second.id, order: 0, sectionId: null },
    ]);
    expect(reorderCtx.commandId).toBeNull();
    expect(await fixtures.countCommandsAndEvents()).toEqual({
      commands: 0,
      events: 0,
    });
    expect(
      (await prisma.item.findUniqueOrThrow({ where: { id: first.id } })).order,
    ).toBe(1);
    expect(published).toHaveLength(1);
    expect(published[0].commandId).toBeNull();

    const moveCtx = new CommandContext(personActor(a.id));
    await reorderItems(moveCtx, list.id, [
      { id: first.id, order: 0, sectionId: section.id },
    ]);
    const events = await fixtures.eventsOf(moveCtx.commandId!);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: EVENT.itemSectionSet,
      itemId: first.id,
      before: { sectionID: null },
      after: { sectionID: section.id },
    });
  });

  test("two operations in the same command context share one command", async () => {
    const a = await fixtures.createUser("person-a");
    const list = await fixtures.createList(a.id);
    const item = await fixtures.createItem(list.id);
    const ctx = new CommandContext(personActor(a.id), {
      inputText: "milk and bread",
    });

    await setItemCompleted(ctx, item.id, true);
    await createItem(ctx, { listId: list.id, name: "Bread" });

    expect(await prisma.command.count()).toBe(1);
    const events = await fixtures.eventsOf(ctx.commandId!);
    expect(events.map((event) => event.type)).toEqual([
      EVENT.itemCompleted,
      EVENT.itemCreated,
    ]);
    expect(
      (
        await prisma.command.findUniqueOrThrow({
          where: { id: ctx.commandId! },
        })
      ).inputText,
    ).toBe("milk and bread");
  });

  test("a command can start up-front and next() opens a fresh command for the same sentence", async () => {
    const a = await fixtures.createUser("person-a");
    const list = await fixtures.createList(a.id);
    const actor = personActor(a.id, {
      channel: "claude-code",
      origin: "agent",
    });

    const ctx = await CommandContext.start(actor, { inputText: "add milk" });
    expect(ctx.commandId).not.toBeNull();
    await createItem(ctx, { listId: list.id, name: "Milk" });
    expect(await fixtures.eventsOf(ctx.commandId!)).toHaveLength(1);

    const nextCtx = ctx.next();
    expect(nextCtx.commandId).toBeNull();
    await createItem(nextCtx, { listId: list.id, name: "Bread" });

    expect(nextCtx.commandId).not.toBe(ctx.commandId);
    const commands = await prisma.command.findMany({ orderBy: { seq: "asc" } });
    expect(
      commands.map((command) => [
        command.inputText,
        command.origin,
        command.kind,
      ]),
    ).toEqual([
      ["add milk", "agent", "change"],
      ["add milk", "agent", "change"],
    ]);
  });

  test("deleting a section with two items writes two item.deleted and one section.deleted", async () => {
    const a = await fixtures.createUser("person-a");
    const list = await fixtures.createList(a.id);
    const section = await fixtures.createSection(list.id, "Dairy");
    const milk = await fixtures.createItem(list.id, {
      name: "Milk",
      sectionID: section.id,
    });
    const butter = await fixtures.createItem(list.id, {
      name: "Butter",
      sectionID: section.id,
      completed: true,
    });
    const ctx = new CommandContext(personActor(a.id));

    await deleteSection(ctx, section.id);

    const events = await fixtures.eventsOf(ctx.commandId!);
    expect(events.map((event) => event.type)).toEqual([
      EVENT.itemDeleted,
      EVENT.itemDeleted,
      EVENT.sectionDeleted,
    ]);
    expect(
      events
        .slice(0, 2)
        .map((event) => event.itemId)
        .sort(),
    ).toEqual([milk.id, butter.id].sort());
    const butterEvent = events.find((event) => event.itemId === butter.id);
    expect(butterEvent?.before).toMatchObject({
      name: "Butter",
      completed: true,
      sectionID: section.id,
    });
    expect(events[2]).toMatchObject({
      sectionId: section.id,
      before: { name: "Dairy" },
    });
    expect(await prisma.item.count()).toBe(0);
  });

  test("deleting a list logs every contained item before the list", async () => {
    const a = await fixtures.createUser("person-a");
    const list = await fixtures.createList(a.id, { name: "Groceries" });
    await fixtures.createItem(list.id, { name: "Milk" });
    await fixtures.createItem(list.id, { name: "Bread" });
    const ctx = new CommandContext(personActor(a.id));

    await deleteList(ctx, list.id);

    const events = await fixtures.eventsOf(ctx.commandId!);
    expect(events.map((event) => event.type)).toEqual([
      EVENT.itemDeleted,
      EVENT.itemDeleted,
      EVENT.listDeleted,
    ]);
    expect(await prisma.list.count()).toBe(0);
    expect(published).toHaveLength(1);
    expect(published[0].recipientUserIds).toEqual([a.id]);
  });

  test("deleting an item stores a full snapshot", async () => {
    const a = await fixtures.createUser("person-a");
    const list = await fixtures.createList(a.id);
    const item = await fixtures.createItem(list.id, { name: "Milk", order: 3 });
    const ctx = new CommandContext(personActor(a.id));

    await deleteItem(ctx, item.id);

    const [event] = await fixtures.eventsOf(ctx.commandId!);
    expect(event.type).toBe(EVENT.itemDeleted);
    expect(event.before).toMatchObject({
      name: "Milk",
      completed: false,
      description: "",
      sectionID: null,
      order: 3,
      createdDate: item.createdDate.toISOString(),
    });
  });

  test("list and section changes are logged", async () => {
    const a = await fixtures.createUser("person-a");
    const ctx = new CommandContext(personActor(a.id));

    const list = await createList(ctx, { name: "Hardware" });
    const section = await createSection(ctx, {
      listId: list.id,
      name: "Tools",
    });
    await setListArchived(ctx, list.id, true);

    const events = await fixtures.eventsOf(ctx.commandId!);
    expect(events.map((event) => [event.type, event.after])).toEqual([
      [EVENT.listCreated, { name: "Hardware" }],
      [EVENT.sectionCreated, { name: "Tools" }],
      [EVENT.listArchived, { isArchived: true }],
    ]);
    expect(events[1].sectionId).toBe(section.id);
    expect(list.ownerID).toBe(a.id);
  });

  test("a household creates a list owned by the acting user and shared with the other members", async () => {
    const a = await fixtures.createUser("person-a");
    const b = await fixtures.createUser("person-b");
    const household = householdActor([a.id, b.id], {
      actingUserId: b.id,
      accessId: null,
      channel: "household",
    });

    const list = await createList(new CommandContext(household), {
      name: "Party",
    });

    const loaded = await getList(household, list.id);
    expect(loaded.ownerID).toBe(b.id);
    expect(loaded.contributors.map((user) => user.id)).toEqual([a.id]);
  });

  test("getList returns sections by creation and items by order", async () => {
    const a = await fixtures.createUser("person-a");
    const list = await fixtures.createList(a.id);
    const section = await fixtures.createSection(list.id);
    const late = await fixtures.createItem(list.id, { order: 2 });
    const early = await fixtures.createItem(list.id, {
      order: 1,
      sectionID: section.id,
    });

    const loaded = await getList(personActor(a.id), list.id);

    expect(loaded.sections.map((s) => s.id)).toEqual([section.id]);
    expect(loaded.items.map((item) => item.id)).toEqual([early.id, late.id]);
  });

  test("the bus gets exactly one message after commit and none after a rollback", async () => {
    const a = await fixtures.createUser("person-a");
    const list = await fixtures.createList(a.id);
    const actor = personActor(a.id, { clientId: "tab-1" });

    const ctx = new CommandContext(actor);
    await createItem(ctx, { listId: list.id, name: "Milk" });
    expect(published).toEqual([
      {
        listIds: [list.id],
        commandId: ctx.commandId,
        clientId: "tab-1",
        recipientUserIds: [a.id],
      },
    ]);

    published = [];
    const failing = new CommandContext(actor);
    const error = await fixtures.caught(() =>
      runWrite(failing, async (scope) => {
        await scope.tx.item.create({
          data: { listID: list.id, name: "Ghost" },
        });
        scope.record({
          type: EVENT.itemCreated,
          listId: list.id,
          after: { name: "Ghost" },
        });
        throw new Error("boom");
      }),
    );

    expect((error as Error).message).toBe("boom");
    expect(published).toEqual([]);
    expect(failing.commandId).toBeNull();
    expect(await prisma.item.count()).toBe(1);
    expect(await prisma.command.count()).toBe(1);
  });

  test("covers F1: a change on a shared list names owner and contributors as recipients", async () => {
    const a = await fixtures.createUser("person-a");
    const b = await fixtures.createUser("person-b");
    const list = await fixtures.createList(b.id, { contributorIds: [a.id] });
    const item = await fixtures.createItem(list.id);

    await setItemSection(new CommandContext(personActor(a.id)), item.id, null);
    expect(published).toHaveLength(0);

    await setItemCompleted(
      new CommandContext(personActor(a.id)),
      item.id,
      true,
    );
    expect(published).toHaveLength(1);
    expect([...published[0].recipientUserIds].sort()).toEqual(
      [a.id, b.id].sort(),
    );
  });

  test("history for a household holds no events from lists outside the intersection", async () => {
    const a = await fixtures.createUser("person-a");
    const b = await fixtures.createUser("person-b");
    const shared = await fixtures.createList(a.id, { contributorIds: [b.id] });
    const privateList = await fixtures.createList(b.id);
    const sharedItem = await fixtures.createItem(shared.id);
    const privateItem = await fixtures.createItem(privateList.id);

    await setItemCompleted(
      new CommandContext(personActor(b.id)),
      sharedItem.id,
      true,
    );
    await setItemCompleted(
      new CommandContext(personActor(b.id)),
      privateItem.id,
      true,
    );

    const household = householdActor([a.id, b.id], {
      actingUserId: b.id,
      accessId: null,
      channel: "household",
    });
    const history = await getRecentEvents(household, { limit: 10 });

    expect(history.map((event) => event.listId)).toEqual([shared.id]);
    expect(history[0].command).toMatchObject({
      actorUserId: b.id,
      channel: "web",
    });

    const personal = await getRecentEvents(personActor(b.id), { limit: 10 });
    expect(personal.map((event) => event.itemId)).toEqual([
      privateItem.id,
      sharedItem.id,
    ]);
  });
});
