import type { ListEvent } from "@prisma/client";
import { normalizeItemName } from "server/itemNormalization";
import { filterVisibleListIds } from "./access";
import type { Actor } from "./actor";
import { CommandContext, runWrite, type WriteScope } from "./command";
import {
  EVENT,
  eventTarget,
  fieldsOf,
  itemSnapshot,
  type EventFields,
  type EventType,
  type ItemSnapshot,
  type UndoState,
} from "./events";

export type UndoSkipReason =
  // The field's current value no longer matches what the command wrote.
  | "field_changed"
  // A created item, section or list was changed since and is kept.
  | "changed"
  // The target no longer exists.
  | "missing"
  // An item to restore exists again with the same id.
  | "exists"
  // A created section or list has content now and is kept.
  | "not_empty"
  // Deleted lists and sections, and changes the actor may not make (KTD4.7).
  | "not_undoable";

export type UndoEntry = {
  eventId: string;
  type: string;
  listId: string;
  itemId: string | null;
  sectionId: string | null;
  fields: string[];
};

export type UndoSkip = UndoEntry & { reason: UndoSkipReason };

export type UndoResult = {
  status: "nothing_to_undo" | "undone" | "partial";
  // The command that was taken back.
  commandId: string | null;
  // The new command of kind "undo" that holds the reverting events.
  undoCommandId: string | null;
  reverted: UndoEntry[];
  skipped: UndoSkip[];
  // Events on lists the actor does not see; reported only as a count (KTD4.3).
  hiddenSkippedCount: number;
};

const INVERSE_TYPE: Partial<Record<string, EventType>> = {
  [EVENT.itemCompleted]: EVENT.itemReopened,
  [EVENT.itemReopened]: EVENT.itemCompleted,
  [EVENT.listArchived]: EVENT.listUnarchived,
  [EVENT.listUnarchived]: EVENT.listArchived,
};

const same = (a: unknown, b: unknown) => (a ?? null) === (b ?? null);

const entryOf = (event: ListEvent, fields: string[] = []): UndoEntry => ({
  eventId: event.id,
  type: event.type,
  listId: event.listId,
  itemId: event.itemId,
  sectionId: event.sectionId,
  fields,
});

// The command of the same person (or, without one, the same access) that is
// not undone and wrote the newest event (KTD4.1, KTD4.2). Ordering by event,
// not by command, matters because an answer to a question appends its events
// to the older command that asked.
const findCandidate = async (scope: WriteScope) => {
  const { actor, tx } = scope;
  const owner = actor.actingUserId
    ? { actorUserId: actor.actingUserId }
    : actor.accessId
      ? { accessId: actor.accessId }
      : null;
  if (!owner) return null;
  const latest = await tx.listEvent.findFirst({
    where: { command: { ...owner, kind: "change", undoState: "none" } },
    orderBy: { seq: "desc" },
    select: { commandId: true },
  });
  if (!latest) return null;
  return tx.command.findUnique({
    where: { id: latest.commandId },
    include: { events: { orderBy: { seq: "desc" } } },
  });
};

class EventUndoer {
  readonly reverted: UndoEntry[] = [];
  readonly skipped: UndoSkip[] = [];

  constructor(private readonly scope: WriteScope) {}

  skip(event: ListEvent, reason: UndoSkipReason, fields: string[] = []) {
    this.skipped.push({ ...entryOf(event, fields), reason });
  }

  async undo(event: ListEvent) {
    switch (event.type) {
      case EVENT.itemCreated:
        return this.undoItemCreated(event);
      case EVENT.itemDeleted:
        return this.undoItemDeleted(event);
      case EVENT.sectionCreated:
        return this.undoSectionCreated(event);
      case EVENT.listCreated:
        return this.undoListCreated(event);
      case EVENT.itemCompleted:
      case EVENT.itemReopened:
      case EVENT.itemRenamed:
      case EVENT.itemNoteSet:
      case EVENT.itemSectionSet:
      case EVENT.listRenamed:
      case EVENT.listArchived:
      case EVENT.listUnarchived:
      case EVENT.sectionRenamed:
        return this.undoFieldChange(event);
      default:
        return this.skip(event, "not_undoable");
    }
  }

  private isListOwner = async (listId: string) => {
    const list = await this.scope.tx.list.findUnique({ where: { id: listId } });
    return (
      !!list &&
      !!this.scope.actor.actingUserId &&
      list.ownerID === this.scope.actor.actingUserId
    );
  };

  private loadCurrent = async (
    event: ListEvent,
  ): Promise<Record<string, unknown> | null> => {
    const { tx } = this.scope;
    const target = eventTarget(event.type);
    if (target === "item" && event.itemId) {
      return tx.item.findUnique({ where: { id: event.itemId } });
    }
    if (target === "section" && event.sectionId) {
      return tx.section.findUnique({ where: { id: event.sectionId } });
    }
    if (target === "list") {
      if (!(await this.isListOwner(event.listId))) return null;
      return tx.list.findUnique({ where: { id: event.listId } });
    }
    return null;
  };

