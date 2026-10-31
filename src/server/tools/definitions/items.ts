import { z } from "zod";
import { findCandidates, type MatchReason } from "server/itemMatching";
import { simplifyItemName } from "server/itemNormalization";
import { assertItemVisible } from "server/lists/access";
import {
  addItems,
  setItemCompleted,
  updateItem,
  type AddItemOutcome,
} from "server/lists/itemService";
import { findItems, getListSections } from "server/lists/listService";
import { prisma } from "db/prisma";
import {
  itemOutput,
  resolveList,
  resolveSection,
  sectionRef,
} from "../resolve";
import { defineTool } from "../types";
import { listRef } from "./lists";

const sectionRefSchema = z
  .string()
  .trim()
  .min(1)
  .describe(
    "The section's id or its exact name (case-insensitive) within the list.",
  );

const itemId = z.string().trim().min(1).describe("The item's id.");

const MAX_FIND_RESULTS = 200;
// Items scanned when matching a query in memory.
const FIND_SCAN_LIMIT = 2000;
const CONTAINS_SCORE = 0.6;

export const findItemsTool = defineTool({
  name: "find_items",
  description:
    "Search items across all lists you can see (or one list). Matching ignores case and also finds translations, compounds that end in the query and close spellings. Each result has a reason: exact, alias, compound, contains or fuzzy. Without a query, returns the items of the list.",
  inputSchema: z.strictObject({
    query: z.string().trim().min(1).optional().describe("Text to search for."),
    list: listRef
      .optional()
      .describe("Limit the search to this list (id or name)."),
    include_completed: z
      .boolean()
      .optional()
      .describe("Include completed items. Defaults to true."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_FIND_RESULTS)
      .optional()
      .describe("Maximum number of results. Defaults to 50."),
  }),
  handler: async (
    actor,
    { query, list, include_completed = true, limit = 50 },
  ) => {
    const listIds = list ? [(await resolveList(actor, list)).id] : undefined;
    const items = await findItems(actor, {
      listIds,
      includeCompleted: include_completed,
      limit: query ? FIND_SCAN_LIMIT : limit,
    });

    let ranked: {
      item: (typeof items)[number];
      reason: MatchReason | "contains" | null;
      score: number;
    }[];
    if (query) {
      const candidates = findCandidates(query, items);
      const matched = new Set(candidates.map(({ item }) => item));
      const needle = simplifyItemName(query);
      const contains = items
        .filter(
          (item) =>
            !matched.has(item) &&
            (simplifyItemName(item.name).includes(needle) ||
              item.normalized.includes(needle)),
        )
        .map((item) => ({
          item,
          reason: "contains" as const,
          score: CONTAINS_SCORE,
        }));
      ranked = [...candidates, ...contains].sort((a, b) => b.score - a.score);
    } else {
      ranked = items.map((item) => ({ item, reason: null, score: 1 }));
    }

    return {
      items: ranked.slice(0, limit).map(({ item, reason }) => ({
        id: item.id,
        name: item.name,
        note: item.description,
        completed: item.completed,
        list: item.list,
        section: item.section ? sectionRef(item.section) : null,
        ...(reason ? { reason } : {}),
      })),
    };
  },
});

const addEntry = z.union([
  z.string().trim().min(1),
  z.strictObject({
    name: z.string().trim().min(1).describe("Item name."),
    section: sectionRefSchema.optional(),
    note: z.string().optional().describe("Free-text note, e.g. a quantity."),
  }),
]);

