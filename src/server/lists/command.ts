import { prisma } from "db/prisma";
import { liveBus } from "server/live/bus";
import { assertValidActor, type Db } from "./access";
import type { Actor } from "./actor";
import type { CommandKind, EventRecord } from "./events";

type CommandOptions = {
  inputText?: string | null;
  kind?: CommandKind;
  undoOfId?: string | null;
};

// One command per user intent (KTD3). Operations of the same sentence share a
// context and thereby one Command row. The row is created inside the first
// write transaction that records an event, or up-front with start().
export class CommandContext {
  readonly actor: Actor;
  readonly inputText: string | null;
  readonly kind: CommandKind;
  undoOfId: string | null;
  commandId: string | null = null;

  constructor(
    actor: Actor,
    { inputText = null, kind = "change", undoOfId = null }: CommandOptions = {},
  ) {
    assertValidActor(actor);
    this.actor = actor;
    this.inputText = inputText;
    this.kind = kind;
    this.undoOfId = undoOfId;
  }

  // Creates the Command row right away, e.g. for an agent sentence that must
  // count against the daily limit even if it never changes anything (KTD10).
  static async start(actor: Actor, options: CommandOptions = {}) {
    const ctx = new CommandContext(actor, options);
    ctx.commandId = (
      await prisma.command.create({ data: ctx.commandData() })
    ).id;
    return ctx;
  }

  // A fresh change command for the same sentence, e.g. after an undo (KTD4.6).
  next() {
    return new CommandContext(this.actor, { inputText: this.inputText });
  }

  commandData() {
    return {
      actorUserId: this.actor.actingUserId,
      accessId: this.actor.accessId,
      channel: this.actor.channel,
      origin: this.actor.origin,
      inputText: this.inputText,
      kind: this.kind,
      undoOfId: this.undoOfId,
    };
  }
}

export type WriteScope = {
  tx: Db;
  actor: Actor;
  // Adds an event; it is stored with the command when the write commits.
  record: (event: EventRecord) => void;
  // Marks a list as changed without an event (e.g. a pure reorder).
  touch: (listId: string) => void;
  // Reads a list's members now, for lists that the write deletes.
  captureRecipients: (listId: string) => Promise<void>;
  // Creates the command row in this transaction if it does not exist yet.
  ensureCommand: () => Promise<string>;
};

const loadMembers = async (tx: Db, listIds: string[]) => {
  const lists = await tx.list.findMany({
    where: { id: { in: listIds } },
    select: { id: true, ownerID: true, contributors: { select: { id: true } } },
  });
  return new Map(
    lists.map((list) => [
      list.id,
      [list.ownerID, ...list.contributors.map((user) => user.id)],
    ]),
  );
};

// Runs fn in one transaction with the command and its events, then reports
// the change to the live bus after the commit (KTD1, KTD8).
export const runWrite = async <T>(
  ctx: CommandContext,
  fn: (scope: WriteScope) => Promise<T>,
): Promise<T> => {
  const { value, commandId, listIds, recipientUserIds } =
    await prisma.$transaction(async (tx) => {
      const events: EventRecord[] = [];
      const touched = new Set<string>();
      const recipientsByList = new Map<string, string[]>();
      let commandId = ctx.commandId;

      const ensureCommand = async () => {
        commandId ??= (await tx.command.create({ data: ctx.commandData() })).id;
        return commandId;
      };

      const value = await fn({
        tx,
        actor: ctx.actor,
        record: (event) => {
          events.push(event);
          touched.add(event.listId);
        },
        touch: (listId) => touched.add(listId),
        captureRecipients: async (listId) => {
          const members = await loadMembers(tx, [listId]);
          recipientsByList.set(listId, members.get(listId) ?? []);
        },
        ensureCommand,
      });

      if (events.length > 0) {
        const id = await ensureCommand();
        await tx.listEvent.createMany({
          data: events.map((event) => ({
            commandId: id,
            type: event.type,
            listId: event.listId,
            itemId: event.itemId ?? null,
            sectionId: event.sectionId ?? null,
            before: event.before,
            after: event.after,
          })),
        });
      }

      const missing = [...touched].filter(
        (listId) => !recipientsByList.has(listId),
      );
      for (const [listId, members] of await loadMembers(tx, missing)) {
        recipientsByList.set(listId, members);
      }
      const recipientUserIds = [
        ...new Set(
          [...touched].flatMap((id) => recipientsByList.get(id) ?? []),
        ),
      ];

      return { value, commandId, listIds: [...touched], recipientUserIds };
    });

  ctx.commandId = commandId;
  if (listIds.length > 0) {
    liveBus.publish({
      listIds,
      commandId,
      clientId: ctx.actor.clientId ?? null,
      recipientUserIds,
    });
  }
  return value;
};
