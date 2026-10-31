// One-off admin script: removes every account except the ones named in
// --keep. It is the documented exception to the single write path (KTD1) and
// writes no list events. Dry run by default; deleting needs --apply, a TTY
// and a typed confirmation.
//
//   bun scripts/cleanup-accounts.ts --keep a@example.com,b@example.com [--apply]
import { existsSync, readFileSync } from "fs";
import path from "path";
import { createInterface } from "readline/promises";
import type { PrismaClient } from "@prisma/client";

export type CleanupUser = {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
};

export type CleanupPlan = {
  keep: CleanupUser[];
  remove: (CleanupUser & {
    ownedLists: { id: string; name: string; itemCount: number }[];
    itemCount: number;
  })[];
  blockers: {
    removeUserEmail: string;
    listId: string;
    listName: string;
    keptContributorEmails: string[];
  }[];
};

export type CliIo = {
  isTTY: boolean;
  print: (line: string) => void;
  prompt: (question: string) => Promise<string>;
};

const HELP = [
  "Usage: bun scripts/cleanup-accounts.ts --keep <email>[,<email>...] [--apply]",
  "",
  "  --keep   Accounts to keep (required). Every other account is a deletion candidate.",
  "  --apply  Delete the listed accounts after a typed confirmation (needs a terminal).",
  "",
  "Without --apply nothing is deleted.",
].join("\n");

export const parseArgs = (argv: string[]) => {
  const keep: string[] = [];
  let apply = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--apply") apply = true;
    else if (arg === "--keep") keep.push(...splitEmails(argv[++i] ?? ""));
    else if (arg.startsWith("--keep=")) keep.push(...splitEmails(arg.slice(7)));
  }
  return { keep, apply };
};

const splitEmails = (value: string) =>
  value
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);

export const buildCleanupPlan = async (
  prisma: PrismaClient,
  keepEmails: string[],
): Promise<CleanupPlan> => {
  if (keepEmails.length === 0) {
    throw new Error("The keep list is empty. Pass the accounts to keep with --keep.");
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      ownedLists: {
        orderBy: { createdDate: "asc" },
        select: {
          id: true,
          name: true,
          contributors: { select: { id: true } },
          _count: { select: { items: true } },
        },
      },
    },
  });

  const wanted = keepEmails.map((email) => email.toLowerCase());
  const known = new Set(users.map((user) => user.email.toLowerCase()));
  const unknown = keepEmails.filter((email) => !known.has(email.toLowerCase()));
  if (unknown.length > 0) {
    throw new Error(`Unknown account(s) in --keep: ${unknown.join(", ")}. Nothing to do.`);
  }

  const isKept = (email: string) => wanted.includes(email.toLowerCase());
  const keptById = new Map(users.filter((u) => isKept(u.email)).map((u) => [u.id, u]));
  const strip = ({ id, email, name, createdAt }: CleanupUser): CleanupUser => ({
    id,
    email,
    name,
    createdAt,
  });

  const plan: CleanupPlan = {
    keep: [...keptById.values()].map(strip),
    remove: [],
    blockers: [],
  };

  for (const user of users.filter((u) => !isKept(u.email))) {
    const ownedLists = user.ownedLists.map((list) => ({
      id: list.id,
      name: list.name,
      itemCount: list._count.items,
    }));
    plan.remove.push({
      ...strip(user),
      ownedLists,
      itemCount: ownedLists.reduce((sum, list) => sum + list.itemCount, 0),
    });
    for (const list of user.ownedLists) {
      const keptContributorEmails = list.contributors
        .filter((c) => keptById.has(c.id))
        .map((c) => keptById.get(c.id)!.email);
      if (keptContributorEmails.length > 0) {
        plan.blockers.push({
          removeUserEmail: user.email,
          listId: list.id,
          listName: list.name,
          keptContributorEmails,
        });
      }
    }
  }

  return plan;
};

