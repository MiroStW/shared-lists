import type { Prisma } from "@prisma/client";
import type { Actor } from "./actor";

export type Db = Prisma.TransactionClient;

export type ListServiceErrorKind = "not_found" | "forbidden" | "invalid";

// Thrown by the list service. Routes map not_found to 404, forbidden to 403
// and invalid to 400 (or keep their historical status codes).
export class ListServiceError extends Error {
  readonly kind: ListServiceErrorKind;

  constructor(kind: ListServiceErrorKind, message: string) {
    super(message);
    this.name = "ListServiceError";
    this.kind = kind;
  }
}

export const notFound = (what: string) =>
  new ListServiceError("not_found", `${what} not found`);
const forbidden = (message = "Forbidden") =>
  new ListServiceError("forbidden", message);

// Returns the name; an empty or missing name is invalid.
export const requireName = (name: unknown) => {
  if (typeof name !== "string" || name === "") {
    throw new ListServiceError("invalid", "Name is required");
  }
  return name;
};

export const assertValidActor = (actor: Actor) => {
  if (actor.memberUserIds.length === 0) {
    throw forbidden("Actor has no members");
  }
  if (actor.actingUserId && !actor.memberUserIds.includes(actor.actingUserId)) {
    throw forbidden("Acting user is not a member of this access");
  }
};

// Prisma condition "the user owns or contributes to the list".
export const ownerOrContributorWhere = (
  userId: string,
): Prisma.ListWhereInput => ({
  OR: [{ ownerID: userId }, { contributors: { some: { id: userId } } }],
});

// Prisma condition "every member is owner or contributor" (KTD2).
export const visibleListWhere = (actor: Actor): Prisma.ListWhereInput => {
  assertValidActor(actor);
  return { AND: actor.memberUserIds.map(ownerOrContributorWhere) };
};

// The same condition in memory, for a list loaded with its member ids.
const membersSelect = {
  ownerID: true,
  contributors: { select: { id: true } },
} satisfies Prisma.ListSelect;

type ListMembers = { ownerID: string; contributors: { id: string }[] };

const assertMembersSee = (actor: Actor, list: ListMembers) => {
  assertValidActor(actor);
  const visible = actor.memberUserIds.every(
    (userId) =>
      list.ownerID === userId ||
      list.contributors.some((contributor) => contributor.id === userId),
  );
  if (!visible) throw forbidden();
};

// Ids among listIds that the actor currently sees. Deleted lists are not seen.
export const filterVisibleListIds = async (
  db: Db,
  actor: Actor,
  listIds: string[],
) => {
  if (listIds.length === 0) return new Set<string>();
  const lists = await db.list.findMany({
    where: { AND: [{ id: { in: listIds } }, visibleListWhere(actor)] },
    select: { id: true },
  });
  return new Set(lists.map((list) => list.id));
};

export const assertListVisible = async (
  db: Db,
  actor: Actor,
  listId: string,
) => {
  assertValidActor(actor);
  const found = await db.list.findUnique({
    where: { id: listId },
    include: { contributors: { select: { id: true } } },
  });
  if (!found) throw notFound("List");
  const { contributors, ...list } = found;
  assertMembersSee(actor, { ownerID: list.ownerID, contributors });
  return list;
};

// List name, archive state and deletion stay owner-only, as in the web routes.
// The acting person must own the list; a household without one cannot.
export const assertListOwner = async (db: Db, actor: Actor, listId: string) => {
  const list = await assertListVisible(db, actor, listId);
  if (!actor.actingUserId || list.ownerID !== actor.actingUserId)
    throw forbidden();
  return list;
};

export const assertItemVisible = async (
  db: Db,
  actor: Actor,
  itemId: string,
) => {
  const found = await db.item.findUnique({
    where: { id: itemId },
    include: { list: { select: membersSelect } },
  });
  if (!found) throw notFound("Item");
  const { list, ...item } = found;
  assertMembersSee(actor, list);
  return item;
};

export const assertSectionVisible = async (
  db: Db,
  actor: Actor,
  sectionId: string,
) => {
  const found = await db.section.findUnique({
    where: { id: sectionId },
    include: { list: { select: membersSelect } },
  });
  if (!found) throw notFound("Section");
  const { list, ...section } = found;
  assertMembersSee(actor, list);
  return section;
};

// A section id given for an item must belong to the item's list.
export const assertSectionInList = async (
  db: Db,
  sectionId: string | null,
  listId: string,
) => {
  if (sectionId === null) return;
  const section = await db.section.findUnique({ where: { id: sectionId } });
  if (!section || section.listId !== listId) throw notFound("Section");
};
