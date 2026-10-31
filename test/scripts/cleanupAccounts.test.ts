import { beforeEach, describe, expect, test } from "bun:test";
import { prisma } from "db/prisma";
import {
  applyCleanupPlan,
  buildCleanupPlan,
  parseArgs,
  runCli,
} from "../../scripts/cleanup-accounts";
import { resetDatabase } from "../setup/db";
import {
  caught,
  createItem,
  createList,
  createUser,
} from "../lists/fixtures";
import { generateAgentToken } from "server/auth/agentTokens";

const makeIo = (opts: { isTTY: boolean; answer?: string }) => {
  const lines: string[] = [];
  const prompts: string[] = [];
  return {
    lines,
    prompts,
    io: {
      isTTY: opts.isTTY,
      print: (line: string) => lines.push(line),
      prompt: async (question: string) => {
        prompts.push(question);
        return opts.answer ?? "";
      },
    },
    text: () => lines.join("\n"),
  };
};

const seed = async () => {
  const keeper = await createUser("keeper");
  const other = await createUser("other");
  const gone1 = await createUser("gone-one");
  const gone2 = await createUser("gone-two");
  const keptList = await createList(keeper.id, { name: "Kept list" });
  await createItem(keptList.id);
  const goneList = await createList(gone1.id, { name: "Gone list" });
  await createItem(goneList.id);
  await createItem(goneList.id, { name: "Second" });
  return { keeper, other, gone1, gone2, keptList, goneList };
};

beforeEach(resetDatabase);

describe("parseArgs", () => {
  test("splits --keep on commas and detects --apply", () => {
    expect(parseArgs(["--keep", "a@x.test, b@x.test", "--apply"])).toEqual({
      keep: ["a@x.test", "b@x.test"],
      apply: true,
    });
    expect(parseArgs(["--keep=a@x.test"])).toEqual({
      keep: ["a@x.test"],
      apply: false,
    });
  });

  test("returns an empty keep list without --keep", () => {
    expect(parseArgs([]).keep).toEqual([]);
  });
});

describe("buildCleanupPlan", () => {
  test("lists everyone except the kept accounts with list and item counts", async () => {
    const { gone1 } = await seed();
    const plan = await buildCleanupPlan(prisma, ["KEEPER@example.test", "other@example.test"]);

    expect(plan.keep.map((u) => u.email).sort()).toEqual([
      "keeper@example.test",
      "other@example.test",
    ]);
    expect(plan.remove.map((u) => u.email).sort()).toEqual([
      "gone-one@example.test",
      "gone-two@example.test",
    ]);
    const entry = plan.remove.find((u) => u.id === gone1.id)!;
    expect(entry.ownedLists).toEqual([
      { id: expect.any(String), name: "Gone list", itemCount: 2 },
    ]);
    expect(entry.itemCount).toBe(2);
    expect(plan.blockers).toEqual([]);
  });

  test("rejects an empty keep list", async () => {
    await seed();
    const error = await caught(() => buildCleanupPlan(prisma, []));
    expect(error).toBeInstanceOf(Error);
  });

  test("rejects an unknown keep email and names it", async () => {
    await seed();
    const error = await caught(() =>
      buildCleanupPlan(prisma, ["keeper@example.test", "typo@example.test"]),
    );
    expect((error as Error).message).toContain("typo@example.test");
  });

  test("reports a blocker for a removed owner's list kept users contribute to", async () => {
    const { keeper, gone1 } = await seed();
    const shared = await createList(gone1.id, {
      name: "Shared with keeper",
      contributorIds: [keeper.id],
    });
    const plan = await buildCleanupPlan(prisma, ["keeper@example.test"]);
    expect(plan.blockers).toEqual([
      {
        removeUserEmail: "gone-one@example.test",
        listId: shared.id,
        listName: "Shared with keeper",
        keptContributorEmails: ["keeper@example.test"],
      },
    ]);
  });
});

