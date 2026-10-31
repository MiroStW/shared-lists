import { prisma } from "db/prisma";
import type { Actor } from "server/lists/actor";

export const DEFAULT_DAILY_COMMAND_LIMIT = 300;

// Sentences per access (or per user without one) and day (KTD10).
export const dailyCommandLimit = () => {
  const value = Number(process.env.LIST_AGENT_DAILY_COMMAND_LIMIT);
  return Number.isInteger(value) && value > 0
    ? value
    : DEFAULT_DAILY_COMMAND_LIMIT;
};

export class CommandLimitError extends Error {
  readonly limit: number;

  constructor(limit: number) {
    super(
      `Daily limit of ${limit} sentences reached for this access. Tool calls still work; sentences work again tomorrow.`,
    );
    this.name = "CommandLimitError";
    this.limit = limit;
  }
}

const startOfDay = (now: Date) => {
  const day = new Date(now);
  day.setHours(0, 0, 0, 0);
  return day;
};

// Sentences that reached the model today. Each one opened a change command
// with its text and origin "agent" on entry. Undo commands of a sentence are
// not counted; web clicks, tool calls and answers to a question never create
// such a command.
const countSentencesToday = (actor: Actor, now = new Date()) =>
  prisma.command.count({
    where: {
      ...(actor.accessId
        ? { accessId: actor.accessId }
        : { actorUserId: actor.actingUserId, accessId: null }),
      origin: "agent",
      kind: "change",
      inputText: { not: null },
      createdAt: { gte: startOfDay(now) },
    },
  });

// Throws CommandLimitError when the actor has used up today's sentences.
export const assertWithinDailyLimit = async (actor: Actor) => {
  const limit = dailyCommandLimit();
  if ((await countSentencesToday(actor)) >= limit) {
    throw new CommandLimitError(limit);
  }
};
