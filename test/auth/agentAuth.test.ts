import { beforeEach, describe, expect, test } from "bun:test";
import type { User } from "@prisma/client";
import { prisma } from "db/prisma";
import {
  agentTokenMatches,
  generateAgentToken,
  hashAgentToken,
  parseAgentToken,
} from "server/auth/agentTokens";
import {
  actorFromRequest,
  type ActorFromRequestOptions,
} from "server/http/actorFromRequest";
import { errorResponse } from "server/http/errors";
import { resetDatabase } from "../setup/db";
import { setSessionUser } from "../setup/session";
import { caught, createUser } from "../lists/fixtures";

const TOKEN_PATTERN = /^sl_[a-z0-9]{8}_[A-Za-z0-9_-]{43}$/;

// Creates an access directly in the database and returns it with its token.
const createAccess = async (
  creator: User,
  {
    kind = "person",
    label = "claude-code",
    members = [creator],
    revoked = false,
  }: {
    kind?: "person" | "household";
    label?: string;
    members?: User[];
    revoked?: boolean;
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
      revokedAt: revoked ? new Date() : null,
      members: { connect: members.map(({ id }) => ({ id })) },
    },
  });
  return { access, token };
};

const request = (headers: Record<string, string> = {}) =>
  new Request("http://localhost/api/agent/tools/x", { headers });

const bearer = (token: string, extra: Record<string, string> = {}) =>
  request({ authorization: `Bearer ${token}`, ...extra });

const agentActor = (
  req: Request,
  options: ActorFromRequestOptions = { allowAgentToken: true },
) => actorFromRequest(req, options);

// The HTTP status a route would answer for the error actorFromRequest throws.
const statusOf = async (req: Request, options?: ActorFromRequestOptions) => {
  const error = await caught(() => agentActor(req, options));
  expect(error).not.toBeNull();
  return errorResponse(error, { context: "test" }).status;
};

// Replaces the secret's last character, keeping the format valid.
const tamper = (token: string) =>
  token.slice(0, -1) + (token.endsWith("A") ? "B" : "A");

