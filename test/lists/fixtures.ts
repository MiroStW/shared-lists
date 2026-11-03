import { prisma } from "db/prisma";
import { generateAgentToken } from "server/auth/agentTokens";

// Test data is created directly with Prisma, bypassing the list service, so
// fixtures never write commands or events of their own.

export const createUser = (label: string) =>
  prisma.user.create({
    data: { email: `${label}@example.test`, name: label, passwordHash: "hash" },
  });

export const createList = (
  ownerID: string,
  { name = "List", contributorIds = [] as string[], isArchived = false } = {},
) =>
  prisma.list.create({
    data: {
      name,
      ownerID,
      isArchived,
      contributors: { connect: contributorIds.map((id) => ({ id })) },
    },
  });

export const createSection = (listId: string, name = "Section") =>
  prisma.section.create({ data: { listId, name } });

export const createItem = (
  listID: string,
  {
    name = "Item",
    completed = false,
    sectionID = null as string | null,
    order = 0,
  } = {},
) =>
  prisma.item.create({
    data: {
      listID,
      name,
      completed,
      sectionID,
      order,
      normalized: name.toLowerCase(),
    },
  });

export const countCommandsAndEvents = async () => ({
  commands: await prisma.command.count(),
  events: await prisma.listEvent.count(),
});

export const eventsOf = (commandId: string) =>
  prisma.listEvent.findMany({ where: { commandId }, orderBy: { seq: "asc" } });

// Runs fn and returns the error it throws, or null.
export const caught = async (fn: () => Promise<unknown>) => {
  try {
    await fn();
    return null;
  } catch (error) {
    return error;
  }
};

// An agent access created directly in the database, with its plain token.
export const createAgentAccess = async (
  creator: { id: string },
  {
    kind = "person" as "person" | "household",
    label = "test-agent",
    memberIds = [creator.id],
  } = {},
) => {
  const { token, tokenId, tokenHash } = generateAgentToken();
  const access = await prisma.agentAccess.create({
    data: {
      label,
      kind,
      tokenId,
      tokenHash,
      createdById: creator.id,
      members: { connect: memberIds.map((id) => ({ id })) },
    },
  });
  return { access, token };
};
