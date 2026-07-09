const { expect, test } = require("@playwright/test");

const email = process.env.E2E_EMAIL || "e2e@example.test";
const password = process.env.E2E_PASSWORD || "e2e-password";
const itemId = process.env.E2E_ITEM_ID || "e2e-checkbox-item";
const itemName = process.env.E2E_ITEM_NAME || "E2E Checkbox Item";

test("checkbox toggles on first click and updates optimistically", async ({
  page,
}) => {
  await page.goto("/signin");

  await page.getByLabel(/e-mail/i).fill(email);
  await page.getByRole("button", { name: /^next$/i }).click();
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign-in/i }).click();

  await page.waitForURL(/\/lists\/[^/]+$/);
  await expect(page.getByText(itemName)).toBeVisible();

  const item = page.locator(`#${itemId}`);
  const checkbox = item.getByRole("checkbox");
  await expect(checkbox).not.toBeChecked();

  let releasePatch;
  const patchStarted = new Promise((resolve) => {
    releasePatch = resolve;
  });
  const patchCompleted = page.waitForResponse((response) => {
    return (
      response.url().includes(`/api/items/${itemId}`) &&
      response.request().method() === "PATCH"
    );
  });

  await page.route(`**/api/items/${itemId}`, async (route) => {
    if (route.request().method() !== "PATCH") {
      await route.continue();
      return;
    }

    patchStarted();
    await new Promise((resolve) => {
      releasePatch = resolve;
    });
    await route.continue();
  });

  await checkbox.click();
  await patchStarted;
  await expect(checkbox).toBeChecked({ timeout: 250 });

  releasePatch();
  await patchCompleted;
  await expect(checkbox).toBeChecked();

  await page.unroute(`**/api/items/${itemId}`);
  await checkbox.click();
  await expect(checkbox).not.toBeChecked();
});
