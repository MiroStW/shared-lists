import type { Item, ItemAlias, Prisma } from "@prisma/client";
import {
  decideAddition,
  findCandidates,
  type MatchCandidate,
} from "server/itemMatching";
import { normalizeItemName } from "server/itemNormalization";
import {
  assertItemVisible,
  assertListVisible,
  assertSectionInList,
  notFound,
  requireName,
} from "./access";
import { runWrite, type CommandContext, type WriteScope } from "./command";
import { EVENT, itemSnapshot } from "./events";

export type ItemChanges = {
  name?: string;
  completed?: boolean;
  description?: string;
  // null or "" removes the section.
  sectionId?: string | null;
  order?: number;
};

type NewItem = {
  listId: string;
  name: string;
  completed?: boolean;
  sectionId?: string | null;
  description?: string;
  order?: number;
};

// Inserts an item into a list already checked for visibility.
const insertItem = async (
  { tx, record }: WriteScope,
  {
    listId,
    name,
    completed = false,
    sectionId = null,
    description = "",
    order = 0,
  }: NewItem,
) => {
  const sectionID = sectionId || null;
  await assertSectionInList(tx, sectionID, listId);
  const item = await tx.item.create({
    data: {
      name,
      completed,
      description,
      order,
      listID: listId,
      sectionID,
      normalized: normalizeItemName(name),
    },
  });
  record({
    type: EVENT.itemCreated,
    listId,
    itemId: item.id,
    sectionId: sectionID,
    after: { name, sectionID, description, completed },
  });
  return item;
};

export const createItem = (ctx: CommandContext, newItem: NewItem) =>
  runWrite(ctx, async (scope) => {
    requireName(newItem.name);
    await assertListVisible(scope.tx, scope.actor, newItem.listId);
    return insertItem(scope, newItem);
  });

// Applies the changed fields of one item and records one event per kind of
// change. Unchanged values and pure order changes write no event.
const applyItemChanges = async (
  { tx, record, touch }: WriteScope,
  item: Item,
  changes: ItemChanges,
): Promise<Item> => {
  const data: Prisma.ItemUncheckedUpdateInput = {};
  const base = {
    listId: item.listID,
    itemId: item.id,
    sectionId: item.sectionID,
  };

  if (changes.name !== undefined && changes.name !== item.name) {
    data.name = changes.name;
    data.normalized = normalizeItemName(changes.name);
    record({
      ...base,
      type: EVENT.itemRenamed,
      before: { name: item.name },
      after: { name: changes.name },
    });
  }
  if (changes.completed !== undefined && changes.completed !== item.completed) {
    data.completed = changes.completed;
    record({
      ...base,
      type: changes.completed ? EVENT.itemCompleted : EVENT.itemReopened,
      before: { completed: item.completed },
      after: { completed: changes.completed },
    });
  }
  if (
    changes.description !== undefined &&
    changes.description !== item.description
  ) {
    data.description = changes.description;
    record({
      ...base,
      type: EVENT.itemNoteSet,
      before: { description: item.description },
      after: { description: changes.description },
    });
  }
  if (changes.sectionId !== undefined) {
    const sectionID = changes.sectionId || null;
    if (sectionID !== item.sectionID) {
      await assertSectionInList(tx, sectionID, item.listID);
      data.sectionID = sectionID;
      record({
        ...base,
        sectionId: sectionID,
        type: EVENT.itemSectionSet,
        before: { sectionID: item.sectionID },
        after: { sectionID },
      });
    }
  }
  if (changes.order !== undefined && changes.order !== item.order) {
    data.order = changes.order;
    touch(item.listID);
  }

  if (Object.keys(data).length === 0) return item;
  return tx.item.update({ where: { id: item.id }, data });
};

export const updateItem = (
  ctx: CommandContext,
  itemId: string,
  changes: ItemChanges,
) =>
  runWrite(ctx, async (scope) => {
    if (changes.name !== undefined) requireName(changes.name);
    const item = await assertItemVisible(scope.tx, scope.actor, itemId);
    return applyItemChanges(scope, item, changes);
  });

export const setItemCompleted = (
  ctx: CommandContext,
  itemId: string,
  completed: boolean,
) => updateItem(ctx, itemId, { completed });

