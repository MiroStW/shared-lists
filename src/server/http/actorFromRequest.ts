import { getServerSession } from "auth/getServerSession";
import { personActor, type Actor } from "server/lists/actor";
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

// Resolves who is calling. Reads headers and the session only, never the
// body, so handlers can still parse it. Today only the web session is
// supported; further credentials (e.g. bearer tokens) are resolved here
// before the session fallback.
export const actorFromRequest = async (request: Request): Promise<Actor> => {
  const session = await getServerSession();
  if (!session.user?.id) throw new UnauthenticatedError();
  return personActor(session.user.id, {
    channel: "web",
    origin: "web",
    clientId: readClientId(request),
  });
};