describe("applyCleanupPlan", () => {
  test("deletes removed users with their lists, keeps the rest", async () => {
    const { keeper, keptList, goneList, gone1 } = await seed();
    const plan = await buildCleanupPlan(prisma, ["keeper@example.test", "other@example.test"]);
    await applyCleanupPlan(prisma, plan);

    expect(await prisma.user.findUnique({ where: { id: gone1.id } })).toBeNull();
    expect(await prisma.list.findUnique({ where: { id: goneList.id } })).toBeNull();
    expect(await prisma.item.count({ where: { listID: goneList.id } })).toBe(0);
    expect(await prisma.user.count()).toBe(2);
    expect(await prisma.user.findUnique({ where: { id: keeper.id } })).not.toBeNull();
    expect(await prisma.list.findUnique({ where: { id: keptList.id } })).not.toBeNull();
    expect(await prisma.item.count({ where: { listID: keptList.id } })).toBe(1);
  });

  test("agent accesses and commands of removed users do not block deletion", async () => {
    const { gone1, keptList } = await seed();
    const token = generateAgentToken();
    const access = await prisma.agentAccess.create({
      data: {
        label: "test",
        kind: "person",
        tokenId: token.tokenId,
        tokenHash: token.tokenHash,
        createdById: gone1.id,
      },
    });
    await prisma.command.create({
      data: {
        actorUserId: gone1.id,
        accessId: access.id,
        channel: "claude-code",
        origin: "agent",
        kind: "change",
      },
    });

    const plan = await buildCleanupPlan(prisma, ["keeper@example.test"]);
    await applyCleanupPlan(prisma, plan);

    expect(await prisma.user.count()).toBe(1);
    expect(await prisma.agentAccess.count()).toBe(0);
    expect(await prisma.command.count()).toBe(1);
    expect(await prisma.list.findUnique({ where: { id: keptList.id } })).not.toBeNull();
  });

  test("refuses when blockers exist and deletes nothing", async () => {
    const { keeper, gone1 } = await seed();
    await createList(gone1.id, { name: "Shared", contributorIds: [keeper.id] });
    const plan = await buildCleanupPlan(prisma, ["keeper@example.test"]);
    const error = await caught(() => applyCleanupPlan(prisma, plan));
    expect(error).toBeInstanceOf(Error);
    expect(await prisma.user.count()).toBe(4);
  });
});

describe("runCli", () => {
  test("without --keep prints help and exits 1", async () => {
    await seed();
    const out = makeIo({ isTTY: true });
    expect(await runCli([], prisma, out.io)).toBe(1);
    expect(out.text()).toContain("--keep");
    expect(await prisma.user.count()).toBe(4);
  });

  test("dry run lists accounts with list counts and deletes nothing (AE9)", async () => {
    await seed();
    const out = makeIo({ isTTY: true });
    const code = await runCli(["--keep", "keeper@example.test"], prisma, out.io);
    expect(code).toBe(0);
    const text = out.text();
    expect(text).toContain("gone-one@example.test");
    expect(text).toContain("gone-two@example.test");
    expect(text).toContain("other@example.test");
    expect(text).toContain("Gone list");
    expect(text).toContain("Nothing deleted. Re-run with --apply to delete.");
    expect(out.prompts).toEqual([]);
    expect(await prisma.user.count()).toBe(4);
  });

  test("unknown keep email exits 1 and deletes nothing", async () => {
    await seed();
    const out = makeIo({ isTTY: true });
    expect(await runCli(["--keep", "typo@example.test"], prisma, out.io)).toBe(1);
    expect(out.text()).toContain("typo@example.test");
    expect(await prisma.user.count()).toBe(4);
  });

  test("--apply without a TTY aborts and deletes nothing", async () => {
    await seed();
    const out = makeIo({ isTTY: false, answer: "delete 3 accounts" });
    expect(await runCli(["--keep", "keeper@example.test", "--apply"], prisma, out.io)).toBe(1);
    expect(out.prompts).toEqual([]);
    expect(await prisma.user.count()).toBe(4);
  });

  test("a wrong confirmation phrase aborts", async () => {
    await seed();
    const out = makeIo({ isTTY: true, answer: "yes" });
    expect(await runCli(["--keep", "keeper@example.test", "--apply"], prisma, out.io)).toBe(1);
    expect(out.prompts).toHaveLength(1);
    expect(await prisma.user.count()).toBe(4);
  });

  test("the exact phrase deletes the removed accounts", async () => {
    await seed();
    const out = makeIo({ isTTY: true, answer: "delete 3 accounts" });
    expect(await runCli(["--keep", "keeper@example.test", "--apply"], prisma, out.io)).toBe(0);
    expect(await prisma.user.count()).toBe(1);
  });

  test("blockers abort, name the list, and delete nothing", async () => {
    const { keeper, gone1 } = await seed();
    await createList(gone1.id, { name: "Blocking list", contributorIds: [keeper.id] });
    const out = makeIo({ isTTY: true, answer: "delete 3 accounts" });
    expect(await runCli(["--keep", "keeper@example.test", "--apply"], prisma, out.io)).toBe(1);
    expect(out.text()).toContain("Blocking list");
    expect(out.prompts).toEqual([]);
    expect(await prisma.user.count()).toBe(4);
  });
});
