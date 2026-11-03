import { z } from "zod";
import { prisma } from "db/prisma";
import {
  createList,
  createSection,
  getList,
  getVisibleLists,
} from "server/lists/listService";
import { itemOutput, resolveList, sectionRef } from "../resolve";
import { defineTool } from "../types";

export const listRef = z
  .string()
  .trim()
  .min(1)
  .describe("The list's id or its exact name (case-insensitive).");

const listOutput = (list: {
  id: string;
  name: string;
  isArchived: boolean;
}) => ({
  id: list.id,
  name: list.name,
  archived: list.isArchived,
});

export const listListsTool = defineTool({
  name: "list_lists",
  description:
    "List the shopping and to-do lists you can see, with their sections and the number of open items. Archived lists are left out unless include_archived is true.",
  inputSchema: z.strictObject({
    include_archived: z
      .boolean()
      .optional()
      .describe("Also return archived lists. Defaults to false."),
  }),
  handler: async (actor, { include_archived = false }) => {
    const lists = await getVisibleLists(actor, {
      includeArchived: include_archived,
    });
    const listIds = lists.map((list) => list.id);
    const [sections, openCounts] = await Promise.all([
      prisma.section.findMany({
        where: { listId: { in: listIds } },
        orderBy: { createdDate: "asc" },
      }),
      prisma.item.groupBy({
        by: ["listID"],
        where: { listID: { in: listIds }, completed: false },
        _count: { _all: true },
      }),
    ]);
    const openByList = new Map(
      openCounts.map((row) => [row.listID, row._count._all]),
    );
    return {
      lists: lists.map((list) => ({
        ...listOutput(list),
        open_items: openByList.get(list.id) ?? 0,
        sections: sections
          .filter((section) => section.listId === list.id)
          .map(sectionRef),
      })),
    };
  },
});

export const getListTool = defineTool({
  name: "get_list",
  description:
    'Get one list with its sections and items in display order. By default only open items are returned; set filter to "all" to include completed ones.',
  inputSchema: z.strictObject({
    list: listRef,
    filter: z
      .enum(["open", "all"])
      .optional()
      .describe('"open" (default) for open items only, "all" for every item.'),
  }),
  handler: async (actor, { list: ref, filter = "open" }) => {
    const { id } = await resolveList(actor, ref);
    const list = await getList(actor, id);
    const items =
      filter === "all"
        ? list.items
        : list.items.filter((item) => !item.completed);
    return {
      list: listOutput(list),
      sections: list.sections.map(sectionRef),
      items: items.map((item) => itemOutput(item, list.sections)),
    };
  },
});

export const createListTool = defineTool({
  name: "create_list",
  description:
    "Create a new list owned by you. Check list_lists first so you do not create a list that already exists.",
  inputSchema: z.strictObject({
    name: z.string().trim().min(1).describe("Name of the new list."),
  }),
  handler: async (_actor, { name }, command) => ({
    list: listOutput(await createList(command, { name })),
  }),
});

export const createSectionTool = defineTool({
  name: "create_section",
  description:
    "Create a section (a group such as an aisle or a category) in a list.",
  inputSchema: z.strictObject({
    list: listRef,
    name: z.string().trim().min(1).describe("Name of the new section."),
  }),
  handler: async (actor, { list: ref, name }, command) => {
    const list = await resolveList(actor, ref);
    const section = await createSection(command, { listId: list.id, name });
    return { section: { ...sectionRef(section), list_id: list.id } };
  },
});
