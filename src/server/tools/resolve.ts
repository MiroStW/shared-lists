import type { Item, Section } from "@prisma/client";
import { prisma } from "db/prisma";
import { assertListVisible, ListServiceError } from "server/lists/access";
import type { Actor } from "server/lists/actor";
import { getVisibleLists } from "server/lists/listService";

// Lists and sections may be addressed by id or by name (case-insensitive,
// exact). Errors name the matches or the available names, so an agent can
// correct itself.

const nameKey = (name: string) => name.trim().toLowerCase();
const quoted = (names: string[]) => names.map((name) => `"${name}"`).join(", ");

export const resolveList = async (actor: Actor, ref: string) => {
  const lists = await getVisibleLists(actor, { includeArchived: true });
  const byId = lists.find((list) => list.id === ref);
  if (byId) return byId;

  const matches = lists.filter((list) => nameKey(list.name) === nameKey(ref));
  const active = matches.filter((list) => !list.isArchived);
  if (matches.length === 1) return matches[0];
  if (active.length === 1) return active[0];
  if (matches.length > 1) {
    throw new ListServiceError(
      "invalid",
      `List name "${ref}" matches several lists: ${matches
        .map((list) => `"${list.name}" (id ${list.id})`)
        .join(", ")}. Use the id.`,
    );
  }

  // An id of a list the actor does not see is a forbidden error.
  const existing = await prisma.list.findUnique({
    where: { id: ref },
    select: { id: true },
  });
  if (existing) await assertListVisible(prisma, actor, ref);

  const available = lists.filter((list) => !list.isArchived);
  throw new ListServiceError(
    "not_found",
    available.length > 0
      ? `No list named "${ref}". Available lists: ${quoted(available.map((list) => list.name))}.`
      : `No list named "${ref}". There are no lists.`,
  );
};

export const resolveSection = (sections: Section[], ref: string) => {
  const byId = sections.find((section) => section.id === ref);
  if (byId) return byId;

  const matches = sections.filter(
    (section) => nameKey(section.name) === nameKey(ref),
  );
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) {
    throw new ListServiceError(
      "invalid",
      `Section name "${ref}" matches several sections: ${matches
        .map((section) => `id ${section.id}`)
        .join(", ")}. Use the id.`,
    );
  }
  throw new ListServiceError(
    "not_found",
    sections.length > 0
      ? `No section named "${ref}" in this list. Available sections: ${quoted(sections.map((section) => section.name))}.`
      : `No section named "${ref}": this list has no sections.`,
  );
};

// ---- Output shapes shared by the tools ----

export type SectionRef = { id: string; name: string };

export const sectionRef = (
  section: Pick<Section, "id" | "name">,
): SectionRef => ({
  id: section.id,
  name: section.name,
});

// sections resolves an item's section id to its name.
export const itemOutput = (
  item: Item,
  sections: Pick<Section, "id" | "name">[],
) => {
  const section = sections.find(({ id }) => id === item.sectionID);
  return {
    id: item.id,
    name: item.name,
    note: item.description,
    completed: item.completed,
    list_id: item.listID,
    section: section ? sectionRef(section) : null,
  };
};
