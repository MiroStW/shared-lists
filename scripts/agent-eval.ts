// Live check of the list agent against the real model (U10). Not part of CI.
//
//   ANTHROPIC_API_KEY=... bun scripts/agent-eval.ts
//
// Runs a handful of generic sentences against the test database
// (TEST_DATABASE_URL from the environment or .env.test; its name must
// contain "test"). It seeds its own user and lists and removes them again.
// LIST_AGENT_MODEL picks the model as in the app.

export {};

if (!process.env.ANTHROPIC_API_KEY?.trim()) {
  console.error(
    "agent-eval needs ANTHROPIC_API_KEY: it calls the real model. Nothing was run.",
  );
  process.exit(1);
}

// Points DATABASE_URL at the test database and refuses any other database.
await import("../test/setup/env");
// Keeps Prisma's query log out of the output.
Object.assign(process.env, { NODE_ENV: "test" });

const { prisma } = await import("db/prisma");
const { runAgentCommand } = await import("server/agent/listAgent");
const { personActor } = await import("server/lists/actor");

type Case = { text: string; expect: string };

const CASES: Case[] = [
  { text: "Milch drauf", expect: "needs_choice: Milch or Hafermilch" },
  { text: "2", expect: "done without the model: Hafermilch reopened" },
  {
    text: "Brot und Butter auf die Einkaufsliste",
    expect:
      "done: Brot to Bäckerei, Butter to Kühlregal, short German confirmation",
  },
  { text: "Was steht auf der Einkaufsliste?", expect: "done, no changes" },
  { text: "mach das rückgängig", expect: "done: Brot and Butter removed" },
  {
    text: "Put two apples on the shopping list",
    expect: "done: Äpfel or apples with a note, English confirmation",
  },
];

const seed = async () => {
  const suffix = Math.random().toString(36).slice(2, 10);
  const user = await prisma.user.create({
    data: {
      email: `agent-eval-${suffix}@example.test`,
      name: "Eval user",
      passwordHash: "unused",
    },
  });
  const list = await prisma.list.create({
    data: { name: "Einkaufsliste", ownerID: user.id },
  });
  await prisma.list.create({ data: { name: "Baumarkt", ownerID: user.id } });
  await prisma.section.createMany({
    data: [
      { listId: list.id, name: "Bäckerei" },
      { listId: list.id, name: "Kühlregal" },
    ],
  });
  await prisma.item.createMany({
    data: [
      { name: "Milch", completed: true, order: 0 },
      { name: "Hafermilch", completed: true, order: 1 },
      { name: "Eier", completed: false, order: 2 },
    ].map((item) => ({
      ...item,
      listID: list.id,
      normalized: item.name.toLowerCase(),
    })),
  });
  return user;
};

const cleanUp = async (userId: string) => {
  await prisma.command.deleteMany({ where: { actorUserId: userId } });
  await prisma.user.delete({ where: { id: userId } });
};

const user = await seed();
const actor = personActor(user.id, { channel: "agent-eval", origin: "agent" });
let failures = 0;
try {
  for (const { text, expect } of CASES) {
    const started = performance.now();
    try {
      const response = await runAgentCommand(actor, { text });
      const ms = Math.round(performance.now() - started);
      console.log(`\n> ${text}   (${ms} ms)\n  expected: ${expect}`);
      console.log(`  status:   ${response.status}`);
      console.log(
        `  message:  ${response.message.replace(/\n/g, "\n            ")}`,
      );
      for (const change of response.changes) {
        const target = change.item ?? change.section ?? change.list;
        console.log(`  change:   ${change.type} ${target ?? ""}`);
      }
    } catch (error) {
      failures++;
      console.log(`\n> ${text}\n  failed: ${String(error)}`);
    }
  }
} finally {
  await cleanUp(user.id);
  await prisma.$disconnect();
}
process.exit(failures > 0 ? 1 : 0);
