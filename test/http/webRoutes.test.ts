import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { User } from "@prisma/client";
import { getFirstListId } from "db/getFirstListId";
import { prisma } from "db/prisma";
import { EVENT } from "server/lists/events";
import { liveBus, type ListChange } from "server/live/bus";
import * as itemRoute from "app/api/items/[id]/route";
import * as listItemsRoute from "app/api/lists/[id]/items/route";
import * as listReorderRoute from "app/api/lists/[id]/reorder/route";
import * as listRoute from "app/api/lists/[id]/route";
import * as listSectionsRoute from "app/api/lists/[id]/sections/route";
import * as listsRoute from "app/api/lists/route";
import * as sectionRoute from "app/api/sections/[id]/route";
import * as sectionsRoute from "app/api/sections/route";
import { resetDatabase } from "../setup/db";
import { setSessionUser } from "../setup/session";
import * as fixtures from "../lists/fixtures";

// Route handlers are called directly, the way Next.js calls them.

const LIST_KEYS = ["createdDate", "id", "isArchived", "name", "ownerID"];
const SECTION_KEYS = ["createdDate", "id", "listId", "name"];
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
const PUBLIC_USER_KEYS = ["email", "id", "image", "name"];

const signIn = (user: User) =>
  setSessionUser({ id: user.id, email: user.email, name: user.name });