export const deleteItem = (ctx: CommandContext, itemId: string) =>
  runWrite(ctx, async ({ tx, actor, record }) => {
    const item = await assertItemVisible(tx, actor, itemId);
    record({
      type: EVENT.itemDeleted,
      listId: item.listID,
      itemId,
      sectionId: item.sectionID,
      before: itemSnapshot(item),
    });
    await tx.item.delete({ where: { id: itemId } });
    return item;
  });

export type ReorderEntry = {
  id: string;
  order: number;
  sectionId?: string | null;
};

// Sets order and, optionally, section of several items of one list. Every
// item must belong to that list. Only section moves are logged (KTD3).
export const reorderItems = (
  ctx: CommandContext,
  listId: string,
  entries: ReorderEntry[],
) =>
  runWrite(ctx, async (scope) => {
    await assertListVisible(scope.tx, scope.actor, listId);
    const items = await scope.tx.item.findMany({
      where: { id: { in: entries.map((entry) => entry.id) }, listID: listId },
    });
    const byId = new Map(items.map((item) => [item.id, item]));
    for (const entry of entries) {
      const item = byId.get(entry.id);
      if (!item) throw notFound("Item");
      await applyItemChanges(scope, item, {
        order: entry.order,
        sectionId: entry.sectionId,
      });
    }
  });

export type AddItemEntry = {
  name: string;
  sectionId?: string | null;
  description?: string;
};

type MatchedItem = Item & { aliases: ItemAlias[] };

export type AddItemOutcome =
  | {
      name: string;
      status: "created";
      item: Item;
      hints: MatchCandidate<MatchedItem>[];
    }
  | { name: string; status: "reopened" | "already_open"; item: Item }
  | {
      name: string;
      status: "ambiguous";
      candidates: MatchCandidate<MatchedItem>[];
    };

// Adds names to a list without creating duplicates (KTD9): each name is
// matched against the list's items and then created, reopened, reported as
// already open, or reported as ambiguous without writing anything. A note is
// set on created and reopened items. With createNew every name is created.
// All writes share one transaction; names of the same call see each other.
export const addItems = (
  ctx: CommandContext,
  {
    listId,
    entries,
    createNew = false,
  }: { listId: string; entries: AddItemEntry[]; createNew?: boolean },
) =>
  runWrite(ctx, async (scope) => {
    entries.forEach((entry) => requireName(entry.name));
    await assertListVisible(scope.tx, scope.actor, listId);
    const sectionIds = [
      ...new Set(entries.flatMap(({ sectionId }) => sectionId || [])),
    ];
    if (sectionIds.length > 0) {
      const found = await scope.tx.section.findMany({
        where: { id: { in: sectionIds }, listId },
        select: { id: true },
      });
      if (found.length !== sectionIds.length) throw notFound("Section");
    }

    const items: MatchedItem[] = await scope.tx.item.findMany({
      where: { listID: listId },
      include: { aliases: true },
      orderBy: { order: "asc" },
    });
    const nextOrder = (sectionId: string | null) =>
      Math.max(
        -1,
        ...items
          .filter((item) => item.sectionID === sectionId)
          .map((item) => item.order),
      ) + 1;

    const outcomes: AddItemOutcome[] = [];
    for (const { name, sectionId = null, description } of entries) {
      const decision = createNew
        ? { action: "create" as const, hints: [] }
        : decideAddition(findCandidates(name, items));

      switch (decision.action) {
        case "create": {
          const sectionID = sectionId || null;
          const item = await insertItem(scope, {
            listId,
            name,
            sectionId: sectionID,
            description,
            order: nextOrder(sectionID),
          });
          items.push({ ...item, aliases: [] });
          outcomes.push({
            name,
            status: "created",
            item,
            hints: decision.hints,
          });
          break;
        }
        case "reopen": {
          const item = await applyItemChanges(scope, decision.item, {
            completed: false,
            description,
          });
          items[items.indexOf(decision.item)] = {
            ...item,
            aliases: decision.item.aliases,
          };
          outcomes.push({ name, status: "reopened", item });
          break;
        }
        case "already_open":
          outcomes.push({ name, status: "already_open", item: decision.item });
          break;
        case "ambiguous":
          outcomes.push({
            name,
            status: "ambiguous",
            candidates: decision.candidates,
          });
          break;
      }
    }
    return outcomes;
  });
