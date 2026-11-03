import { getServerSession } from "auth/getServerSession";
import { actorFromAgentRequest } from "server/auth/agentAuth";
import {
  personActor,
  type Actor,
  type CommandOrigin,
} from "server/lists/actor";
import { UnauthenticatedError } from "./errors";

const CLIENT_ID_HEADER = "x-sl-client";
const MAX_CLIENT_ID_LENGTH = 128;

// The browser tab id sent by the web client, so it can skip live updates it
// caused itself (KTD8).
const readClientId = (request: Request) => {
  const value = request.headers.get(CLIENT_ID_HEADER)?.trim();
  if (!value) return null;
  return value.slice(0, MAX_CLIENT_ID_LENGTH);
};

// The id of the signed-in web user. Throws UnauthenticatedError without one.
export const sessionUserId = async () => {
  const session = await getServerSession();
  if (!session.user?.id) throw new UnauthenticatedError();
  return session.user.id;
};

export type ActorFromRequestOptions = {
  // Also accept an agent access token (`Authorization: Bearer sl_...`).
  // Plain web routes leave this off and stay session-only.
  allowAgentToken?: boolean;
  // How the request entered, e.g. "tool" for tool calls or "agent" for
  // sentences. Defaults to "web" for a session and "tool" for a token.
  origin?: CommandOrigin;
};

// Resolves who is calling: the web session first, then an agent token when
// allowed. Reads headers and the session only, never the body, so handlers can
// still parse it.
export const actorFromRequest = async (
  request: Request,
  { allowAgentToken = false, origin }: ActorFromRequestOptions = {},
): Promise<Actor> => {
  const session = await getServerSession();
  if (session.user?.id) {
    return personActor(session.user.id, {
      channel: "web",
      origin: origin ?? "web",
      clientId: readClientId(request),
    });
  }

  if (allowAgentToken) {
    const actor = await actorFromAgentRequest(request, { origin });
    if (actor) return actor;
  }
  throw new UnauthenticatedError();
};
