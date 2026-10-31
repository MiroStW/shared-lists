const { expect, test } = require("@playwright/test");

const email = process.env.E2E_EMAIL || "e2e@example.test";
const password = process.env.E2E_PASSWORD || "e2e-password";

const signIn = async (page) => {
  await page.goto("/signin");
  await page.getByLabel(/e-mail/i).fill(email);
  await page.getByRole("button", { name: /^next$/i }).click();
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign-in/i }).click();
  await page.waitForURL(/\/lists\/[^/]+$/);
};

test("create a person access, see its token once and revoke it", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const label = `e2e-${Date.now()}`;

  await signIn(page);
  await page.getByRole("button", { name: "User menu" }).click();
  await page.getByRole("link", { name: "agent access" }).click();
  await page.waitForURL(/\/settings\/agents$/);

  await page.getByLabel(/label/i).fill(label);
  await page.getByRole("button", { name: "Create access" }).click();

  const token = page.getByTestId("agent-token");
  await expect(token).toHaveText(/^sl_[a-z0-9]{8}_[A-Za-z0-9_-]{43}$/);
  await expect(page.getByText(/shown only once/i)).toBeVisible();
  const tokenText = await token.textContent();

  await page.getByRole("button", { name: "Copy token" }).click();
  await expect(page.getByRole("button", { name: "Copied" })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    tokenText,
  );

  await page.getByRole("button", { name: "Done" }).click();
  await expect(token).toHaveCount(0);

  const row = page.getByTestId("agent-access").filter({ hasText: label });
  await expect(row).toContainText("Person");
  await expect(row).toContainText("Last used never");

  // The token is never shown again.
  await page.reload();
  await expect(row).toBeVisible();
  await expect(page.getByTestId("agent-token")).toHaveCount(0);
  await expect(page.getByText(tokenText)).toHaveCount(0);

  await row.getByRole("button", { name: "Revoke" }).click();
  await page.locator("#modal").getByRole("button", { name: "Revoke" }).click();
  await expect(row).toContainText("Revoked");
  await expect(row.getByRole("button", { name: "Revoke" })).toHaveCount(0);
});
