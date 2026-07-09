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

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to seed E2E data");
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
};

const pool = new pg.Pool({ connectionString: databaseUrl });

const main = async () => {
  const now = new Date();
  const passwordHash = await bcrypt.hash(seed.password, 10);

  const userResult = await pool.query(
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
    [seed.userId, seed.email, seed.userName, passwordHash, now],
  );

  const userId = userResult.rows[0].id;

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
    [seed.listId, seed.listName, now, userId],
  );

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
};

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
