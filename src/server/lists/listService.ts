import type { Prisma } from "@prisma/client";
import { prisma } from "db/prisma";
import {
  assertListOwner,
  assertListVisible,
  assertSectionVisible,
  ListServiceError,
  requireName,
  visibleListWhere,
} from "./access";
import type { Actor } from "./actor";
import { runWrite, type CommandContext, type WriteScope } from "./command";
import { EVENT, itemSnapshot } from "./events";

// Public user fields only; never hand out password hashes.
const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
} satisfies Prisma.UserSelect;

const listMembersInclude = {
  owner: { select: publicUserSelect },
  contributors: { select: publicUserSelect },
} satisfies Prisma.ListInclude;

// ---- Reads ----

type ListWithMembers = Prisma.ListGetPayload<{
  include: typeof listMembersInclude;
}>;

const leanListSelect = {
  id: true,
  name: true,
  isArchived: true,
} satisfies Prisma.ListSelect;

type LeanList = Prisma.ListGetPayload<{ select: typeof leanListSelect }>;

type VisibleListsOptions = { includeArchived?: boolean; lean?: boolean };

// The actor's lists in creation order. lean returns only id, name and
// isArchived, without owner and contributors.
export function getVisibleLists(
  actor: Actor,
  options: VisibleListsOptions & { lean: true },
): Promise<LeanList[]>;
export function getVisibleLists(
  actor: Actor,
  options?: VisibleListsOptions & { lean?: false },
): Promise<ListWithMembers[]>;
export function getVisibleLists(
  actor: Actor,
  { includeArchived = false, lean = false }: VisibleListsOptions = {},
): Promise<LeanList[] | ListWithMembers[]> {
  const where: Prisma.ListWhereInput = {
    AND: [
      visibleListWhere(actor),
      includeArchived ? {} : { isArchived: false },
    ],
  };
  const orderBy = { createdDate: "asc" } as const;
  return lean
    ? prisma.list.findMany({ where, select: leanListSelect, orderBy })
    : prisma.list.findMany({ where, include: listMembersInclude, orderBy });
}

export const getList = async (actor: Actor, listId: string) => {
  await assertListVisible(prisma, actor, listId);
  return prisma.list.findUniqueOrThrow({
    where: { id: listId },
    include: {
      ...listMembersInclude,
      sections: { orderBy: { createdDate: "asc" } },
      items: { orderBy: { order: "asc" } },
    },
  });
};

// Items in display order, or in creation order (the v1 API's contract).
export const getListItems = async (
  actor: Actor,
  listId: string,
  { orderBy = "order" }: { orderBy?: "order" | "createdDate" } = {},
) => {
  await assertListVisible(prisma, actor, listId);
  return prisma.item.findMany({
    where: { listID: listId },
    orderBy: orderBy === "createdDate" ? { createdDate: "asc" } : { order: "asc" },
  });
};

export const getListSections = async (actor: Actor, listId: string) => {
  await assertListVisible(prisma, actor, listId);
  return prisma.section.findMany({
    where: { listId },
    orderBy: { createdDate: "asc" },
  });
};

// Items across all visible, non-archived lists. query matches the name or
// the normalized name, case-insensitively.
export const findItems = (
  actor: Actor,
  {
    query,
    listIds,
    includeCompleted = true,
    limit = 100,
  }: {
    query?: string;
    listIds?: string[];
    includeCompleted?: boolean;
    limit?: number;
  } = {},
) =>
  prisma.item.findMany({
    where: {
      list: { AND: [visibleListWhere(actor), { isArchived: false }] },
      ...(listIds ? { listID: { in: listIds } } : {}),
      ...(includeCompleted ? {} : { completed: false }),
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { normalized: { contains: query.toLowerCase() } },
            ],
          }
        : {}),
    },
    include: {
      list: { select: { id: true, name: true } },
      section: { select: { id: true, name: true } },
      aliases: true,
    },
    orderBy: [{ listID: "asc" }, { order: "asc" }],
    take: limit,
  });

// Recent events of lists the actor currently sees, newest first (for the
// recent_changes tool). Events of deleted or foreign lists are left out.
export const getRecentEvents = async (
  actor: Actor,
  { limit = 20, listId }: { limit?: number; listId?: string } = {},
) => {
  const lists = await prisma.list.findMany({
    where: { AND: [visibleListWhere(actor), listId ? { id: listId } : {}] },
    select: { id: true },
  });
  return prisma.listEvent.findMany({
    where: { listId: { in: lists.map((list) => list.id) } },
    include: {
      command: {
        select: {
          id: true,
          actorUserId: true,
          accessId: true,
          channel: true,
          origin: true,
          kind: true,
          inputText: true,
          undoState: true,
          createdAt: true,
        },
      },
    },
    orderBy: [{ createdAt: "desc" }, { seq: "desc" }],
    take: limit,
  });
};

