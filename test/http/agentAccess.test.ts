import { beforeEach, describe, expect, test } from "bun:test";
import type { User } from "@prisma/client";
import { prisma } from "db/prisma";
import { hashAgentToken } from "server/auth/agentTokens";
import { actorFromRequest } from "server/http/actorFromRequest";
import * as accessRoute from "app/api/agent-access/[id]/route";
import * as accessesRoute from "app/api/agent-access/route";
import { resetDatabase } from "../setup/db";
import { setSessionUser } from "../setup/session";
import * as fixtures from "../lists/fixtures";

const ACCESS_KEYS = [
  "createdAt",
  "id",
  "kind",
  "label",
  "lastUsedAt",
  "members",
  "revokedAt",
];
const MEMBER_KEYS = ["email", "id", "name"];

const signIn = (user: User) =>
  setSessionUser({ id: user.id, email: user.email, name: user.name });

const request = (
  method: string,
  body?: unknown,
  headers: Record<string, string> = {},
) =>
  new Request("http://localhost/api/agent-access", {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

const params = (id: string) => ({ params: Promise.resolve({ id }) });

const read = async (response: Response) => ({
  status: response.status,
  body: await response.json(),
});

const sortedKeys = (value: object) => Object.keys(value).sort();

const post = async (body: unknown) =>
  read(await accessesRoute.POST(request("POST", body)));

const get = async () => read(await accessesRoute.GET());

const revoke = async (id: string) =>
  read(await accessRoute.DELETE(request("DELETE"), params(id)));

const expectRejected = async (body: unknown, error?: RegExp) => {
  const response = await post(body);
  expect(response.status).toBe(400);
  if (error) expect(response.body.error).toMatch(error);
  expect(await prisma.agentAccess.count()).toBe(0);
};

let me: User;
let partner: User;
let coContributor: User;
let stranger: User;

describe("/api/agent-access", () => {
  beforeEach(async () => {
    await resetDatabase();
    me = await fixtures.createUser("me");
    partner = await fixtures.createUser("partner");
    coContributor = await fixtures.createUser("co-contributor");
    stranger = await fixtures.createUser("stranger");
    // me owns a list partner contributes to; me and coContributor both
    // contribute to a list owned by partner. stranger shares nothing with me.
    await fixtures.createList(me.id, { contributorIds: [partner.id] });
    await fixtures.createList(partner.id, {
      contributorIds: [me.id, coContributor.id],
    });
    await fixtures.createList(stranger.id, { contributorIds: [partner.id] });
  });

  test("every route answers 401 without a session, also with an agent token", async () => {
    signIn(me);
    const { body } = await post({ label: "bot", kind: "person" });
    setSessionUser(null);
    const auth = { authorization: `Bearer ${body.token}` };

    const responses = [
      await accessesRoute.GET(),
      await accessesRoute.POST(
        request("POST", { label: "other", kind: "person" }, auth),
      ),
      await accessRoute.DELETE(
        request("DELETE", undefined, auth),
        params(body.access.id),
      ),
    ];
    for (const response of responses) {
      expect(await read(response)).toEqual({
        status: 401,
        body: { error: "Unauthorized" },
      });
    }
    expect(await prisma.agentAccess.count()).toBe(1);
  });

  describe("POST", () => {
    test("creates a person access for the creator and returns the token once", async () => {
      signIn(me);

      const { status, body } = await post({
        label: "claude-code",
        kind: "person",
      });

      expect(status).toBe(201);
      expect(sortedKeys(body)).toEqual(["access", "token"]);
      expect(body.token).toMatch(/^sl_[a-z0-9]{8}_[A-Za-z0-9_-]{43}$/);
      expect(sortedKeys(body.access)).toEqual(ACCESS_KEYS);
      expect(body.access).toMatchObject({
        label: "claude-code",
        kind: "person",
        lastUsedAt: null,
        revokedAt: null,
        members: [{ id: me.id, name: me.name, email: me.email }],
      });

      const stored = await prisma.agentAccess.findUniqueOrThrow({
        where: { id: body.access.id },
      });
      expect(stored.createdById).toBe(me.id);
      expect(stored.tokenId).toBe(body.token.slice(3, 11));
      expect(stored.tokenHash).toBe(hashAgentToken(body.token));
      expect(stored.tokenHash).not.toContain(body.token.slice(12));
    });

    test("the returned token authenticates as the access", async () => {
      signIn(me);
      const { body } = await post({ label: "claude-code", kind: "person" });
      setSessionUser(null);

      const actor = await actorFromRequest(
        request("GET", undefined, { authorization: `Bearer ${body.token}` }),
        { allowAgentToken: true },
      );

      expect(actor).toMatchObject({
        memberUserIds: [me.id],
        accessId: body.access.id,
        channel: "claude-code",
      });
    });

    test("a person access may name the creator explicitly", async () => {
      signIn(me);

      const { status, body } = await post({
        label: "bot",
        kind: "person",
        memberEmails: [me.email.toUpperCase()],
      });

      expect(status).toBe(201);
      expect(body.access.members).toEqual([
        { id: me.id, name: me.name, email: me.email },
      ]);
    });

    test("a person access for another user answers 400", async () => {
      signIn(me);

      await expectRejected({
        label: "bot",
        kind: "person",
        memberEmails: [partner.email],
      });
      await expectRejected({
        label: "bot",
        kind: "person",
        memberEmails: [me.email, partner.email],
      });
    });

    test("creates a household access with the creator and co-sharers", async () => {
      signIn(me);

      const { status, body } = await post({
        label: "family-bot",
        kind: "household",
        memberEmails: [me.email, partner.email, ` ${coContributor.email} `],
      });

      expect(status).toBe(201);
      expect(body.access.kind).toBe("household");
      expect(
        body.access.members.map((member: { id: string }) => member.id).sort(),
      ).toEqual([me.id, partner.id, coContributor.id].sort());
      for (const member of body.access.members) {
        expect(sortedKeys(member)).toEqual(MEMBER_KEYS);
      }
    });

    test("a household access without the creator answers 400", async () => {
      signIn(me);

      await expectRejected({
        label: "family-bot",
        kind: "household",
        memberEmails: [partner.email, coContributor.email],
      });
    });

    test("a household access with only one member answers 400", async () => {
      signIn(me);

      await expectRejected({
        label: "family-bot",
        kind: "household",
        memberEmails: [me.email],
      });
      await expectRejected({
        label: "family-bot",
        kind: "household",
        memberEmails: [me.email, me.email.toUpperCase()],
      });
      await expectRejected({ label: "family-bot", kind: "household" });
    });

    test("a household member who shares no list with the creator answers 400", async () => {
      signIn(me);

      await expectRejected(
        {
          label: "family-bot",
          kind: "household",
          memberEmails: [me.email, partner.email, stranger.email],
        },
        /share/i,
      );
      // An unknown e-mail gets the same answer, so existence is not revealed.
      await expectRejected(
        {
          label: "family-bot",
          kind: "household",
          memberEmails: [me.email, "nobody@example.test"],
        },
        /share/i,
      );
    });

    test("labels are trimmed, lowercased and limited to a safe charset", async () => {
      signIn(me);

      const { status, body } = await post({
        label: "  Claude-Code-2 ",
        kind: "person",
      });
      expect(status).toBe(201);
      expect(body.access.label).toBe("claude-code-2");

      for (const label of [
        undefined,
        "",
        "   ",
        "has space",
        "under_score",
        "dots.dots",
        "ümlaut",
        "-leading-dash",
        "a".repeat(41),
        42,
      ]) {
        const response = await post({ label, kind: "person" });
        expect(response.status).toBe(400);
      }
      expect(await prisma.agentAccess.count()).toBe(1);
    });

    test("reserved labels answer 400", async () => {
      signIn(me);

      await expectRejected({ label: "web", kind: "person" }, /reserved/i);
      await expectRejected({ label: "V1", kind: "person" }, /reserved/i);
    });

    test("an unknown kind or a malformed body answers 400", async () => {
      signIn(me);

      await expectRejected({ label: "bot", kind: "admin" });
      await expectRejected({ label: "bot" });
      await expectRejected({
        label: "bot",
        kind: "household",
        memberEmails: "x",
      });
      await expectRejected({
        label: "bot",
        kind: "household",
        memberEmails: [me.email, 7],
      });
      await expectRejected(["bot"]);

      const response = await accessesRoute.POST(
        new Request("http://localhost/api/agent-access", {
          method: "POST",
          body: "{not json",
        }),
      );
      expect(response.status).toBe(400);
    });
  });

  describe("GET", () => {
    test("lists own accesses without hash or token, newest first", async () => {
      signIn(me);
      const first = await post({ label: "first", kind: "person" });
      const second = await post({
        label: "second",
        kind: "household",
        memberEmails: [me.email, partner.email],
      });
      signIn(partner);
      await post({ label: "partner-bot", kind: "person" });
      signIn(me);

      const { status, body } = await get();

      expect(status).toBe(200);
      expect(sortedKeys(body)).toEqual(["accesses", "candidates"]);
      expect(body.accesses.map((a: { id: string }) => a.id)).toEqual([
        second.body.access.id,
        first.body.access.id,
      ]);
      for (const access of body.accesses) {
        expect(sortedKeys(access)).toEqual(ACCESS_KEYS);
      }
      const raw = JSON.stringify(body);
      const stored = await prisma.agentAccess.findMany();
      for (const { tokenHash, tokenId } of stored) {
        expect(raw).not.toContain(tokenHash);
        expect(raw).not.toContain(tokenId);
      }
      expect(raw).not.toContain(first.body.token);
      expect(raw).not.toContain("sl_");
    });

    test("household candidates are exactly the people the user shares lists with", async () => {
      signIn(me);

      const { body } = await get();

      expect(
        body.candidates.map((user: { id: string }) => user.id).sort(),
      ).toEqual([partner.id, coContributor.id].sort());
      for (const candidate of body.candidates) {
        expect(sortedKeys(candidate)).toEqual(MEMBER_KEYS);
      }
    });

    test("a user without shared lists has no candidates", async () => {
      signIn(stranger);
      await prisma.list.deleteMany({ where: { ownerID: stranger.id } });

      const { body } = await get();

      expect(body).toEqual({ accesses: [], candidates: [] });
    });
  });

  describe("DELETE /api/agent-access/[id]", () => {
    test("the creator revokes an access, and its token stops working", async () => {
      signIn(me);
      const { body: created } = await post({ label: "bot", kind: "person" });

      const { status, body } = await revoke(created.access.id);

      expect(status).toBe(200);
      expect(body.access.id).toBe(created.access.id);
      expect(body.access.revokedAt).not.toBeNull();
      expect(sortedKeys(body.access)).toEqual(ACCESS_KEYS);

      setSessionUser(null);
      const error = await fixtures.caught(() =>
        actorFromRequest(
          request("GET", undefined, {
            authorization: `Bearer ${created.token}`,
          }),
          { allowAgentToken: true },
        ),
      );
      expect(error).not.toBeNull();
    });

    test("revoking twice keeps the first revocation time", async () => {
      signIn(me);
      const { body: created } = await post({ label: "bot", kind: "person" });
      const first = await revoke(created.access.id);

      const second = await revoke(created.access.id);

      expect(second.status).toBe(200);
      expect(second.body.access.revokedAt).toBe(first.body.access.revokedAt);
    });

    test("another user cannot revoke the access (404), not even a member", async () => {
      signIn(me);
      const { body: created } = await post({
        label: "family-bot",
        kind: "household",
        memberEmails: [me.email, partner.email],
      });

      for (const user of [partner, stranger]) {
        signIn(user);
        expect(await revoke(created.access.id)).toEqual({
          status: 404,
          body: { error: "Not Found" },
        });
      }
      expect(await revoke("missing")).toEqual({
        status: 404,
        body: { error: "Not Found" },
      });
      const stored = await prisma.agentAccess.findUniqueOrThrow({
        where: { id: created.access.id },
      });
      expect(stored.revokedAt).toBeNull();
    });
  });
});
