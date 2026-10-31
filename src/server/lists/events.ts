// Event types and enum-like values of the event log (KTD3). They are plain
// strings in the database so new types need no migration.
export const EVENT = {
  itemCreated: "item.created",
  itemCompleted: "item.completed",
  itemReopened: "item.reopened",
  itemRenamed: "item.renamed",
  itemNoteSet: "item.note_set",
  itemSectionSet: "item.section_set",
  itemDeleted: "item.deleted",
  listCreated: "list.created",
  listRenamed: "list.renamed",
  listArchived: "list.archived",
  listUnarchived: "list.unarchived",
  listDeleted: "list.deleted",
  sectionCreated: "section.created",
  sectionRenamed: "section.renamed",
  sectionDeleted: "section.deleted",
} as const;

export type EventType = (typeof EVENT)[keyof typeof EVENT];

export type CommandKind = "change" | "undo";
export type UndoState = "none" | "undone" | "partial";

// Only the changed fields, keyed by their Prisma field names.
export type EventFields = Record<string, string | number | boolean | null>;

// The stored before/after JSON of an event; missing fields read as empty.
export const fieldsOf = (value: unknown) => (value ?? {}) as EventFields;

// What an event type is about: "item", "list" or "section".
export const eventTarget = (type: string) => type.split(".")[0];

export type EventRecord = {
  type: EventType;
  listId: string;
  itemId?: string | null;
  sectionId?: string | null;
  before?: EventFields;
  after?: EventFields;
};

// Full item state stored in item.deleted, enough to restore it with its id.
export type ItemSnapshot = {
  name: string;
  completed: boolean;
  description: string;
  sectionID: string | null;
  order: number;
  normalized: string;
  createdDate: string;
};

export const itemSnapshot = (item: {
  name: string;
  completed: boolean;
  description: string;
  sectionID: string | null;
  order: number;
  normalized: string;
  createdDate: Date;
}): ItemSnapshot => ({
  name: item.name,
  completed: item.completed,
  description: item.description,
  sectionID: item.sectionID,
  order: item.order,
  normalized: item.normalized,
  createdDate: item.createdDate.toISOString(),
});
