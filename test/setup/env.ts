// Preloaded by bunfig.toml before any test file. It points DATABASE_URL at
// the test database before src/db/prisma.ts is imported anywhere.
import { existsSync, readFileSync } from "fs";
import path from "path";

type Env = Record<string, string | undefined>;

const ENV_TEST_FILE = path.join(import.meta.dir, "..", "..", ".env.test");

// Bun loads .env.test itself when NODE_ENV is "test" (the bun test default).
// This fallback covers runs where NODE_ENV is set to something else.
export const readEnvFileValue = (
  filePath: string,
  key: string,
): string | undefined => {
  if (!existsSync(filePath)) return undefined;

  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (match && match[1] === key) {
      return match[2].replace(/^["']|["']$/g, "");
    }
  }
  return undefined;
};

export const resolveTestDatabaseUrl = (env: Env): string => {
  const url = env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      "Refusing to run tests: TEST_DATABASE_URL is not set. " +
        "Copy .env.test.example to .env.test and point it at a disposable database.",
    );
  }

  let databaseName: string;
  try {
    databaseName = decodeURIComponent(new URL(url).pathname.replace(/^\//, ""));
  } catch {
    throw new Error("Refusing to run tests: TEST_DATABASE_URL is not a valid URL.");
  }

  if (!databaseName.includes("test")) {
    throw new Error(
      `Refusing to run tests: database name "${databaseName}" in TEST_DATABASE_URL ` +
        'does not contain "test". Tests truncate tables and must never hit a real database.',
    );
  }

  return url;
};

const testDatabaseUrl = resolveTestDatabaseUrl({
  TEST_DATABASE_URL:
    process.env.TEST_DATABASE_URL ??
    readEnvFileValue(ENV_TEST_FILE, "TEST_DATABASE_URL"),
});

process.env.TEST_DATABASE_URL = testDatabaseUrl;
process.env.DATABASE_URL = testDatabaseUrl;
