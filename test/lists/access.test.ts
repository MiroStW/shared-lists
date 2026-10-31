import { beforeEach, describe, expect, test } from "bun:test";
import { prisma } from "db/prisma";
import { householdActor, personActor } from "server/lists/actor";
import { ListServiceError } from "server/lists/access";
import { CommandContext } from "server/lists/command";
import {
  createItem as createItemViaService,
  reorderItems,
  updateItem,
} from "server/lists/itemService";
import {
  findItems,
  getList,
  getVisibleLists,
  renameList,
} from "server/lists/listService";
import { resetDatabase } from "../setup/db";
import {
  caught,
  countCommandsAndEvents,
  createItem,
  createList,
  createSection,
  createUser,
} from "./fixtures";

const expectServiceError = (error: unknown, kind: ListServiceError["kind"]) => {
  expect(error).toBeInstanceOf(ListServiceError);
  expect((error as ListServiceError).kind).toBe(kind);
};

describe("list access", () => {
  beforeEach(resetDatabase);

  test("a person sees own and shared lists, not foreign ones", async () => {
    const a = await createUser("person-a");
    const b = await createUser("person-b");
    const c = await createUser("person-c");
    const own = await createList(a.id, { name: "own" });
    const shared = await createList(b.id, {
      name: "shared",
      contributorIds: [a.id],
    });
    await createList(c.id, { name: "foreign" });
    await createList(a.id, { name: "archived", isArchived: true });

    const lists = await getVisibleLists(personActor(a.id));

    expect(lists.map((list) => list.id)).toEqual([own.id, shared.id]);
  });

  test("visible lists carry owner and contributors without password hashes", async () => {
    const a = await createUser("person-a");
    const b = await createUser("person-b");
    await createList(a.id, { contributorIds: [b.id] });

    const [list] = await getVisibleLists(personActor(a.id));

    expect(list.owner).toEqual({
      id: a.id,
      name: a.name,
      email: a.email,
      image: null,
    });
    expect(list.contributors).toEqual([
      { id: b.id, name: b.name, email: b.email, image: null },
    ]);
    expect(JSON.stringify(list)).not.toContain("passwordHash");
  });

  test("covers AE8: a household sees only lists both members take part in", async () => {
    const a = await createUser("person-a");
    const b = await createUser("person-b");
    const sharedByA = await createList(a.id, {
      name: "a-shared",
      contributorIds: [b.id],
    });
    const sharedByB = await createList(b.id, {
      name: "b-shared",
      contributorIds: [a.id],
    });
    await createList(a.id, { name: "a-private" });
    await createList(b.id, { name: "b-private" });

    const household = householdActor([a.id, b.id], {
      accessId: null,
      channel: "household",
    });
    const lists = await getVisibleLists(household);

    expect(lists.map((list) => list.id).sort()).toEqual(
      [sharedByA.id, sharedByB.id].sort(),
    );
  });

  test("writing to an invisible list throws forbidden and writes no command or event", async () => {
    const a = await createUser("person-a");
    const c = await createUser("person-c");
    const foreign = await createList(c.id);

    const error = await caught(() =>
      createItemViaService(new CommandContext(personActor(a.id)), {
        listId: foreign.id,
        name: "Milk",
      }),
    );

    expectServiceError(error, "forbidden");
    expect(await countCommandsAndEvents()).toEqual({ commands: 0, events: 0 });
    expect(await prisma.item.count()).toBe(0);
  });

  test("a missing list is not_found, an invisible one is forbidden", async () => {
    const a = await createUser("person-a");
    const c = await createUser("person-c");
    const foreign = await createList(c.id);

    expectServiceError(
      await caught(() => getList(personActor(a.id), "missing")),
      "not_found",
    );
    expectServiceError(
      await caught(() => getList(personActor(a.id), foreign.id)),
      "forbidden",
    );
  });

  test("updating an item on an invisible list is forbidden, a missing item not_found", async () => {
    const a = await createUser("person-a");
    const c = await createUser("person-c");
    const foreign = await createList(c.id);
    const item = await createItem(foreign.id, { name: "Milk" });
    const ctx = new CommandContext(personActor(a.id));

    expectServiceError(
      await caught(() => updateItem(ctx, item.id, { completed: true })),
      "forbidden",
    );
    expectServiceError(
      await caught(() => updateItem(ctx, "missing", { completed: true })),
      "not_found",
    );
    expect(
      (await prisma.item.findUniqueOrThrow({ where: { id: item.id } }))
        .completed,
    ).toBe(false);
  });

  test("list metadata stays owner-only: a contributor cannot rename", async () => {
    const a = await createUser("person-a");
    const b = await createUser("person-b");
    const list = await createList(a.id, {
      name: "old",
      contributorIds: [b.id],
    });

    expectServiceError(
      await caught(() =>
        renameList(new CommandContext(personActor(b.id)), list.id, "new"),
      ),
      "forbidden",
    );
    const renamed = await renameList(
      new CommandContext(personActor(a.id)),
      list.id,
      "new",
    );
    expect(renamed.name).toBe("new");
  });

  test("an acting user must be a member of the household", async () => {
    const a = await createUser("person-a");
    const b = await createUser("person-b");
    const c = await createUser("person-c");

    const error = await caught(() =>
      getVisibleLists(
        householdActor([a.id, b.id], {
          actingUserId: c.id,
          accessId: null,
          channel: "household",
        }),
      ),
    );

    expectServiceError(error, "forbidden");
  });

  test("reorder rejects items of another list and changes nothing", async () => {
    const a = await createUser("person-a");
    const list = await createList(a.id);
    const otherList = await createList(a.id);
    const own = await createItem(list.id, { order: 0 });
    const other = await createItem(otherList.id, { order: 0 });

    const error = await caught(() =>
      reorderItems(new CommandContext(personActor(a.id)), list.id, [
        { id: own.id, order: 1 },
        { id: other.id, order: 2 },
      ]),
    );

    expectServiceError(error, "not_found");
    const items = await prisma.item.findMany({ orderBy: { id: "asc" } });
    expect(items.map((item) => [item.listID, item.order]).sort()).toEqual(
      [
        [list.id, 0],
        [otherList.id, 0],
      ].sort(),
    );
  });

  test("an item cannot be placed in a section of another list", async () => {
    const a = await createUser("person-a");
    const list = await createList(a.id);
    const otherList = await createList(a.id);
    const foreignSection = await createSection(otherList.id);

    const error = await caught(() =>
      createItemViaService(new CommandContext(personActor(a.id)), {
        listId: list.id,
        name: "Milk",
        sectionId: foreignSection.id,
      }),
    );

    expectServiceError(error, "not_found");
    expect(await prisma.item.count()).toBe(0);
  });

  test("findItems searches only visible lists", async () => {
    const a = await createUser("person-a");
    const c = await createUser("person-c");
    const own = await createList(a.id, { name: "own" });
    const foreign = await createList(c.id, { name: "foreign" });
    const visible = await createItem(own.id, { name: "Oat milk" });
    await createItem(foreign.id, { name: "Milk" });

    const items = await findItems(personActor(a.id), { query: "milk" });

    expect(items.map((item) => item.id)).toEqual([visible.id]);
    expect(items[0].list).toEqual({ id: own.id, name: "own" });
  });
});
