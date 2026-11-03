import { prisma } from "db/prisma";

// Empties every app table in the test database. Call it in beforeEach so
// each test starts from a clean state. Prisma's migration history is kept.
export const resetDatabase = async () => {
  const [{ current_database: databaseName }] = await prisma.$queryRaw<
    { current_database: string }[]
  >`SELECT current_database()`;
  if (!databaseName.includes("test")) {
    throw new Error(
      `Refusing to truncate tables in database "${databaseName}": name does not contain "test".`,
    );
  }

  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;
  if (tables.length === 0) return;

  const tableList = tables
    .map(({ tablename }) => `"public"."${tablename.replace(/"/g, '""')}"`)
    .join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`);
};
