import { beforeEach, describe, expect, test } from "bun:test";
import { prisma } from "db/prisma";
import { resetDatabase } from "./setup/db";

const createUser = (email: string) => prisma.user.create({ data: { email } });

const createListWithItem = async (ownerID: string) => {
  const list = await prisma.list.create({ data: { name: "Groceries", ownerID } });
  const item = await prisma.item.create({
    data: { name: "Milk", listID: list.id, normalized: "milk" },
  });
  return { list, item };
};

describe("agent backend schema", () => {
  beforeEach(resetDatabase);

  test("a Command with two ListEvents can be created and loaded with its events", async () => {
    const user = await createUser("person-a@example.test");
    const { list, item } = await createListWithItem(user.id);

    const command = await prisma.command.create({
      data: {
        actorUserId: user.id,
        channel: "web",
        origin: "web",
        kind: "change",
        events: {
          create: [
            {
              type: "item.created",
              listId: list.id,
              itemId: item.id,
              after: { name: "Milk", sectionID: null, description: "" },
            },
            {
              type: "item.completed",
              listId: list.id,
              itemId: item.id,
              before: { completed: false },
              after: { completed: true },
            },
          ],
        },
      },
    });

    const loaded = await prisma.command.findUniqueOrThrow({
      where: { id: command.id },
      include: { events: { orderBy: { createdAt: "asc" } } },
    });

    expect(loaded.undoState).toBe("none");
    expect(loaded.events).toHaveLength(2);
    expect(loaded.events.map((event) => event.type).sort()).toEqual([
      "item.completed",
      "item.created",
    ]);
    const completed = loaded.events.find((event) => event.type === "item.completed");
    expect(completed?.before).toEqual({ completed: false });
    expect(completed?.after).toEqual({ completed: true });
  });

  test("a ListEvent survives the deletion of its item and list", async () => {
    const user = await createUser("person-a@example.test");
    const { list, item } = await createListWithItem(user.id);

    const command = await prisma.command.create({
      data: {
        actorUserId: user.id,
        channel: "web",
        origin: "web",
        kind: "change",
        events: {
          create: {
            type: "item.deleted",
            listId: list.id,
            itemId: item.id,
            before: { name: "Milk", completed: false },
          },
        },
      },
    });

    await prisma.item.delete({ where: { id: item.id } });
    await prisma.list.delete({ where: { id: list.id } });

    const events = await prisma.listEvent.findMany({ where: { commandId: command.id } });
    expect(events).toHaveLength(1);
    expect(events[0].itemId).toBe(item.id);
    expect(events[0].listId).toBe(list.id);
  });

  test("two AgentAccess rows with the same token hash violate the unique constraint", async () => {
    const user = await createUser("person-a@example.test");
    const data = {
      label: "claude-code",
      kind: "person",
      tokenHash: "a".repeat(64),
      createdById: user.id,
      members: { connect: { id: user.id } },
    };

    const first = await prisma.agentAccess.create({
      data: { ...data, tokenId: "abcd1234" },
      include: { members: true },
    });
    expect(first.members.map((member) => member.id)).toEqual([user.id]);

    const error = await prisma.agentAccess
      .create({ data: { ...data, tokenId: "efgh5678" } })
      .then(
        () => null,
        (err: unknown) => err,
      );
    expect(error).toMatchObject({ code: "P2002" });
    expect(await prisma.agentAccess.count()).toBe(1);
  });
});
