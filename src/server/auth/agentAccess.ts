import type { Prisma } from "@prisma/client";
import { prisma } from "db/prisma";
import { isPlainObject } from "server/http/json";
import {
  ListServiceError,
  notFound,
  ownerOrContributorWhere,
} from "server/lists/access";
import { MAX_LABEL_LENGTH } from "./agentAccessRules";
import { generateAgentToken } from "./agentTokens";

// Managing agent accesses from the web app (KTD12). Only the creator sees and
// revokes an access; token and hash never leave this module.

export type AgentAccessKind = "person" | "household";

export type AgentAccessMember = {
  id: string;
  name: string | null;
  email: string;
};

export type AgentAccessSummary = {
  id: string;
  label: string;
  kind: AgentAccessKind;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  members: AgentAccessMember[];
};

const LABEL_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
// Channels the app uses itself.
const RESERVED_LABELS = new Set(["web", "v1"]);

const memberSelect = { id: true, name: true, email: true } as const;

const accessSelect = {
  id: true,
  label: true,
  kind: true,
  createdAt: true,
  lastUsedAt: true,
  revokedAt: true,
  members: { select: memberSelect, orderBy: { email: "asc" } },
} satisfies Prisma.AgentAccessSelect;

type AccessRow = Prisma.AgentAccessGetPayload<{ select: typeof accessSelect }>;

const toSummary = (access: AccessRow): AgentAccessSummary => ({
  id: access.id,
  label: access.label,
  kind: access.kind as AgentAccessKind,
  createdAt: access.createdAt.toISOString(),
  lastUsedAt: access.lastUsedAt?.toISOString() ?? null,
  revokedAt: access.revokedAt?.toISOString() ?? null,
  members: access.members,
});

const invalid = (message: string) => new ListServiceError("invalid", message);

export const listAgentAccesses = async (userId: string) => {
  const accesses = await prisma.agentAccess.findMany({
    where: { createdById: userId },
    select: accessSelect,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  return accesses.map(toSummary);
};

// People who own or contribute to at least one list the user also owns or
// contributes to. Only they may join the user's household access.
export const listHouseholdCandidates = (
  userId: string,
): Promise<AgentAccessMember[]> =>
  prisma.user.findMany({
    where: {
      id: { not: userId },
      OR: [
        { ownedLists: { some: ownerOrContributorWhere(userId) } },
        { contributedLists: { some: ownerOrContributorWhere(userId) } },
      ],
    },
    select: memberSelect,
    orderBy: { email: "asc" },
  });

const parseLabel = (value: unknown) => {
  if (typeof value !== "string" || !value.trim()) {
    throw invalid("Label is required");
  }
  const label = value.trim().toLowerCase();
  if (label.length > MAX_LABEL_LENGTH) {
    throw invalid(`Label must be at most ${MAX_LABEL_LENGTH} characters`);
  }
  if (!LABEL_PATTERN.test(label)) {
    throw invalid(
      "Label may only contain lowercase letters, digits and dashes, starting with a letter or digit",
    );
  }
  if (RESERVED_LABELS.has(label)) {
    throw invalid(`Label "${label}" is reserved`);
  }
  return label;
};

const parseMemberEmails = (value: unknown) => {
  if (value === undefined || value === null) return [];
  if (
    !Array.isArray(value) ||
    !value.every((email) => typeof email === "string")
  ) {
    throw invalid("memberEmails must be a list of e-mail addresses");
  }
  const emails = value
    .map((email: string) => email.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set(emails)];
};

// Member ids for a new access, enforcing KTD12: a person access has exactly
// its creator; a household has the creator plus people who share a list with
// them, so it never sees more than the creator.
const resolveMemberIds = async (
  creatorId: string,
  kind: AgentAccessKind,
  memberEmails: string[],
) => {
  const creator = await prisma.user.findUniqueOrThrow({
    where: { id: creatorId },
    select: { email: true },
  });
  const creatorEmail = creator.email.toLowerCase();
  const others = memberEmails.filter((email) => email !== creatorEmail);

  if (kind === "person") {
    if (others.length > 0) {
      throw invalid("A person access can only be created for yourself");
    }
    return [creatorId];
  }

  if (!memberEmails.includes(creatorEmail)) {
    throw invalid("A household access must include you");
  }
  if (others.length === 0) {
    throw invalid("A household access needs at least one other member");
  }
  const candidates = await listHouseholdCandidates(creatorId);
  const byEmail = new Map(
    candidates.map((candidate) => [candidate.email.toLowerCase(), candidate]),
  );
  const unknown = others.filter((email) => !byEmail.has(email));
  if (unknown.length > 0) {
    throw invalid(
      `You do not share a list with: ${unknown.join(", ")}`,
    );
  }
  return [creatorId, ...others.map((email) => byEmail.get(email)!.id)];
};

// Creates an access from an untrusted request body. Returns the token, which
// is shown once and never stored.
export const createAgentAccess = async (creatorId: string, body: unknown) => {
  if (!isPlainObject(body)) throw invalid("Invalid request body");
  const label = parseLabel(body.label);
  if (body.kind !== "person" && body.kind !== "household") {
    throw invalid('Kind must be "person" or "household"');
  }
  const kind: AgentAccessKind = body.kind;
  const memberIds = await resolveMemberIds(
    creatorId,
    kind,
    parseMemberEmails(body.memberEmails),
  );

  const { token, tokenId, tokenHash } = generateAgentToken();
  const access = await prisma.agentAccess.create({
    data: {
      label,
      kind,
      tokenId,
      tokenHash,
      createdById: creatorId,
      members: { connect: memberIds.map((id) => ({ id })) },
    },
    select: accessSelect,
  });
  return { access: toSummary(access), token };
};

// Revokes an access of the creator. Other users get not_found, so they cannot
// probe for ids. Revoking twice keeps the first time.
export const revokeAgentAccess = async (creatorId: string, id: string) => {
  const access = await prisma.agentAccess.findFirst({
    where: { id, createdById: creatorId },
    select: accessSelect,
  });
  if (!access) throw notFound("Agent access");
  if (access.revokedAt) return toSummary(access);

  const revoked = await prisma.agentAccess.update({
    where: { id },
    data: { revokedAt: new Date() },
    select: accessSelect,
  });
  return toSummary(revoked);
};