describe("agent tokens", () => {
  test("a generated token has the sl_<id>_<secret> format", () => {
    const { token, tokenId, tokenHash } = generateAgentToken();

    expect(token).toMatch(TOKEN_PATTERN);
    expect(token.slice(3, 11)).toBe(tokenId);
    expect(tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(tokenHash).toBe(hashAgentToken(token));
    expect(tokenHash).not.toContain(token.slice(12));
  });

  test("tokens are unique", () => {
    const tokens = Array.from({ length: 50 }, () => generateAgentToken());
    expect(new Set(tokens.map((t) => t.token)).size).toBe(50);
    expect(new Set(tokens.map((t) => t.tokenId)).size).toBe(50);
  });

  test("parse returns the token id and rejects malformed tokens", () => {
    const { token, tokenId } = generateAgentToken();
    expect(parseAgentToken(token)).toEqual({ tokenId });

    for (const bad of [
      "",
      "sl_",
      token.slice(0, -1),
      `${token}x`,
      token.replace("sl_", "xx_"),
      token.toUpperCase(),
      `sl_short_${token.slice(12)}`,
      `${token.slice(0, 11)}-${token.slice(12)}`,
      ` ${token}`,
    ]) {
      expect(parseAgentToken(bad)).toBeNull();
    }
  });

  test("a token matches only its own hash", () => {
    const a = generateAgentToken();
    const b = generateAgentToken();

    expect(agentTokenMatches(a.token, a.tokenHash)).toBe(true);
    expect(agentTokenMatches(a.token, b.tokenHash)).toBe(false);
    expect(agentTokenMatches(tamper(a.token), a.tokenHash)).toBe(false);
    expect(agentTokenMatches(a.token, "not-a-hash")).toBe(false);
  });
});

describe("agent token auth", () => {
  let me: User;
  let partner: User;
  let stranger: User;

  beforeEach(async () => {
    await resetDatabase();
    me = await createUser("me");
    partner = await createUser("partner");
    stranger = await createUser("stranger");
  });

  test("a valid person token yields the member as actor with the label as channel", async () => {
    const { access, token } = await createAccess(me, { label: "claude-code" });

    expect(await agentActor(bearer(token))).toEqual({
      memberUserIds: [me.id],
      actingUserId: me.id,
      accessId: access.id,
      channel: "claude-code",
      origin: "tool",
      clientId: null,
    });
  });

  test("a valid household token yields all members without an acting user", async () => {
    const { access, token } = await createAccess(me, {
      kind: "household",
      label: "family-bot",
      members: [me, partner],
    });

    const actor = await agentActor(bearer(token));

    expect([...actor.memberUserIds].sort()).toEqual([me.id, partner.id].sort());
    expect(actor).toMatchObject({
      actingUserId: null,
      accessId: access.id,
      channel: "family-bot",
      origin: "tool",
    });
  });

  test("a household left with a single member answers 401", async () => {
    // E.g. after the partner's account was deleted.
    const { token } = await createAccess(me, {
      kind: "household",
      members: [me],
    });

    expect(await statusOf(bearer(token))).toBe(401);
  });

  test("the caller decides the origin", async () => {
    const { token } = await createAccess(me);

    const actor = await agentActor(bearer(token), {
      allowAgentToken: true,
      origin: "agent",
    });

    expect(actor.origin).toBe("agent");
  });

  test("a revoked token answers 401", async () => {
    const { token } = await createAccess(me, { revoked: true });
    expect(await statusOf(bearer(token))).toBe(401);
  });

  test("an unknown, tampered or malformed token answers 401", async () => {
    const { token } = await createAccess(me);
    const unknown = generateAgentToken().token;

    expect(await statusOf(bearer(unknown))).toBe(401);
    expect(await statusOf(bearer(tamper(token)))).toBe(401);
    expect(await statusOf(bearer("sl_garbage"))).toBe(401);
    expect(await statusOf(request({ authorization: token }))).toBe(401);
    expect(await statusOf(request({ authorization: `Basic ${token}` }))).toBe(
      401,
    );
  });

  test("a request without session or token answers 401", async () => {
    expect(await statusOf(request())).toBe(401);
  });

  test("use sets lastUsedAt", async () => {
    const { access, token } = await createAccess(me);
    expect(access.lastUsedAt).toBeNull();
    const before = new Date();

    await agentActor(bearer(token));

    const reloaded = await prisma.agentAccess.findUniqueOrThrow({
      where: { id: access.id },
    });
    expect(reloaded.lastUsedAt).not.toBeNull();
    expect(reloaded.lastUsedAt!.getTime()).toBeGreaterThanOrEqual(
      before.getTime() - 1000,
    );
  });

  test("a failed token does not set lastUsedAt", async () => {
    const { access, token } = await createAccess(me, { revoked: true });
    await caught(() => agentActor(bearer(token)));
    await caught(() => agentActor(bearer(tamper(token))));

    const reloaded = await prisma.agentAccess.findUniqueOrThrow({
      where: { id: access.id },
    });
    expect(reloaded.lastUsedAt).toBeNull();
  });

  test("x-acting-user of a household member sets the acting person", async () => {
    const { token } = await createAccess(me, {
      kind: "household",
      members: [me, partner],
    });

    const actor = await agentActor(
      bearer(token, { "x-acting-user": partner.email.toUpperCase() }),
    );

    expect(actor.actingUserId).toBe(partner.id);
  });

  test("x-acting-user with a foreign e-mail answers 403", async () => {
    const { token } = await createAccess(me, {
      kind: "household",
      members: [me, partner],
    });

    expect(
      await statusOf(bearer(token, { "x-acting-user": stranger.email })),
    ).toBe(403);
    expect(
      await statusOf(
        bearer(token, { "x-acting-user": "nobody@example.test" }),
      ),
    ).toBe(403);
  });

  test("x-acting-user on a person access answers 400", async () => {
    const { token } = await createAccess(me);

    expect(await statusOf(bearer(token, { "x-acting-user": me.email }))).toBe(
      400,
    );
  });

  test("plain routes accept only the session, not a token", async () => {
    const { token } = await createAccess(me);

    expect(await statusOf(bearer(token), {})).toBe(401);
  });

  test("a session wins over a token", async () => {
    const { token } = await createAccess(partner, { members: [partner] });
    setSessionUser({ id: me.id, email: me.email, name: me.name });

    const actor = await agentActor(bearer(token));

    expect(actor).toMatchObject({
      memberUserIds: [me.id],
      channel: "web",
      origin: "web",
      accessId: null,
    });
  });
});
