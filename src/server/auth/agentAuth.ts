import { prisma } from "db/prisma";
import { ListServiceError } from "server/lists/access";
import {
  householdActor,
  personActor,
  type Actor,
  type CommandOrigin,
} from "server/lists/actor";
import { UnauthenticatedError } from "server/http/errors";
import { agentTokenMatches, parseAgentToken } from "./agentTokens";

// A household access may name the person behind a call by e-mail (KTD2).
export const ACTING_USER_HEADER = "x-acting-user";

// The token from `Authorization: Bearer <token>`, or null without one.
export const readBearerToken = (request: Request) => {
  const match = /^Bearer\s+(\S+)\s*$/i.exec(
    request.headers.get("authorization") ?? "",
  );
  return match ? match[1] : null;
};

const findActiveAccess = async (token: string) => {
  const parsed = parseAgentToken(token);
  if (!parsed) return null;
  const access = await prisma.agentAccess.findUnique({
    where: { tokenId: parsed.tokenId },
    include: { members: { select: { id: true, email: true } } },
  });
  if (!access || access.revokedAt) return null;
  if (!agentTokenMatches(token, access.tokenHash)) return null;
  return access;
};

// Resolves an agent access token to its actor. The access label is the
// channel. Unknown, malformed and revoked tokens throw UnauthenticatedError.
export const actorFromAgentToken = async (
  token: string,
  {
    actingUserEmail = null,
    origin = "tool",
  }: { actingUserEmail?: string | null; origin?: CommandOrigin } = {},
): Promise<Actor> => {
  const access = await findActiveAccess(token);
  if (!access) throw new UnauthenticatedError();

  await prisma.agentAccess.update({
    where: { id: access.id },
    data: { lastUsedAt: new Date() },
  });

  const options = { accessId: access.id, channel: access.label, origin };
  const memberIds = access.members.map((member) => member.id);

  if (access.kind === "person") {
    if (actingUserEmail) {
      throw new ListServiceError(
        "invalid",
        `${ACTING_USER_HEADER} is only allowed for household accesses`,
      );
    }
    // A person access has exactly its creator as member.
    if (memberIds.length !== 1) throw new UnauthenticatedError();
    return personActor(memberIds[0], options);
  }

  // A household that lost members down to one would see that member's
  // private lists; it stops working instead.
  if (memberIds.length < 2) throw new UnauthenticatedError();
  let actingUserId: string | null = null;
  if (actingUserEmail) {
    const email = actingUserEmail.toLowerCase();
    const member = access.members.find(
      (candidate) => candidate.email.toLowerCase() === email,
    );
    if (!member) {
      throw new ListServiceError(
        "forbidden",
        "Acting user is not a member of this access",
      );
    }
    actingUserId = member.id;
  }
  return householdActor(memberIds, { ...options, actingUserId });
};

// Actor for a request with an agent token, or null when it carries none.
export const actorFromAgentRequest = async (
  request: Request,
  { origin = "tool" }: { origin?: CommandOrigin } = {},
) => {
  const token = readBearerToken(request);
  if (!token) return null;
  const actingUserEmail =
    request.headers.get(ACTING_USER_HEADER)?.trim() || null;
  return actorFromAgentToken(token, { actingUserEmail, origin });
};
