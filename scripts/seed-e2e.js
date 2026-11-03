const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");
const pg = require("pg");

const rootDir = path.resolve(__dirname, "..");
const initialEnvKeys = new Set(Object.keys(process.env));

const loadEnvFile = (fileName, { override = false } = {}) => {
  const filePath = path.join(rootDir, fileName);
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;

    const [, key, rawValue] = match;
    if (initialEnvKeys.has(key)) continue;
    if (!override && process.env[key] !== undefined) continue;

    const value = rawValue
      .replace(/^["']|["']$/g, "")
      .replace(/\\n/g, "\n");
    process.env[key] = value;
  }
};

loadEnvFile(".env");
loadEnvFile(".env.local", { override: true });
loadEnvFile(".env.e2e", { override: true });

const databaseUrl = process.env.E2E_DATABASE_URL || process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("E2E_DATABASE_URL or DATABASE_URL is required to seed E2E data");
}

const parsedDatabaseUrl = new URL(databaseUrl);
if (
  process.platform === "darwin" &&
  parsedDatabaseUrl.hostname === "172.17.0.1" &&
  !process.env.E2E_DATABASE_URL
) {
  throw new Error(
    [
      "DATABASE_URL points to 172.17.0.1, which is a Docker bridge address and is not reachable from macOS host-side E2E runs.",
      "Create .env.e2e with a host-reachable database URL, for example:",
      'E2E_DATABASE_URL="postgresql://user:password@localhost:5432/shared_lists"',
    ].join("\n"),
  );
}

const seed = {
  email: process.env.E2E_EMAIL || "e2e@example.test",
  password: process.env.E2E_PASSWORD || "e2e-password",
  userName: process.env.E2E_USER_NAME || "E2E User",
  userId: process.env.E2E_USER_ID || "e2e-user",
  listId: process.env.E2E_LIST_ID || "e2e-list",
  listName: process.env.E2E_LIST_NAME || "E2E List",
  itemId: process.env.E2E_ITEM_ID || "e2e-checkbox-item",
  itemName: process.env.E2E_ITEM_NAME || "E2E Checkbox Item",
  // A second user who owns a list shared with the first user, for the live
  // update specs. Owned by the second user, so the first user's first list
  // (the redirect target after sign-in) stays the list above.
  user2Email: process.env.E2E_USER2_EMAIL || "e2e-2@example.test",
  user2Password: process.env.E2E_USER2_PASSWORD || "e2e-password-2",
  user2Name: process.env.E2E_USER2_NAME || "E2E User 2",
  user2Id: process.env.E2E_USER2_ID || "e2e-user-2",
  sharedListId: process.env.E2E_SHARED_LIST_ID || "e2e-shared-list",
  sharedListName: process.env.E2E_SHARED_LIST_NAME || "E2E Shared List",
};

const pool = new pg.Pool({
  connectionString: databaseUrl,
  connectionTimeoutMillis: 5_000,
});

const upsertUser = async ({ id, email, name, password }, now) => {
  const passwordHash = await bcrypt.hash(password, 10);
  const result = await pool.query(
    `
      INSERT INTO "User" ("id", "email", "name", "passwordHash", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $5)
      ON CONFLICT ("email")
      DO UPDATE SET
        "name" = EXCLUDED."name",
        "passwordHash" = EXCLUDED."passwordHash",
        "updatedAt" = EXCLUDED."updatedAt"
      RETURNING "id"
    `,
    [id, email, name, passwordHash, now],
  );
  return result.rows[0].id;
};

const upsertList = async ({ id, name, ownerId }, now) => {
  await pool.query(
    `
      INSERT INTO "List" ("id", "name", "isArchived", "createdDate", "ownerID")
      VALUES ($1, $2, false, $3, $4)
      ON CONFLICT ("id")
      DO UPDATE SET
        "name" = EXCLUDED."name",
        "isArchived" = false,
        "ownerID" = EXCLUDED."ownerID"
    `,
    [id, name, now, ownerId],
  );
};

const main = async () => {
  const now = new Date();

  const userId = await upsertUser(
    {
      id: seed.userId,
      email: seed.email,
      name: seed.userName,
      password: seed.password,
    },
    now,
  );
  const user2Id = await upsertUser(
    {
      id: seed.user2Id,
      email: seed.user2Email,
      name: seed.user2Name,
      password: seed.user2Password,
    },
    now,
  );

  await upsertList({ id: seed.listId, name: seed.listName, ownerId: userId }, now);
  await upsertList(
    { id: seed.sharedListId, name: seed.sharedListName, ownerId: user2Id },
    now,
  );
  await pool.query(
    `
      INSERT INTO "_ListContributors" ("A", "B")
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
    `,
    [seed.sharedListId, userId],
  );
  // Items created by earlier runs of the live update specs.
  await pool.query(`DELETE FROM "Item" WHERE "listID" = $1`, [seed.sharedListId]);

  await pool.query(
    `
      INSERT INTO "Item" (
        "id",
        "name",
        "completed",
        "description",
        "createdDate",
        "order",
        "listID",
        "sectionID",
        "normalized"
      )
      VALUES ($1, $2, false, '', $3, 0, $4, null, $5)
      ON CONFLICT ("id")
      DO UPDATE SET
        "name" = EXCLUDED."name",
        "completed" = false,
        "description" = '',
        "order" = 0,
        "listID" = EXCLUDED."listID",
        "sectionID" = null,
        "normalized" = EXCLUDED."normalized"
    `,
    [seed.itemId, seed.itemName, now, seed.listId, seed.itemName.toLowerCase()],
  );

  console.log("Seeded E2E data:");
  console.log(`  E2E_EMAIL=${seed.email}`);
  console.log(`  E2E_LIST_ID=${seed.listId}`);
  console.log(`  E2E_ITEM_ID=${seed.itemId}`);
  console.log(`  E2E_USER2_EMAIL=${seed.user2Email}`);
  console.log(`  E2E_SHARED_LIST_ID=${seed.sharedListId}`);
};

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
