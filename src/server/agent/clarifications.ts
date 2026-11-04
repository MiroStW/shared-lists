import type { Clarification, Prisma } from "@prisma/client";
import { prisma } from "db/prisma";
import { isPlainObject } from "server/http/json";
import type { Actor } from "server/lists/actor";
import { ASK_USER_TOOL_NAME, UNDO_TOOL_NAME } from "server/tools/names";
import { findTool } from "server/tools/registry";

// Questions the agent asks with prepared tool calls (KTD11). An answer runs
// the stored call without the model and appends its events to the command of
// the sentence that asked.

export const CLARIFICATION_TTL_MS = 30 * 60 * 1000;
export const MAX_CLARIFICATION_OPTIONS = 9;

export type ClarificationOption = {
  label: string;
  tool: string;
  input: Record<string, unknown>;
};

// Tools an option must not call: undo is no choice between items.
const FORBIDDEN_OPTION_TOOLS = new Set([UNDO_TOOL_NAME, ASK_USER_TOOL_NAME]);

// Keeps the options whose tool call is valid against the registry schema and
// drops the rest.
export const validateOptions = (raw: unknown): ClarificationOption[] => {
  if (!Array.isArray(raw)) return [];
  const valid: ClarificationOption[] = [];
  for (const option of raw) {
    if (!isPlainObject(option)) continue;
    const { label, tool: toolName, input = {} } = option;
    if (typeof label !== "string" || !label.trim()) continue;
    if (typeof toolName !== "string" || FORBIDDEN_OPTION_TOOLS.has(toolName))
      continue;
    const tool = findTool(toolName);
    if (!tool || !isPlainObject(input)) continue;
    if (!tool.inputSchema.safeParse(input).success) continue;
    valid.push({ label: label.trim(), tool: toolName, input });
    if (valid.length === MAX_CLARIFICATION_OPTIONS) break;
  }
  return valid;
};

// One open question per person, or per access when no person is known. A
// household access sees only questions asked through it, never a member's
// private question from another channel.
const ownerWhere = (actor: Actor): Prisma.ClarificationWhereInput => {
  if (!actor.actingUserId)
    return { actorUserId: null, accessId: actor.accessId };
  return actor.memberUserIds.length > 1
    ? { actorUserId: actor.actingUserId, accessId: actor.accessId }
    : { actorUserId: actor.actingUserId };
};

const openWhere = (
  actor: Actor,
  now: Date,
): Prisma.ClarificationWhereInput => ({
  ...ownerWhere(actor),
  resolvedAt: null,
  expiresAt: { gt: now },
});

export const optionsOf = (clarification: Pick<Clarification, "options">) =>
  clarification.options as ClarificationOption[];

// Stores a question and closes any older open one of the same owner.
export const createClarification = (
  actor: Actor,
  {
    commandId,
    question,
    options,
    inputText,
  }: {
    commandId: string;
    question: string;
    options: ClarificationOption[];
    inputText: string;
  },
) =>
  prisma.$transaction(async (tx) => {
    const now = new Date();
    await tx.clarification.updateMany({
      where: { ...ownerWhere(actor), resolvedAt: null },
      data: { resolvedAt: now },
    });
    return tx.clarification.create({
      data: {
        actorUserId: actor.actingUserId,
        accessId: actor.accessId,
        commandId,
        question,
        // Model input parsed from JSON, so it is plain JSON.
        options: options as Prisma.InputJsonArray,
        inputText,
        expiresAt: new Date(now.getTime() + CLARIFICATION_TTL_MS),
      },
    });
  });

// The actor's open, unexpired question, if any.
export const findOpenClarification = (actor: Actor, now = new Date()) =>
  prisma.clarification.findFirst({
    where: openWhere(actor, now),
    orderBy: { createdAt: "desc" },
  });

// An open question by id, only when it belongs to the actor.
export const findOpenClarificationById = (
  actor: Actor,
  id: string,
  now = new Date(),
) =>
  prisma.clarification.findFirst({ where: { id, ...openWhere(actor, now) } });

// Marks a question answered. False when someone else answered it first, so a
// stored call never runs twice.
export const claimClarification = async (id: string) =>
  (
    await prisma.clarification.updateMany({
      where: { id, resolvedAt: null },
      data: { resolvedAt: new Date() },
    })
  ).count === 1;

// Reopens a claimed question whose stored call failed unexpectedly, so it can
// be answered again.
export const releaseClarification = (id: string) =>
  prisma.clarification.update({
    where: { id },
    data: { resolvedAt: null },
  });

// The 1-based option a text answer picks: a bare number ("2", "2.") or an
// option label (case-insensitive). Null for any other text.
export const matchAnswer = (
  options: Pick<ClarificationOption, "label">[],
  text: string,
): number | null => {
  const answer = text.trim();
  const number = /^(\d+)[.)]?$/.exec(answer);
  if (number) {
    const index = Number(number[1]);
    return index >= 1 && index <= options.length ? index : null;
  }
  const key = answer.toLowerCase();
  const index = options.findIndex(
    (option) => option.label.toLowerCase() === key,
  );
  return index === -1 ? null : index + 1;
};

// The question as text with numbered options, for every channel (R9).
export const formatQuestion = (
  question: string,
  options: Pick<ClarificationOption, "label">[],
) =>
  [
    question.trim(),
    ...options.map((option, index) => `${index + 1}. ${option.label}`),
  ].join("\n");

// The structured question in an agent response.
export const clarificationOutput = (clarification: Clarification) => ({
  id: clarification.id,
  question: clarification.question,
  options: optionsOf(clarification).map((option, index) => ({
    number: index + 1,
    label: option.label,
  })),
  expires_at: clarification.expiresAt.toISOString(),
});

export type ClarificationOutput = ReturnType<typeof clarificationOutput>;