// ---- Lists ----

// The acting person owns the new list. A household shares it with its other
// members, so the household can see what it created.
export const createList = (ctx: CommandContext, { name }: { name: string }) =>
  runWrite(ctx, async ({ tx, actor, record }) => {
    requireName(name);
    if (!actor.actingUserId) {
      throw new ListServiceError(
        "forbidden",
        "Creating a list needs an acting person",
      );
    }
    const others = actor.memberUserIds.filter(
      (id) => id !== actor.actingUserId,
    );
    const list = await tx.list.create({
      data: {
        name,
        ownerID: actor.actingUserId,
        contributors: { connect: others.map((id) => ({ id })) },
      },
    });
    record({ type: EVENT.listCreated, listId: list.id, after: { name } });
    return list;
  });

export const updateList = (
  ctx: CommandContext,
  listId: string,
  changes: { name?: string; isArchived?: boolean },
) =>
  runWrite(ctx, async ({ tx, actor, record }) => {
    if (changes.name !== undefined) requireName(changes.name);
    const list = await assertListOwner(tx, actor, listId);
    const data: Prisma.ListUpdateInput = {};
    if (changes.name !== undefined && changes.name !== list.name) {
      data.name = changes.name;
      record({
        type: EVENT.listRenamed,
        listId,
        before: { name: list.name },
        after: { name: changes.name },
      });
    }
    if (
      changes.isArchived !== undefined &&
      changes.isArchived !== list.isArchived
    ) {
      data.isArchived = changes.isArchived;
      record({
        type: changes.isArchived ? EVENT.listArchived : EVENT.listUnarchived,
        listId,
        before: { isArchived: list.isArchived },
        after: { isArchived: changes.isArchived },
      });
    }
    if (Object.keys(data).length === 0) return list;
    return tx.list.update({ where: { id: listId }, data });
  });

// Logs every contained item before deleting, so the cascade stays visible in
// the history (KTD3). Deleted lists cannot be undone (KTD4.7).
export const deleteList = (ctx: CommandContext, listId: string) =>
  runWrite(ctx, async (scope) => {
    const list = await assertListOwner(scope.tx, scope.actor, listId);
    await scope.captureRecipients(listId);
    await recordItemDeletions(scope, { listID: listId });
    scope.record({
      type: EVENT.listDeleted,
      listId,
      before: { name: list.name },
    });
    await scope.tx.list.delete({ where: { id: listId } });
    return list;
  });

// ---- Sections ----

export const createSection = (
  ctx: CommandContext,
  { listId, name }: { listId: string; name: string },
) =>
  runWrite(ctx, async ({ tx, actor, record }) => {
    requireName(name);
    await assertListVisible(tx, actor, listId);
    const section = await tx.section.create({ data: { listId, name } });
    record({
      type: EVENT.sectionCreated,
      listId,
      sectionId: section.id,
      after: { name },
    });
    return section;
  });

export const renameSection = (
  ctx: CommandContext,
  sectionId: string,
  name: string,
) =>
  runWrite(ctx, async ({ tx, actor, record }) => {
    requireName(name);
    const section = await assertSectionVisible(tx, actor, sectionId);
    if (name === section.name) return section;
    record({
      type: EVENT.sectionRenamed,
      listId: section.listId,
      sectionId,
      before: { name: section.name },
      after: { name },
    });
    return tx.section.update({ where: { id: sectionId }, data: { name } });
  });

export const deleteSection = (ctx: CommandContext, sectionId: string) =>
  runWrite(ctx, async (scope) => {
    const section = await assertSectionVisible(
      scope.tx,
      scope.actor,
      sectionId,
    );
    await recordItemDeletions(scope, { sectionID: sectionId });
    scope.record({
      type: EVENT.sectionDeleted,
      listId: section.listId,
      sectionId,
      before: { name: section.name },
    });
    await scope.tx.section.delete({ where: { id: sectionId } });
    return section;
  });

const recordItemDeletions = async (
  { tx, record }: WriteScope,
  where: Prisma.ItemWhereInput,
) => {
  const items = await tx.item.findMany({ where, orderBy: { order: "asc" } });
  for (const item of items) {
    record({
      type: EVENT.itemDeleted,
      listId: item.listID,
      itemId: item.id,
      sectionId: item.sectionID,
      before: itemSnapshot(item),
    });
  }
};