export const applyCleanupPlan = async (prisma: PrismaClient, plan: CleanupPlan) => {
  if (plan.blockers.length > 0) {
    throw new Error("Plan has blockers, refusing to delete.");
  }
  const ids = plan.remove.map((user) => user.id);
  // Lists, items, sections, invites and agent accesses go via onDelete: Cascade.
  const { count } = await prisma.$transaction((tx) =>
    tx.user.deleteMany({ where: { id: { in: ids } } }),
  );
  return count;
};

const printPlan = (plan: CleanupPlan, print: CliIo["print"]) => {
  print(`Keeping ${plan.keep.length} account(s):`);
  for (const user of plan.keep) print(`  ${user.email}`);
  print("");
  print(`Removing ${plan.remove.length} account(s):`);
  for (const user of plan.remove) {
    print(
      `  ${user.email}  name=${user.name ?? "-"}  created=${user.createdAt.toISOString().slice(0, 10)}` +
        `  lists=${user.ownedLists.length}  items=${user.itemCount}`,
    );
    for (const list of user.ownedLists) {
      print(`      list "${list.name}" (${list.itemCount} items)`);
    }
  }
  print("");
};

export const runCli = async (
  argv: string[],
  prisma: PrismaClient,
  io: CliIo,
): Promise<number> => {
  const { keep, apply } = parseArgs(argv);
  if (keep.length === 0) {
    io.print(HELP);
    return 1;
  }

  let plan: CleanupPlan;
  try {
    plan = await buildCleanupPlan(prisma, keep);
  } catch (error) {
    io.print(`Error: ${(error as Error).message}`);
    return 1;
  }

  printPlan(plan, io.print);

  if (plan.blockers.length > 0) {
    io.print("Aborting. These lists belong to an account to remove but a kept account contributes:");
    for (const b of plan.blockers) {
      io.print(
        `  "${b.listName}" (${b.listId}), owner ${b.removeUserEmail}, kept contributor(s): ${b.keptContributorEmails.join(", ")}`,
      );
    }
    io.print("Deleting would remove these lists. Resolve them first. Nothing deleted.");
    return 1;
  }

  if (!apply) {
    io.print("Nothing deleted. Re-run with --apply to delete.");
    return 0;
  }

  if (!io.isTTY) {
    io.print("Refusing to delete without an interactive terminal. Nothing deleted.");
    return 1;
  }
  if (plan.remove.length === 0) {
    io.print("No accounts to remove.");
    return 0;
  }

  const phrase = `delete ${plan.remove.length} accounts`;
  const answer = await io.prompt(`Type "${phrase}" to confirm: `);
  if (answer.trim() !== phrase) {
    io.print("Confirmation did not match. Nothing deleted.");
    return 1;
  }

  const count = await applyCleanupPlan(prisma, plan);
  io.print(`Deleted ${count} account(s).`);
  return 0;
};

const loadDatabaseUrl = () => {
  if (process.env.DATABASE_URL) return;
  const file = path.resolve(import.meta.dir, "..", ".env.local");
  if (!existsSync(file)) return;
  const match = readFileSync(file, "utf8").match(/^\s*DATABASE_URL\s*=\s*"?([^"\r\n]+)"?\s*$/m);
  if (match) process.env.DATABASE_URL = match[1];
};

const main = async () => {
  loadDatabaseUrl();
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set (environment or .env.local).");
    process.exit(1);
  }
  const url = new URL(process.env.DATABASE_URL);
  console.log(`Database: ${url.host}${url.pathname}\n`);

  // Imported late so DATABASE_URL is set before the Prisma singleton reads it.
  const { prisma } = await import("../src/db/prisma");
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const code = await runCli(process.argv.slice(2), prisma, {
      isTTY: Boolean(process.stdin.isTTY),
      print: (line) => console.log(line),
      prompt: (question) => rl.question(question),
    });
    process.exitCode = code;
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
};

if (import.meta.main) {
  void main();
}
