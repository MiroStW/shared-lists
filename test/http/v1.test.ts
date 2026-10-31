import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import path from "path";
import type { User } from "@prisma/client";
import { prisma } from "db/prisma";
import { generateAgentToken } from "server/auth/agentTokens";
import { EVENT } from "server/lists/events";
import * as v1ItemRoute from "app/api/v1/items/[id]/route";
import * as v1ListItemsRoute from "app/api/v1/lists/[id]/items/route";
import * as v1ListsRoute from "app/api/v1/lists/route";
import { resetDatabase } from "../setup/db";
import * as fixtures from "../lists/fixtures";

const LEGACY_TOKEN = "legacy-test-token-0123456789";
const ROOT = path.join(import.meta.dir, "..", "..");
const ITEM_KEYS = [
  "completed",
  "createdDate",
  "description",
  "id",
  "listID",
  "name",
  "normalized",
  "order",
  "sectionID",
];

const savedEnv = {
  token: process.env.SHARED_LISTS_API_TOKEN,
  owner: process.env.SHARED_LISTS_API_TOKEN_OWNER_EMAIL,
};

const setEnv = (key: string, value: string | undefined) => {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
};

const request = (
  method: string,
  body?: unknown,
  authorization: string | null = `Bearer ${LEGACY_TOKEN}`,
) =>
  new Request("http://localhost/api/v1/x", {
    method,
    headers: {
      "content-type": "application/json",
      ...(authorization ? { authorization } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

const params = (id: string) => ({ params: Promise.resolve({ id }) });

const read = async (response: Response) => ({
  status: response.status,
  body: await response.json(),
});

const getLists = async (authorization?: string | null) =>
  read(await v1ListsRoute.GET(request("GET", undefined, authorization)));

const getItems = async (listId: string) =>
  read(await v1ListItemsRoute.GET(request("GET"), params(listId)));

const postItem = async (listId: string, body: unknown) =>
  read(await v1ListItemsRoute.POST(request("POST", body), params(listId)));

const patchItem = async (itemId: string, body: unknown) =>
  read(await v1ItemRoute.PATCH(request("PATCH", body), params(itemId)));

const expectNoCommands = async () =>
  expect(await fixtures.countCommandsAndEvents()).toEqual({
    commands: 0,
    events: 0,
  });

let owner: User;
let other: User;

describe("/api/v1", () => {
  beforeEach(async () => {
    await resetDatabase();
    owner = await fixtures.createUser("v1-owner");
    other = await fixtures.createUser("v1-other");
    setEnv("SHARED_LISTS_API_TOKEN", LEGACY_TOKEN);
    setEnv("SHARED_LISTS_API_TOKEN_OWNER_EMAIL", owner.email);
  });

  afterEach(() => {
    setEnv("SHARED_LISTS_API_TOKEN", savedEnv.token);
    setEnv("SHARED_LISTS_API_TOKEN_OWNER_EMAIL", savedEnv.owner);
  });

  describe("auth", () => {
    test("a missing or malformed Authorization header answers 401", async () => {
      for (const authorization of [null, LEGACY_TOKEN, `Basic ${LEGACY_TOKEN}`]) {
        expect(await getLists(authorization)).toEqual({
          status: 401,
          body: { error: "Missing or invalid authorization header" },
        });
      }
    });

    test("a wrong token answers 403 without echoing it", async () => {
      const { status, body } = await getLists("Bearer wrong-token");

      expect(status).toBe(403);
      expect(body.error).toMatch(/invalid api token/i);
      expect(JSON.stringify(body)).not.toContain("wrong-token");
    });

    test("an sl_ agent access token answers 403, even for an active access", async () => {
      const { token, tokenId, tokenHash } = generateAgentToken();
      await prisma.agentAccess.create({
        data: {
          label: "bot",
          kind: "person",
          tokenId,
          tokenHash,
          createdById: owner.id,
          members: { connect: [{ id: owner.id }] },
        },
      });

      const { status, body } = await getLists(`Bearer ${token}`);

      expect(status).toBe(403);
      expect(JSON.stringify(body)).not.toContain(token);
    });

    test("without SHARED_LISTS_API_TOKEN every token answers 403", async () => {
      setEnv("SHARED_LISTS_API_TOKEN", undefined);

      const { status, body } = await getLists();

      expect(status).toBe(403);
      expect(body.error).toContain("SHARED_LISTS_API_TOKEN");
      expect(JSON.stringify(body)).not.toContain(LEGACY_TOKEN);
    });

    test("the legacy token without owner variable answers 403 naming it", async () => {
      setEnv("SHARED_LISTS_API_TOKEN_OWNER_EMAIL", undefined);
      await fixtures.createList(owner.id);

      const { status, body } = await getLists();

      expect(status).toBe(403);
      expect(body.error).toContain("SHARED_LISTS_API_TOKEN_OWNER_EMAIL");
      expect(JSON.stringify(body)).not.toContain(LEGACY_TOKEN);
    });

    test("an owner e-mail without a user answers 403", async () => {
      setEnv("SHARED_LISTS_API_TOKEN_OWNER_EMAIL", "nobody@example.test");

      const { status, body } = await getLists();

      expect(status).toBe(403);
      expect(body.error).toContain("SHARED_LISTS_API_TOKEN_OWNER_EMAIL");
    });

    test("the owner e-mail matches case-insensitively", async () => {
      setEnv("SHARED_LISTS_API_TOKEN_OWNER_EMAIL", owner.email.toUpperCase());

      expect((await getLists()).status).toBe(200);
    });

    test("every route checks auth before touching data", async () => {
      const list = await fixtures.createList(owner.id);
      const item = await fixtures.createItem(list.id);
      setEnv("SHARED_LISTS_API_TOKEN_OWNER_EMAIL", undefined);

      expect((await getItems(list.id)).status).toBe(403);
      expect((await postItem(list.id, { name: "Milk" })).status).toBe(403);
      expect((await patchItem(item.id, { completed: true })).status).toBe(403);
      await expectNoCommands();
    });
  });

  describe("GET /api/v1/lists", () => {
    test("returns only the owner's visible, active lists as {id, name}", async () => {
      const own = await fixtures.createList(owner.id, { name: "Own" });
      const shared = await fixtures.createList(other.id, {
        name: "Shared",
        contributorIds: [owner.id],
      });
      await fixtures.createList(other.id, { name: "Foreign" });
      await fixtures.createList(owner.id, { name: "Old", isArchived: true });

      expect(await getLists()).toEqual({
        status: 200,
        body: {
          lists: [
            { id: own.id, name: "Own" },
            { id: shared.id, name: "Shared" },
          ],
        },
      });
    });
  });

  describe("GET /api/v1/lists/[id]/items", () => {
    test("returns all items of a visible list ordered by createdDate", async () => {
      const list = await fixtures.createList(other.id, {
        contributorIds: [owner.id],
      });
      const first = await fixtures.createItem(list.id, { name: "B", order: 2 });
      const second = await fixtures.createItem(list.id, {
        name: "A",
        order: 1,
        completed: true,
      });
      await prisma.item.update({
        where: { id: second.id },
        data: { createdDate: new Date(first.createdDate.getTime() + 1000) },
      });

      const { status, body } = await getItems(list.id);

      expect(status).toBe(200);
      expect(Object.keys(body)).toEqual(["items"]);
      expect(body.items.map((item: { id: string }) => item.id)).toEqual([
        first.id,
        second.id,
      ]);
      expect(Object.keys(body.items[0]).sort()).toEqual(ITEM_KEYS);
      expect(body.items[1]).toMatchObject({
        id: second.id,
        name: "A",
        completed: true,
        listID: list.id,
      });
    });

    test("a list the owner cannot see answers 404", async () => {
      const foreign = await fixtures.createList(other.id);
      await fixtures.createItem(foreign.id);

      expect(await getItems(foreign.id)).toEqual({
        status: 404,
        body: { error: "List not found" },
      });
      expect(await getItems("missing")).toEqual({
        status: 404,
        body: { error: "List not found" },
      });
    });
  });

  describe("POST /api/v1/lists/[id]/items", () => {
    test("creates an item (201, {item}) and logs it with the owner and channel v1", async () => {
      const list = await fixtures.createList(owner.id);

      const { status, body } = await postItem(list.id, { name: "Milk" });

      expect(status).toBe(201);
      expect(Object.keys(body)).toEqual(["item"]);
      expect(Object.keys(body.item).sort()).toEqual(ITEM_KEYS);
      expect(body.item).toMatchObject({
        name: "Milk",
        completed: false,
        listID: list.id,
      });
      expect(typeof body.item.id).toBe("string");

      const commands = await prisma.command.findMany({
        include: { events: true },
      });
      expect(commands).toHaveLength(1);
      expect(commands[0]).toMatchObject({
        actorUserId: owner.id,
        accessId: null,
        channel: "v1",
        origin: "v1",
        kind: "change",
      });
      expect(commands[0].events.map((event) => event.type)).toEqual([
        EVENT.itemCreated,
      ]);
      expect(commands[0].events[0].itemId).toBe(body.item.id);
    });

    test("a missing, non-string or empty name answers 400 with the old text", async () => {
      const list = await fixtures.createList(owner.id);

      for (const body of [{}, { name: 42 }, { name: "" }, null]) {
        expect(await postItem(list.id, body)).toEqual({
          status: 400,
          body: { error: "Missing or invalid 'name' field" },
        });
      }
      await expectNoCommands();
    });

    test("a list the owner cannot see answers 404 and writes nothing", async () => {
      const foreign = await fixtures.createList(other.id);

      expect(await postItem(foreign.id, { name: "Milk" })).toEqual({
        status: 404,
        body: { error: "List not found" },
      });
      expect(await prisma.item.count()).toBe(0);
      await expectNoCommands();
    });
  });

  describe("PATCH /api/v1/items/[id]", () => {
    test("completes and renames a visible item (200, {item}) on channel v1", async () => {
      const list = await fixtures.createList(owner.id);
      const item = await fixtures.createItem(list.id, { name: "Milk" });

      const { status, body } = await patchItem(item.id, {
        completed: true,
        name: "Oat milk",
      });

      expect(status).toBe(200);
      expect(Object.keys(body)).toEqual(["item"]);
      expect(Object.keys(body.item).sort()).toEqual(ITEM_KEYS);
      expect(body.item).toMatchObject({
        id: item.id,
        name: "Oat milk",
        completed: true,
        listID: list.id,
      });
      const command = await prisma.command.findFirstOrThrow({
        include: { events: true },
      });
      expect(command).toMatchObject({
        actorUserId: owner.id,
        channel: "v1",
        origin: "v1",
      });
      expect(command.events.map((event) => event.type).sort()).toEqual(
        [EVENT.itemCompleted, EVENT.itemRenamed].sort(),
      );
    });

    test("an item of a list the owner cannot see answers 404", async () => {
      const foreign = await fixtures.createList(other.id);
      const item = await fixtures.createItem(foreign.id, { name: "Secret" });

      expect(await patchItem(item.id, { completed: true })).toEqual({
        status: 404,
        body: { error: "Item not found" },
      });
      expect(await patchItem("missing", { completed: true })).toEqual({
        status: 404,
        body: { error: "Item not found" },
      });
      const unchanged = await prisma.item.findUniqueOrThrow({
        where: { id: item.id },
      });
      expect(unchanged.completed).toBe(false);
      await expectNoCommands();
    });

    test("no valid update fields still answers 400", async () => {
      const list = await fixtures.createList(owner.id);
      const item = await fixtures.createItem(list.id);

      for (const body of [{}, { completed: "yes" }, { name: 1 }, { order: 3 }]) {
        expect(await patchItem(item.id, body)).toEqual({
          status: 400,
          body: { error: "No valid update fields provided" },
        });
      }
      await expectNoCommands();
    });
  });

  describe("machine routes", () => {
    test("the /api/machine routes and their auth helper are gone", async () => {
      expect(existsSync(path.join(ROOT, "src/app/api/machine"))).toBe(false);
      expect(existsSync(path.join(ROOT, "src/server/machineAuth.ts"))).toBe(
        false,
      );
      const resolvePath = "app/api/machine/lists/[id]/resolve/route";
      await expect(import(resolvePath)).rejects.toThrow();
    });

    test("no source file reads SHARED_LISTS_MACHINE_TOKEN", () => {
      const offenders: string[] = [];
      const walk = (dir: string) => {
        for (const entry of readdirSync(dir)) {
          const full = path.join(dir, entry);
          if (statSync(full).isDirectory()) walk(full);
          else if (
            readFileSync(full, "utf8").includes("SHARED_LISTS_MACHINE_TOKEN")
          ) {
            offenders.push(full);
          }
        }
      };
      walk(path.join(ROOT, "src"));
      expect(offenders).toEqual([]);
    });
  });
});
