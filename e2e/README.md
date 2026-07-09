# E2E tests

These tests use a deterministic local user, list, and item.

1. Copy `.env.e2e.example` to `.env.e2e`.
2. Set `E2E_DATABASE_URL` to a disposable database that is reachable from your host machine.
   If your app `.env` uses `172.17.0.1`, override it here with a host-reachable address such as `localhost`.
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
