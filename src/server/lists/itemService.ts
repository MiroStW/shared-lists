import type { Item, Prisma } from "@prisma/client";
import { normalizeItemName } from "server/itemNormalization";
import {
  assertItemVisible,
  assertListVisible,
  assertSectionInList,
  ListServiceError,
  notFound,
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

const requireName = (name: unknown) => {
  if (typeof name !== "string" || name === "") {
    throw new ListServiceError("invalid", "Name is required");
  }
};

export const createItem = (
  ctx: CommandContext,
  {
    listId,
    name,
    completed = false,
    sectionId = null,
    description = "",
    order = 0,
  }: {
    listId: string;
    name: string;
    completed?: boolean;
    sectionId?: string | null;
    description?: string;
    order?: number;
  },
) =>
  runWrite(ctx, async ({ tx, actor, record }) => {
    requireName(name);
    await assertListVisible(tx, actor, listId);
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

export const renameItem = (ctx: CommandContext, itemId: string, name: string) =>
  updateItem(ctx, itemId, { name });

export const setItemNote = (
  ctx: CommandContext,
  itemId: string,
  description: string,
) => updateItem(ctx, itemId, { description });

export const setItemSection = (
  ctx: CommandContext,
  itemId: string,
  sectionId: string | null,
) => updateItem(ctx, itemId, { sectionId });

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
