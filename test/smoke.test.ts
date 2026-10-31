import { expect, test } from "bun:test";
import { prisma } from "db/prisma";

test("connects to the test database through the Prisma singleton", async () => {
  const [{ current_database: databaseName }] = await prisma.$queryRaw<
    { current_database: string }[]
  >`SELECT current_database()`;
  expect(databaseName).toContain("test");

  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'List'
  `;
  expect(tables).toEqual([{ tablename: "List" }]);
});