const request = (
  method: string,
  path: string,
  body?: unknown,
  headers: Record<string, string> = {},
) =>
  new Request(`http://localhost${path}`, {
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

// The single command the request wrote, with its events in order.
const onlyCommand = async () => {
  const commands = await prisma.command.findMany({
    include: { events: { orderBy: { seq: "asc" } } },
  });
  expect(commands).toHaveLength(1);
  return commands[0];
};

const expectWebCommand = async (user: User, eventTypes: string[]) => {
  const command = await onlyCommand();
  expect(command).toMatchObject({
    actorUserId: user.id,
    accessId: null,
    channel: "web",
    origin: "web",
    kind: "change",
  });
  expect(command.events.map((event) => event.type)).toEqual(eventTypes);
  return command;
};

const expectNoCommands = async () =>
  expect(await fixtures.countCommandsAndEvents()).toEqual({
    commands: 0,
    events: 0,
  });

let published: ListChange[] = [];
let unsubscribe: () => void = () => {};

let owner: User;
let contributor: User;
let stranger: User;

describe("web routes", () => {
  beforeEach(async () => {
    await resetDatabase();
    published = [];
    unsubscribe = liveBus.subscribe((change) => published.push(change));
    owner = await fixtures.createUser("owner");
    contributor = await fixtures.createUser("contributor");
    stranger = await fixtures.createUser("stranger");
  });

  afterEach(() => unsubscribe());

  test("every route answers 401 without a session", async () => {
    const id = "missing";
    const responses = await Promise.all([
      listsRoute.GET(request("GET", "/api/lists")),
      listsRoute.POST(request("POST", "/api/lists", { name: "A" })),
      listRoute.PATCH(request("PATCH", "/x", { name: "A" }), params(id)),
      listRoute.DELETE(request("DELETE", "/x"), params(id)),
      listItemsRoute.GET(request("GET", "/x"), params(id)),
      listItemsRoute.POST(request("POST", "/x", { name: "A" }), params(id)),
      listSectionsRoute.GET(request("GET", "/x"), params(id)),
      listReorderRoute.POST(request("POST", "/x", { items: [] }), params(id)),
      itemRoute.PATCH(request("PATCH", "/x", { completed: true }), params(id)),
      itemRoute.DELETE(request("DELETE", "/x"), params(id)),
      sectionsRoute.POST(
        request("POST", "/api/sections", { name: "A", listId: id }),
      ),
      sectionRoute.PATCH(request("PATCH", "/x", { name: "A" }), params(id)),
      sectionRoute.DELETE(request("DELETE", "/x"), params(id)),
    ]);
    for (const response of responses) {
      expect(await read(response)).toEqual({
        status: 401,
        body: { error: "Unauthorized" },
      });
    }
    await expectNoCommands();
  });

  describe("/api/lists", () => {
    test("GET returns owned and contributed active lists without password hashes", async () => {
      const own = await fixtures.createList(owner.id, { name: "Own" });
      const shared = await fixtures.createList(stranger.id, {
        name: "Shared",
        contributorIds: [owner.id],
      });
      await fixtures.createList(owner.id, { name: "Old", isArchived: true });
      await fixtures.createList(stranger.id, { name: "Foreign" });
      signIn(owner);

      const { status, body } = await read(
        await listsRoute.GET(request("GET", "/api/lists")),
      );

      expect(status).toBe(200);
      expect(body.map((list: { id: string }) => list.id)).toEqual([
        own.id,
        shared.id,
      ]);
      expect(sortedKeys(body[1])).toEqual(
        [...LIST_KEYS, "contributors", "owner"].sort(),
      );
      expect(body[1].owner).toEqual({
        id: stranger.id,
        name: stranger.name,
        email: stranger.email,
        image: null,
      });
      expect(sortedKeys(body[1].contributors[0])).toEqual(PUBLIC_USER_KEYS);
    });

    test("POST creates a list owned by the user and logs list.created", async () => {
      signIn(owner);

      const { status, body } = await read(
        await listsRoute.POST(request("POST", "/api/lists", { name: "New" })),
      );

      expect(status).toBe(200);
      expect(sortedKeys(body)).toEqual(LIST_KEYS);
      expect(body).toMatchObject({
        name: "New",
        ownerID: owner.id,
        isArchived: false,
      });
      const command = await expectWebCommand(owner, [EVENT.listCreated]);
      expect(command.events[0].listId).toBe(body.id);
    });

    test("POST without a name answers 400", async () => {
      signIn(owner);

      expect(
        await read(await listsRoute.POST(request("POST", "/api/lists", {}))),
      ).toEqual({ status: 400, body: { error: "Name is required" } });
      await expectNoCommands();
    });
  });

  describe("/api/lists/[id]", () => {
    test("PATCH by the owner renames and archives the list", async () => {
      const list = await fixtures.createList(owner.id, { name: "Old" });
      signIn(owner);

      const { status, body } = await read(
        await listRoute.PATCH(
          request("PATCH", `/api/lists/${list.id}`, {
            name: "New",
            isArchived: true,
          }),
          params(list.id),
        ),
      );

      expect(status).toBe(200);
      expect(sortedKeys(body)).toEqual(LIST_KEYS);
      expect(body).toMatchObject({
        id: list.id,
        name: "New",
        isArchived: true,
      });
      await expectWebCommand(owner, [EVENT.listRenamed, EVENT.listArchived]);
    });

    test("PATCH by a contributor or for a missing list answers 403", async () => {
      const list = await fixtures.createList(owner.id, {
        contributorIds: [contributor.id],
      });
      signIn(contributor);

      for (const id of [list.id, "missing"]) {
        expect(
          await read(
            await listRoute.PATCH(
              request("PATCH", `/api/lists/${id}`, { name: "New" }),
              params(id),
            ),
          ),
        ).toEqual({ status: 403, body: { error: "Forbidden" } });
      }
      await expectNoCommands();
    });

    test("DELETE by the owner removes the list and logs its items", async () => {
      const list = await fixtures.createList(owner.id);
      const item = await fixtures.createItem(list.id);
      signIn(owner);

      expect(
        await read(
          await listRoute.DELETE(
            request("DELETE", `/api/lists/${list.id}`),
            params(list.id),
          ),
        ),
      ).toEqual({ status: 200, body: { success: true } });

      expect(await prisma.list.count()).toBe(0);
      const command = await expectWebCommand(owner, [
        EVENT.itemDeleted,
        EVENT.listDeleted,
      ]);
      expect(command.events[0].itemId).toBe(item.id);
    });

    test("DELETE by a contributor or for a missing list answers 403", async () => {
      const list = await fixtures.createList(owner.id, {
        contributorIds: [contributor.id],
      });
      signIn(contributor);

      for (const id of [list.id, "missing"]) {
        expect(
          await read(
            await listRoute.DELETE(
              request("DELETE", `/api/lists/${id}`),
              params(id),
            ),
          ),
        ).toEqual({ status: 403, body: { error: "Forbidden" } });
      }
      expect(await prisma.list.count()).toBe(1);
      await expectNoCommands();
    });
  });

  describe("/api/lists/[id]/items and /sections", () => {
    test("GET returns items by order and sections by creation for a contributor", async () => {
      const list = await fixtures.createList(owner.id, {
        contributorIds: [contributor.id],
      });
      const section = await fixtures.createSection(list.id);
      const second = await fixtures.createItem(list.id, { order: 2 });
      const first = await fixtures.createItem(list.id, {
        order: 1,
        sectionID: section.id,
      });
      signIn(contributor);

      const items = await read(
        await listItemsRoute.GET(request("GET", "/x"), params(list.id)),
      );
      const sections = await read(
        await listSectionsRoute.GET(request("GET", "/x"), params(list.id)),
      );

      expect(items.status).toBe(200);
      expect(items.body.map((item: { id: string }) => item.id)).toEqual([
        first.id,
        second.id,
      ]);
      expect(sortedKeys(items.body[0])).toEqual(ITEM_KEYS);
      expect(sections.status).toBe(200);
      expect(sections.body).toHaveLength(1);
      expect(sortedKeys(sections.body[0])).toEqual(SECTION_KEYS);
    });

    test("GET for a foreign or missing list answers 403", async () => {
      const list = await fixtures.createList(owner.id);
      signIn(stranger);

      for (const id of [list.id, "missing"]) {
        for (const handler of [listItemsRoute.GET, listSectionsRoute.GET]) {
          expect(
            await read(await handler(request("GET", "/x"), params(id))),
          ).toEqual({ status: 403, body: { error: "Forbidden" } });
        }
      }
    });

    test("POST creates an item in a section and logs item.created", async () => {
      const list = await fixtures.createList(owner.id, {
        contributorIds: [contributor.id],
      });
      const section = await fixtures.createSection(list.id);
      signIn(contributor);

      const { status, body } = await read(
        await listItemsRoute.POST(
          request("POST", `/api/lists/${list.id}/items`, {
            name: "Milk",
            completed: false,
            sectionID: section.id,
            order: 3,
          }),
          params(list.id),
        ),
      );

      expect(status).toBe(200);
      expect(sortedKeys(body)).toEqual(ITEM_KEYS);
      expect(body).toMatchObject({
        name: "Milk",
        completed: false,
        listID: list.id,
        sectionID: section.id,
        order: 3,
        description: "",
      });
      const command = await expectWebCommand(contributor, [EVENT.itemCreated]);
      expect(command.events[0].itemId).toBe(body.id);
    });

    test("POST without a name answers 400, for a foreign list 403", async () => {
      const list = await fixtures.createList(owner.id);
      signIn(stranger);

      expect(
        await read(
          await listItemsRoute.POST(
            request("POST", "/x", { completed: false }),
            params(list.id),
          ),
        ),
      ).toEqual({ status: 400, body: { error: "Name is required" } });
      expect(
        await read(
          await listItemsRoute.POST(
            request("POST", "/x", { name: "Milk" }),
            params(list.id),
          ),
        ),
      ).toEqual({ status: 403, body: { error: "Forbidden" } });
      expect(await prisma.item.count()).toBe(0);
      await expectNoCommands();
    });
  });

  describe("/api/lists/[id]/reorder", () => {
    test("a section move logs item.section_set", async () => {
      const list = await fixtures.createList(owner.id);
      const section = await fixtures.createSection(list.id);
      const a = await fixtures.createItem(list.id, { name: "A", order: 0 });
      const b = await fixtures.createItem(list.id, { name: "B", order: 1 });
      signIn(owner);

      expect(
        await read(
          await listReorderRoute.POST(
            request("POST", `/api/lists/${list.id}/reorder`, {
              items: [
                { id: b.id, order: 0, sectionID: section.id },
                { id: a.id, order: 1, sectionID: null },
              ],
            }),
            params(list.id),
          ),
        ),
      ).toEqual({ status: 200, body: { success: true } });

      const moved = await prisma.item.findUniqueOrThrow({
        where: { id: b.id },
      });
      expect(moved).toMatchObject({ order: 0, sectionID: section.id });
      const command = await expectWebCommand(owner, [EVENT.itemSectionSet]);
      expect(command.events[0]).toMatchObject({
        itemId: b.id,
        before: { sectionID: null },
        after: { sectionID: section.id },
      });
    });

    test("a pure reorder logs no event", async () => {
      const list = await fixtures.createList(owner.id);
      const a = await fixtures.createItem(list.id, { name: "A", order: 0 });
      const b = await fixtures.createItem(list.id, { name: "B", order: 1 });
      signIn(owner);

      const response = await listReorderRoute.POST(
        request("POST", "/x", {
          items: [
            { id: b.id, order: 0, sectionID: null },
            { id: a.id, order: 1, sectionID: null },
          ],
        }),
        params(list.id),
      );

      expect(await read(response)).toEqual({
        status: 200,
        body: { success: true },
      });
      const items = await prisma.item.findMany({ orderBy: { order: "asc" } });
      expect(items.map((item) => item.id)).toEqual([b.id, a.id]);
      await expectNoCommands();
    });

    test("a missing items array answers 400, a foreign list 403", async () => {
      const list = await fixtures.createList(owner.id);
      const item = await fixtures.createItem(list.id);
      signIn(stranger);

      expect(
        await read(
          await listReorderRoute.POST(
            request("POST", "/x", {}),
            params(list.id),
          ),
        ),
      ).toEqual({ status: 400, body: { error: "Items array is required" } });
      expect(
        await read(
          await listReorderRoute.POST(
            request("POST", "/x", { items: [{ id: item.id, order: 5 }] }),
            params(list.id),
          ),
        ),
      ).toEqual({ status: 403, body: { error: "Forbidden" } });
      expect(
        (await prisma.item.findUniqueOrThrow({ where: { id: item.id } })).order,
      ).toBe(0);
    });

    test("an item of another list answers 403 and stays where it is", async () => {
      const list = await fixtures.createList(owner.id);
      const foreignList = await fixtures.createList(stranger.id);
      const foreignItem = await fixtures.createItem(foreignList.id);
      signIn(owner);

      expect(
        await read(
          await listReorderRoute.POST(
            request("POST", "/x", {
              items: [{ id: foreignItem.id, order: 0, sectionID: null }],
            }),
            params(list.id),
          ),
        ),
      ).toEqual({ status: 403, body: { error: "Forbidden" } });
      expect(
        (await prisma.item.findUniqueOrThrow({ where: { id: foreignItem.id } }))
          .listID,
      ).toBe(foreignList.id);
      await expectNoCommands();
    });
  });

  describe("/api/items/[id]", () => {
    test("PATCH completed returns the updated item and logs a web event", async () => {
      const list = await fixtures.createList(owner.id, {
        contributorIds: [contributor.id],
      });
      const item = await fixtures.createItem(list.id, { name: "Milk" });
      signIn(contributor);

      const { status, body } = await read(
        await itemRoute.PATCH(
          request("PATCH", `/api/items/${item.id}`, { completed: true }),
          params(item.id),
        ),
      );

      expect(status).toBe(200);
      expect(sortedKeys(body)).toEqual(ITEM_KEYS);
      expect(body).toMatchObject({
        id: item.id,
        name: "Milk",
        completed: true,
        listID: list.id,
      });
      const command = await expectWebCommand(contributor, [
        EVENT.itemCompleted,
      ]);
      expect(command.events[0]).toMatchObject({
        itemId: item.id,
        before: { completed: false },
        after: { completed: true },
      });
    });

    test("PATCH reports the x-sl-client header to the live bus", async () => {
      const list = await fixtures.createList(owner.id, {
        contributorIds: [contributor.id],
      });
      const item = await fixtures.createItem(list.id);
      signIn(owner);

      await itemRoute.PATCH(
        request(
          "PATCH",
          `/api/items/${item.id}`,
          { name: "Renamed" },
          { "x-sl-client": "tab-1" },
        ),
        params(item.id),
      );

      expect(published).toHaveLength(1);
      expect(published[0]).toMatchObject({
        listIds: [list.id],
        clientId: "tab-1",
      });
      expect([...published[0].recipientUserIds].sort()).toEqual(
        [owner.id, contributor.id].sort(),
      );
    });

    test("PATCH on an item of a foreign list answers 403, a missing item 404", async () => {
      const list = await fixtures.createList(owner.id);
      const item = await fixtures.createItem(list.id);
      signIn(stranger);

      expect(
        await read(
          await itemRoute.PATCH(
            request("PATCH", "/x", { completed: true }),
            params(item.id),
          ),
        ),
      ).toEqual({ status: 403, body: { error: "Forbidden" } });
      expect(
        await read(
          await itemRoute.PATCH(
            request("PATCH", "/x", { completed: true }),
            params("missing"),
          ),
        ),
      ).toEqual({ status: 404, body: { error: "Not Found" } });
      expect(
        (await prisma.item.findUniqueOrThrow({ where: { id: item.id } }))
          .completed,
      ).toBe(false);
      await expectNoCommands();
    });

    test("PATCH with listID answers 400 and moves nothing", async () => {
      const list = await fixtures.createList(owner.id);
      const other = await fixtures.createList(owner.id);
      const item = await fixtures.createItem(list.id);
      signIn(owner);

      expect(
        await read(
          await itemRoute.PATCH(
            request("PATCH", "/x", { listID: other.id }),
            params(item.id),
          ),
        ),
      ).toEqual({ status: 400, body: { error: "listID cannot be changed" } });
      expect(
        (await prisma.item.findUniqueOrThrow({ where: { id: item.id } }))
          .listID,
      ).toBe(list.id);
      await expectNoCommands();
    });

    test("DELETE removes the item and logs item.deleted", async () => {
      const list = await fixtures.createList(owner.id);
      const item = await fixtures.createItem(list.id);
      signIn(owner);

      expect(
        await read(
          await itemRoute.DELETE(request("DELETE", "/x"), params(item.id)),
        ),
      ).toEqual({ status: 200, body: { success: true } });

      expect(await prisma.item.count()).toBe(0);
      await expectWebCommand(owner, [EVENT.itemDeleted]);
    });

    test("DELETE on a foreign item answers 403, a missing item 404", async () => {
      const list = await fixtures.createList(owner.id);
      const item = await fixtures.createItem(list.id);
      signIn(stranger);

      expect(
        await read(
          await itemRoute.DELETE(request("DELETE", "/x"), params(item.id)),
        ),
      ).toEqual({ status: 403, body: { error: "Forbidden" } });
      expect(
        await read(
          await itemRoute.DELETE(request("DELETE", "/x"), params("missing")),
        ),
      ).toEqual({ status: 404, body: { error: "Not Found" } });
      expect(await prisma.item.count()).toBe(1);
    });
  });

  describe("/api/sections", () => {
    test("POST creates a section and logs section.created", async () => {
      const list = await fixtures.createList(owner.id, {
        contributorIds: [contributor.id],
      });
      signIn(contributor);

      const { status, body } = await read(
        await sectionsRoute.POST(
          request("POST", "/api/sections", { name: "Fruit", listId: list.id }),
        ),
      );

      expect(status).toBe(200);
      expect(sortedKeys(body)).toEqual(SECTION_KEYS);
      expect(body).toMatchObject({ name: "Fruit", listId: list.id });
      await expectWebCommand(contributor, [EVENT.sectionCreated]);
    });

    test("POST without listId answers 400, for a foreign list 403", async () => {
      const list = await fixtures.createList(owner.id);
      signIn(stranger);

      expect(
        await read(
          await sectionsRoute.POST(
            request("POST", "/api/sections", { name: "Fruit" }),
          ),
        ),
      ).toEqual({
        status: 400,
        body: { error: "Name and ListId are required" },
      });
      expect(
        await read(
          await sectionsRoute.POST(
            request("POST", "/api/sections", {
              name: "Fruit",
              listId: list.id,
            }),
          ),
        ),
      ).toEqual({ status: 403, body: { error: "Forbidden" } });
      await expectNoCommands();
    });

    test("PATCH renames the section and logs section.renamed", async () => {
      const list = await fixtures.createList(owner.id, {
        contributorIds: [contributor.id],
      });
      const section = await fixtures.createSection(list.id, "Old");
      signIn(contributor);

      const { status, body } = await read(
        await sectionRoute.PATCH(
          request("PATCH", `/api/sections/${section.id}`, { name: "New" }),
          params(section.id),
        ),
      );

      expect(status).toBe(200);
      expect(sortedKeys(body)).toEqual(SECTION_KEYS);
      expect(body).toMatchObject({ id: section.id, name: "New" });
      await expectWebCommand(contributor, [EVENT.sectionRenamed]);
    });

    test("DELETE removes the section with its items and logs them", async () => {
      const list = await fixtures.createList(owner.id);
      const section = await fixtures.createSection(list.id);
      await fixtures.createItem(list.id, { sectionID: section.id });
      signIn(owner);

      expect(
        await read(
          await sectionRoute.DELETE(
            request("DELETE", "/x"),
            params(section.id),
          ),
        ),
      ).toEqual({ status: 200, body: { success: true } });

      expect(await prisma.section.count()).toBe(0);
      expect(await prisma.item.count()).toBe(0);
      await expectWebCommand(owner, [EVENT.itemDeleted, EVENT.sectionDeleted]);
    });

    test("PATCH and DELETE on a foreign section answer 403, a missing one 404", async () => {
      const list = await fixtures.createList(owner.id);
      const section = await fixtures.createSection(list.id, "Old");
      signIn(stranger);

      const cases = [
        {
          id: section.id,
          expected: { status: 403, body: { error: "Forbidden" } },
        },
        {
          id: "missing",
          expected: { status: 404, body: { error: "Not Found" } },
        },
      ];
      for (const { id, expected } of cases) {
        expect(
          await read(
            await sectionRoute.PATCH(
              request("PATCH", "/x", { name: "New" }),
              params(id),
            ),
          ),
        ).toEqual(expected);
        expect(
          await read(
            await sectionRoute.DELETE(request("DELETE", "/x"), params(id)),
          ),
        ).toEqual(expected);
      }
      expect(
        (await prisma.section.findUniqueOrThrow({ where: { id: section.id } }))
          .name,
      ).toBe("Old");
      await expectNoCommands();
    });
  });

  describe("first list on sign-in", () => {
    test("a user without lists gets one through the list service", async () => {
      signIn(owner);

      const listId = await getFirstListId();

      const list = await prisma.list.findUniqueOrThrow({
        where: { id: listId! },
      });
      expect(list).toMatchObject({ name: "my first list", ownerID: owner.id });
      await expectWebCommand(owner, [EVENT.listCreated]);
      expect(await getFirstListId()).toBe(listId);
      expect(await prisma.list.count()).toBe(1);
    });
  });
});
