# E2E tests

These tests use a deterministic local user, list, and item.

1. Copy `.env.e2e.example` to `.env.e2e` if you want to override defaults.
2. Make sure `DATABASE_URL` points at a disposable local database.
3. Install Playwright's browser once:

   ```sh
   npm run e2e:install
   ```

4. Run the tests:

   ```sh
   npm run e2e
   ```

If you do not use npm, run the same package scripts with your package manager.
For example:

```sh
E2E_WEB_SERVER_COMMAND="bun run dev" bun run e2e
```

If a dev server is already running:

```sh
E2E_SKIP_WEB_SERVER=1 npm run e2e
```
