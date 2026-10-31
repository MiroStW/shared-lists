import { z } from "zod";
import { prisma } from "db/prisma";
import type { EventFields } from "server/lists/events";
import { getRecentEvents, getVisibleLists } from "server/lists/listService";
import { undoLastCommand, type UndoEntry } from "server/lists/undo";
import { resolveList } from "../resolve";
import { defineTool } from "../types";
import { listRef } from "./lists";

const undoEntryOutput = (entry: UndoEntry) => ({
  type: entry.type,
  list_id: entry.listId,
  item_id: entry.itemId,
  section_id: entry.sectionId,
  fields: entry.fields,
});

export const undoLastCommandTool = defineTool({
  name: "undo_last_command",
  description:
    "Undo your most recent change (one command, e.g. one add_items call, possibly with several items). Fields that someone changed since are left alone and reported as skipped. Deleted lists and sections cannot be restored. There is no redo.",
  inputSchema: z.strictObject({}),
  handler: async (actor, _input, command) => {
    const result = await undoLastCommand(actor, {
      inputText: command.inputText,
    });
    return {
      status: result.status,
      command_id: result.commandId,
      undo_command_id: result.undoCommandId,
      reverted: result.reverted.map(undoEntryOutput),
      skipped: result.skipped.map((entry) => ({
        ...undoEntryOutput(entry),
        reason: entry.reason,
      })),
      hidden_skipped_count: result.hiddenSkippedCount,
    };
  },
});

const fieldsOrNull = (value: unknown) => (value ?? null) as EventFields | null;

export const recentChangesTool = defineTool({
  name: "recent_changes",
  description:
    "Show the most recent changes on the lists you can see (or one list), newest first: what changed, by whom and through which channel.",
  inputSchema: z.strictObject({
    list: listRef
      .optional()
      .describe("Only changes of this list (id or name)."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe("Maximum number of changes. Defaults to 20."),
  }),
  handler: async (actor, { list, limit = 20 }) => {
    const listId = list ? (await resolveList(actor, list)).id : undefined;
    const [events, lists] = await Promise.all([
      getRecentEvents(actor, { limit, listId }),
      getVisibleLists(actor, { includeArchived: true }),
    ]);
    const listNames = new Map(lists.map(({ id, name }) => [id, name]));
    const userIds = [
      ...new Set(
        events.flatMap(({ command }) =>
          command.actorUserId ? [command.actorUserId] : [],
        ),
      ),
    ];
    const itemIds = [
      ...new Set(events.flatMap(({ itemId }) => (itemId ? [itemId] : []))),
    ];
    const [users, items] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true },
      }),
      prisma.item.findMany({
        where: { id: { in: itemIds } },
        select: { id: true, name: true },
      }),
    ]);
    const userNames = new Map(users.map(({ id, name }) => [id, name]));
    const itemNames = new Map(items.map(({ id, name }) => [id, name]));

    return {
      changes: events.map((event) => {
        const before = fieldsOrNull(event.before);
        const after = fieldsOrNull(event.after);
        const itemName =
          after?.name ?? before?.name ?? itemNames.get(event.itemId ?? "");
        return {
          at: event.createdAt.toISOString(),
          type: event.type,
          list: { id: event.listId, name: listNames.get(event.listId) ?? null },
          item_id: event.itemId,
          item_name: event.itemId ? (itemName ?? null) : null,
          section_id: event.sectionId,
          before,
          after,
          command_id: event.command.id,
          by: event.command.actorUserId
            ? (userNames.get(event.command.actorUserId) ?? null)
            : null,
          channel: event.command.channel,
          origin: event.command.origin,
          undo_state: event.command.undoState,
        };
      }),
    };
  },
});
