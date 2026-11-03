import { createHash, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "db/prisma";
import { readBearerToken } from "server/auth/agentAuth";
import { ListServiceError } from "server/lists/access";
import { personActor, type Actor } from "server/lists/actor";

// The legacy v1 API (KTD6). It accepts only SHARED_LISTS_API_TOKEN and acts
// as the user named by SHARED_LISTS_API_TOKEN_OWNER_EMAIL, on channel "v1".
// There is no global fallback: without the owner every call answers 403.

export class V1AuthError extends Error {
  readonly status: 401 | 403;

  constructor(status: 401 | 403, message: string) {
    super(message);
    this.name = "V1AuthError";
    this.status = status;
  }
}

const sha256 = (value: string) => createHash("sha256").update(value).digest();

// Hashing first gives equal lengths, so the comparison runs in constant time.
const tokensEqual = (actual: string, expected: string) =>
  timingSafeEqual(sha256(actual), sha256(expected));

export const v1ActorFromRequest = async (request: Request): Promise<Actor> => {
  const token = readBearerToken(request);
  if (!token) {
    throw new V1AuthError(401, "Missing or invalid authorization header");
  }

  const expectedToken = process.env.SHARED_LISTS_API_TOKEN;
  if (!expectedToken) {
    throw new V1AuthError(403, "Forbidden: SHARED_LISTS_API_TOKEN is not set");
  }
  if (!tokensEqual(token, expectedToken)) {
    throw new V1AuthError(403, "Forbidden: Invalid API token");
  }

  const ownerEmail = process.env.SHARED_LISTS_API_TOKEN_OWNER_EMAIL?.trim();
  if (!ownerEmail) {
    throw new V1AuthError(
      403,
      "Forbidden: SHARED_LISTS_API_TOKEN_OWNER_EMAIL is not set",
    );
  }
  const owner = await prisma.user.findFirst({
    where: { email: { equals: ownerEmail, mode: "insensitive" } },
    select: { id: true },
  });
  if (!owner) {
    throw new V1AuthError(
      403,
      "Forbidden: no user matches SHARED_LISTS_API_TOKEN_OWNER_EMAIL",
    );
  }

  return personActor(owner.id, { channel: "v1", origin: "v1" });
};

// Maps errors to the v1 responses. A list or item the owner cannot see is
// answered like a missing one (404), so v1 does not reveal foreign ids.
export const v1ErrorResponse = (
  error: unknown,
  { context, notFound }: { context: string; notFound: string },
) => {
  if (error instanceof V1AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof ListServiceError) {
    if (error.kind === "invalid") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: notFound }, { status: 404 });
  }
  console.error(context, error);
  return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
};