  private writeFields = async (event: ListEvent, data: EventFields) => {
    const { tx } = this.scope;
    const target = eventTarget(event.type);
    if (target === "item") {
      await tx.item.update({
        where: { id: event.itemId! },
        data:
          typeof data.name === "string"
            ? { ...data, normalized: normalizeItemName(data.name) }
            : data,
      });
    } else if (target === "section") {
      await tx.section.update({ where: { id: event.sectionId! }, data });
    } else {
      await tx.list.update({ where: { id: event.listId }, data });
    }
  };

  // Field-wise check (KTD4.4): a field is reset only while it still holds the
  // value this command wrote.
  private async undoFieldChange(event: ListEvent) {
    const current = await this.loadCurrent(event);
    if (!current) {
      return this.skip(
        event,
        event.type.startsWith("list.") ? "not_undoable" : "missing",
      );
    }
    const before = fieldsOf(event.before);
    const after = fieldsOf(event.after);
    const revert: EventFields = {};
    const changedFields: string[] = [];
    const missingSectionFields: string[] = [];

    for (const [field, value] of Object.entries(after)) {
      if (!same(current[field], value)) {
        changedFields.push(field);
      } else if (
        field === "sectionID" &&
        !(await this.sectionInList(before[field], event.listId))
      ) {
        missingSectionFields.push(field);
      } else {
        revert[field] = before[field] ?? null;
      }
    }

    if (changedFields.length > 0)
      this.skip(event, "field_changed", changedFields);
    if (missingSectionFields.length > 0)
      this.skip(event, "missing", missingSectionFields);
    const fields = Object.keys(revert);
    if (fields.length === 0) return;

    await this.writeFields(event, revert);
    const inverseBefore = Object.fromEntries(
      fields.map((field) => [field, after[field]]),
    );
    this.scope.record({
      type: INVERSE_TYPE[event.type] ?? (event.type as EventType),
      listId: event.listId,
      itemId: event.itemId,
      sectionId: event.sectionId,
      before: inverseBefore,
      after: revert,
    });
    this.reverted.push(entryOf(event, fields));
  }

  private sectionInList = async (sectionId: unknown, listId: string) => {
    if (sectionId === null || sectionId === undefined) return true;
    const section = await this.scope.tx.section.findUnique({
      where: { id: String(sectionId) },
    });
    return !!section && section.listId === listId;
  };

  // A created item is deleted only while it is unchanged (U4 approach 7).
  private async undoItemCreated(event: ListEvent) {
    const { tx, record } = this.scope;
    const item = event.itemId
      ? await tx.item.findUnique({ where: { id: event.itemId } })
      : null;
    if (!item) return this.skip(event, "missing");
    const after = fieldsOf(event.after);
    const current: Record<string, unknown> = item;
    const changed = Object.keys(after).filter(
      (field) => !same(current[field], after[field]),
    );
    if (changed.length > 0) return this.skip(event, "changed", changed);

    await tx.item.delete({ where: { id: item.id } });
    record({
      type: EVENT.itemDeleted,
      listId: item.listID,
      itemId: item.id,
      sectionId: item.sectionID,
      before: itemSnapshot(item),
    });
    this.reverted.push(entryOf(event));
  }

  // Restores a deleted item with its id. Without its section it comes back
  // without one.
  private async undoItemDeleted(event: ListEvent) {
    const { tx, record } = this.scope;
    if (!event.itemId) return this.skip(event, "missing");
    if (await tx.item.findUnique({ where: { id: event.itemId } })) {
      return this.skip(event, "exists");
    }
    const snapshot = event.before as ItemSnapshot;
    const sectionID = (await this.sectionInList(
      snapshot.sectionID,
      event.listId,
    ))
      ? snapshot.sectionID
      : null;
    const item = await tx.item.create({
      data: {
        id: event.itemId,
        listID: event.listId,
        name: snapshot.name,
        completed: snapshot.completed,
        description: snapshot.description,
        order: snapshot.order,
        normalized: snapshot.normalized ?? normalizeItemName(snapshot.name),
        createdDate: new Date(snapshot.createdDate),
        sectionID,
      },
    });
    record({
      type: EVENT.itemCreated,
      listId: item.listID,
      itemId: item.id,
      sectionId: sectionID,
      after: {
        name: item.name,
        sectionID,
        description: item.description,
        completed: item.completed,
      },
    });
    this.reverted.push(entryOf(event));
  }

