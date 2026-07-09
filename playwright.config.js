const { defineConfig, devices } = require("@playwright/test");
const fs = require("fs");
const path = require("path");

const rootDir = __dirname;
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

    process.env[key] = rawValue
      .replace(/^["']|["']$/g, "")
      .replace(/\\n/g, "\n");
  }
};

loadEnvFile(".env");
loadEnvFile(".env.local", { override: true });
loadEnvFile(".env.e2e", { override: true });

const baseURL = process.env.E2E_BASE_URL || "http://127.0.0.1:3000";
const webServerCommand = process.env.E2E_WEB_SERVER_COMMAND || "npm run dev";
const databaseURL = process.env.E2E_DATABASE_URL || process.env.DATABASE_URL;

module.exports = defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: process.env.E2E_SKIP_WEB_SERVER
    ? undefined
    : {
        command: webServerCommand,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          ...process.env,
          DATABASE_URL: databaseURL,
          NEXTAUTH_URL: baseURL,
        },
      },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