export const addItemsTool = defineTool({
  name: "add_items",
  description: [
    "Add items to a list without creating duplicates. Each name is matched against the list's items first; the result per name has a status:",
    '"created" (new item), "reopened" (a completed item with that name was checked off and is open again),',
    '"already_open" (the item is already on the list; nothing was written) or',
    '"ambiguous" (several possible items, e.g. "milk" and "oat milk"; nothing was written for that name, and candidates lists them).',
    "Resolve an ambiguous name by reopening a candidate with set_item_completed, or by calling add_items again with create_new.",
    "Other names of the same call are still written. A note is set on created and reopened items. Fuzzy hints on created items are only suggestions.",
  ].join(" "),
  inputSchema: z.strictObject({
    list: listRef,
    items: z
      .array(addEntry)
      .min(1)
      .max(50)
      .describe(
        "Names, or objects with name and an optional section and note.",
      ),
    section: sectionRefSchema
      .optional()
      .describe(
        "Section for every item that names none. Defaults to no section.",
      ),
    create_new: z
      .boolean()
      .optional()
      .describe(
        "Create every item as new, skipping the matching. Defaults to false.",
      ),
  }),
  handler: async (actor, input, command) => {
    const list = await resolveList(actor, input.list);
    const sections = await getListSections(actor, list.id);
    // Resolve every section before writing, so a wrong name writes nothing.
    const entries = input.items.map((entry) => {
      const {
        name,
        section = input.section,
        note,
      } = typeof entry === "string" ? { name: entry } : entry;
      return {
        name,
        sectionId: section ? resolveSection(sections, section).id : null,
        description: note,
      };
    });

    const outcomes = await addItems(command, {
      listId: list.id,
      entries,
      createNew: input.create_new ?? false,
    });
    return {
      list: { id: list.id, name: list.name },
      results: outcomes.map((outcome) => addOutcomeOutput(outcome, sections)),
    };
  },
});

const addOutcomeOutput = (
  outcome: AddItemOutcome,
  sections: { id: string; name: string }[],
) => {
  switch (outcome.status) {
    case "ambiguous":
      return {
        name: outcome.name,
        status: outcome.status,
        candidates: outcome.candidates.map(({ item, reason, score }) => ({
          id: item.id,
          name: item.name,
          completed: item.completed,
          reason,
          score: Math.round(score * 100) / 100,
        })),
      };
    case "created":
      return {
        name: outcome.name,
        status: outcome.status,
        item: itemOutput(outcome.item, sections),
        ...(outcome.hints.length > 0
          ? {
              hints: outcome.hints.map(({ item, reason }) => ({
                id: item.id,
                name: item.name,
                completed: item.completed,
                reason,
              })),
            }
          : {}),
      };
    default:
      return {
        name: outcome.name,
        status: outcome.status,
        item: itemOutput(outcome.item, sections),
      };
  }
};

const itemWithSections = async (
  actor: Parameters<typeof getListSections>[0],
  item: Awaited<ReturnType<typeof setItemCompleted>>,
) => ({ item: itemOutput(item, await getListSections(actor, item.listID)) });

export const setItemCompletedTool = defineTool({
  name: "set_item_completed",
  description:
    "Check off an item (completed: true) or put it back on the list (completed: false).",
  inputSchema: z.strictObject({
    item_id: itemId,
    completed: z.boolean().describe("true to check off, false to reopen."),
  }),
  handler: async (actor, { item_id, completed }, command) =>
    itemWithSections(
      actor,
      await setItemCompleted(command, item_id, completed),
    ),
});

export const updateItemTool = defineTool({
  name: "update_item",
  description:
    "Rename an item, change its note, or move it to another section of its list (section: null removes it from its section). Give at least one change.",
  inputSchema: z
    .strictObject({
      item_id: itemId,
      name: z.string().trim().min(1).optional().describe("New name."),
      note: z
        .string()
        .optional()
        .describe("New note; an empty string clears it."),
      section: sectionRefSchema
        .nullable()
        .optional()
        .describe("Target section (id or name), or null for no section."),
    })
    .refine(
      ({ name, note, section }) =>
        name !== undefined || note !== undefined || section !== undefined,
      { message: "Give at least one of name, note or section" },
    ),
  handler: async (actor, { item_id, name, note, section }, command) => {
    const current = await assertItemVisible(prisma, actor, item_id);
    const sections = await getListSections(actor, current.listID);
    const sectionId =
      section === undefined
        ? undefined
        : section === null
          ? null
          : resolveSection(sections, section).id;
    const item = await updateItem(command, item_id, {
      name,
      description: note,
      sectionId,
    });
    return { item: itemOutput(item, sections) };
  },
});
