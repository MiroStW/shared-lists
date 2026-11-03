const { expect, test } = require("@playwright/test");

// Two browser contexts look at the list the second seeded user shares with
// the first one. Changes from one context or user must show up in the other
// without a reload.
const user1 = {
  email: process.env.E2E_EMAIL || "e2e@example.test",
  password: process.env.E2E_PASSWORD || "e2e-password",
};
const user2 = {
  email: process.env.E2E_USER2_EMAIL || "e2e-2@example.test",
  password: process.env.E2E_USER2_PASSWORD || "e2e-password-2",
};
const sharedListId = process.env.E2E_SHARED_LIST_ID || "e2e-shared-list";
const LIVE_TIMEOUT = 5_000;

const uniqueName = (label) => `${label} ${Date.now()}`;

const signIn = async (page, { email, password }) => {
  await page.goto("/signin");
  await page.getByLabel(/e-mail/i).fill(email);
  await page.getByRole("button", { name: /^next$/i }).click();
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign-in/i }).click();
  await page.waitForURL(/\/lists\/[^/]+$/);
};

// A signed-in page on the shared list, with its live stream connected.
const openSharedList = async (browser, user) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page, user);
  const stream = page.waitForResponse((response) =>
    response.url().endsWith("/api/events"),
  );
  await page.goto(`/lists/${sharedListId}`);
  await stream;
  return { context, page };
};

const createItemViaApi = async (context, name) => {
  const response = await context.request.post(
    `/api/lists/${sharedListId}/items`,
    { data: { name } },
  );
  expect(response.ok()).toBe(true);
  return response.json();
};

test.describe("live updates", () => {
  const contexts = [];

  test.afterEach(async () => {
    for (const context of contexts.splice(0)) await context.close();
  });

  test("an item created in one window appears in another of the same user", async ({
    browser,
  }) => {
    const a = await openSharedList(browser, user1);
    const b = await openSharedList(browser, user1);
    contexts.push(a.context, b.context);
    const name = uniqueName("Live item");

    await a.page.getByRole("button", { name: "add", exact: true }).click();
    await a.page.getByText("New item").click();
    await a.page.keyboard.type(name);
    await a.page.keyboard.press("Enter");
    await expect(a.page.getByText(name)).toBeVisible();

    await expect(b.page.getByText(name)).toBeVisible({ timeout: LIVE_TIMEOUT });
  });

  test("a change by another member through the API appears without reload", async ({
    browser,
  }) => {
    const a = await openSharedList(browser, user1);
    const other = await openSharedList(browser, user2);
    contexts.push(a.context, other.context);
    const name = uniqueName("Shared item");

    await createItemViaApi(other.context, name);

    await expect(a.page.getByText(name)).toBeVisible({ timeout: LIVE_TIMEOUT });
  });

  test("a refused stream is reopened and delivers changes again", async ({
    browser,
  }) => {
    const a = await openSharedList(browser, user1);
    const other = await openSharedList(browser, user2);
    contexts.push(a.context, other.context);
    const name = uniqueName("After restart");

    // A restarting server refuses the stream; the browser then gives up on
    // its own and the page has to reopen it. The service worker fetches the
    // stream, so the route is set on the context.
    await a.context.route("**/api/events", (route) =>
      route.fulfill({ status: 503, body: "" }),
    );
    const refused = a.page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/events") && response.status() === 503,
    );
    await a.page.reload();
    await refused;
    const reopened = a.page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/events") && response.status() === 200,
    );
    await a.context.unroute("**/api/events");
    await reopened;

    const item = await createItemViaApi(other.context, name);

    await expect(a.page.locator(`[id="${item.id}"]`)).toContainText(name, {
      timeout: LIVE_TIMEOUT,
    });
  });

  test("focus and blur after a foreign rename send no PATCH", async ({
    browser,
  }) => {
    const a = await openSharedList(browser, user1);
    const other = await openSharedList(browser, user2);
    contexts.push(a.context, other.context);
    const oldName = uniqueName("Before rename");
    const newName = uniqueName("After rename");

    const item = await createItemViaApi(other.context, oldName);
    const itemRow = a.page.locator(`[id="${item.id}"]`);
    await expect(itemRow).toContainText(oldName, { timeout: LIVE_TIMEOUT });

    const renamed = await other.context.request.patch(`/api/items/${item.id}`, {
      data: { name: newName },
    });
    expect(renamed.ok()).toBe(true);
    await expect(itemRow).toContainText(newName, { timeout: LIVE_TIMEOUT });

    const patches = [];
    a.page.on("request", (request) => {
      if (
        request.method() === "PATCH" &&
        request.url().includes(`/api/items/${item.id}`)
      ) {
        patches.push(request.url());
      }
    });

    await itemRow.getByText(newName).click();
    const input = itemRow.locator("textarea").first();
    await expect(input).toBeFocused();
    await expect(input).toHaveValue(newName);
    await input.blur();
    await expect(itemRow.locator("textarea")).toHaveCount(0);

    // Give a stray PATCH time to go out.
    await a.page.waitForTimeout(1_000);
    expect(patches).toEqual([]);
    await expect(itemRow).toContainText(newName);
  });

  test("the offline banner says changes are not saved", async ({ browser }) => {
    const a = await openSharedList(browser, user1);
    contexts.push(a.context);

    await a.context.setOffline(true);
    await expect(a.page.getByText(/changes are not saved/i)).toBeVisible();

    await a.context.setOffline(false);
    await expect(a.page.getByText(/changes are not saved/i)).toHaveCount(0);
  });
});