  private async undoSectionCreated(event: ListEvent) {
    const { tx, record } = this.scope;
    const section = event.sectionId
      ? await tx.section.findUnique({ where: { id: event.sectionId } })
      : null;
    if (!section) return this.skip(event, "missing");
    if (!same(section.name, fieldsOf(event.after).name))
      return this.skip(event, "changed", ["name"]);
    if ((await tx.item.count({ where: { sectionID: section.id } })) > 0) {
      return this.skip(event, "not_empty");
    }
    await tx.section.delete({ where: { id: section.id } });
    record({
      type: EVENT.sectionDeleted,
      listId: section.listId,
      sectionId: section.id,
      before: { name: section.name },
    });
    this.reverted.push(entryOf(event));
  }

  private async undoListCreated(event: ListEvent) {
    const { tx, record, captureRecipients } = this.scope;
    if (!(await this.isListOwner(event.listId)))
      return this.skip(event, "not_undoable");
    const list = await tx.list.findUniqueOrThrow({
      where: { id: event.listId },
    });
    if (!same(list.name, fieldsOf(event.after).name))
      return this.skip(event, "changed", ["name"]);
    const [items, sections] = await Promise.all([
      tx.item.count({ where: { listID: list.id } }),
      tx.section.count({ where: { listId: list.id } }),
    ]);
    if (items + sections > 0) return this.skip(event, "not_empty");
    await captureRecipients(list.id);
    await tx.list.delete({ where: { id: list.id } });
    record({
      type: EVENT.listDeleted,
      listId: list.id,
      before: { name: list.name },
    });
    this.reverted.push(entryOf(event));
  }
}

// Takes back the actor's last command (KTD4). The undo is a command of its
// own (kind "undo"); a following change in the same sentence needs a fresh
// CommandContext. There is no redo.
export const undoLastCommand = async (
  actor: Actor,
  { inputText = null }: { inputText?: string | null } = {},
): Promise<UndoResult> => {
  const ctx = new CommandContext(actor, { kind: "undo", inputText });

  const result = await runWrite(
    ctx,
    async (scope): Promise<Omit<UndoResult, "undoCommandId">> => {
      const nothing = (hiddenSkippedCount = 0) => ({
        status: "nothing_to_undo" as const,
        commandId: null,
        reverted: [],
        skipped: [],
        hiddenSkippedCount,
      });

      const candidate = await findCandidate(scope);
      if (!candidate) return nothing();

      const listIds = [
        ...new Set(candidate.events.map((event) => event.listId)),
      ];
      const existing = await scope.tx.list.findMany({
        where: { id: { in: listIds } },
        select: { id: true },
      });
      const existingIds = new Set(existing.map((list) => list.id));
      const visibleIds = await filterVisibleListIds(scope.tx, actor, listIds);

      const deletedLists = new Set(
        candidate.events
          .filter((e) => e.type === EVENT.listDeleted)
          .map((e) => e.listId),
      );
      const deletedSections = new Set(
        candidate.events
          .filter((e) => e.type === EVENT.sectionDeleted)
          .map((e) => e.sectionId),
      );
      const notUndoable = (event: ListEvent) =>
        event.type === EVENT.listDeleted ||
        event.type === EVENT.sectionDeleted ||
        (event.type === EVENT.itemDeleted &&
          (deletedLists.has(event.listId) ||
            (event.sectionId !== null &&
              deletedSections.has(event.sectionId))));

      const hidden = candidate.events.filter(
        (event) =>
          !notUndoable(event) &&
          existingIds.has(event.listId) &&
          !visibleIds.has(event.listId),
      );
      // Nothing of this command is within the actor's reach: leave it untouched
      // so its author can still undo it elsewhere.
      if (hidden.length === candidate.events.length)
        return nothing(hidden.length);

      const claimed = await scope.tx.command.updateMany({
        where: { id: candidate.id, undoState: "none" },
        data: { undoState: "undone", undoneAt: new Date() },
      });
      if (claimed.count === 0) return nothing();

      ctx.undoOfId = candidate.id;
      await scope.ensureCommand();

      const undoer = new EventUndoer(scope);
      for (const event of candidate.events) {
        if (notUndoable(event)) undoer.skip(event, "not_undoable");
        else if (!existingIds.has(event.listId)) undoer.skip(event, "missing");
        else if (visibleIds.has(event.listId)) await undoer.undo(event);
      }

      const complete = undoer.skipped.length === 0 && hidden.length === 0;
      const undoState: UndoState = complete ? "undone" : "partial";
      await scope.tx.command.update({
        where: { id: candidate.id },
        data: { undoState },
      });

      return {
        status: complete ? "undone" : "partial",
        commandId: candidate.id,
        reverted: undoer.reverted,
        skipped: undoer.skipped,
        hiddenSkippedCount: hidden.length,
      };
    },
  );

  return { ...result, undoCommandId: ctx.commandId };
};
