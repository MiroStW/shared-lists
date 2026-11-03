# Shared lists

Self-hosted shared lists app with live updates and a responsive design.

## Stack

- Next.js (App Router) with React and MUI
- PostgreSQL via Prisma
- NextAuth for authentication
- Bun as package manager and runtime for scripts
- Docker Compose for deployment

## Local development

1. Start a PostgreSQL instance and copy `.env.local.example` to `.env.local`. Adjust `DATABASE_URL`, `NEXTAUTH_URL` and `NEXTAUTH_SECRET`.
2. Install dependencies and generate the Prisma client:
   ```bash
   bun install
   bunx prisma generate
   ```
3. Apply migrations and start the dev server:
   ```bash
   bunx prisma migrate deploy
   bun run dev
   ```

Open [http://localhost:3000](http://localhost:3000).

## Tests

- `bun run lint` runs ESLint, `bun run typecheck` the TypeScript compiler.
- `bun test` runs the server tests against a disposable Postgres database (see `.env.test.example`). Apply the migrations to it first: `DATABASE_URL=$TEST_DATABASE_URL bunx prisma migrate deploy`. The list agent runs against a scripted fake model there, without network.
- `bun run e2e:install` installs the Playwright browser once. `bun run e2e` seeds data (see `.env.e2e.example`) and runs the end-to-end tests.
- `ANTHROPIC_API_KEY=... bun scripts/agent-eval.ts` plays a few generic sentences through the list agent with the real model against the test database and prints the answers and timings. It is optional and not part of CI.

## Agent access

External agents (Claude Code, NanoClaw bridges, later the iOS app) act on behalf of one person, or of a household that sees only the lists all its members share.

1. Open **agent access** in the user menu (`/settings/agents`) and create an access, e.g. "claude-code". The token (`sl_...`) is shown once; copy it. Revoke an access there when it is no longer needed.
2. Use the token as `Authorization: Bearer <token>`. A household access may name the person behind a call with the header `x-acting-user: <email>`; undo then works per person.

Three ways in, all on the same tools and the same event log:

- **MCP** for Claude Code (Streamable HTTP, stateless):
  ```bash
  claude mcp add --transport http shared-lists http://<host>:3006/api/mcp --header "Authorization: Bearer <token>"
  ```
  It offers every list tool plus `run_command`, which hands a whole sentence to the list agent.
- **HTTP tools** for bridges that speak plain HTTP: `GET /api/agent/tools` lists the tools with their JSON schemas, `POST /api/agent/tools/<name>` with the tool input as JSON body runs one and answers `{result}` or `{error, fields?}`. Each call is one command; `undo_last_command` takes back the latest one.
- **Sentences** for the list agent: `POST /api/agent/command` with `{"text": "Milch und Brot drauf"}`. The answer is `{status, message, changes, command_id, clarification}` with status `done`, `needs_choice` or `error`. On `needs_choice`, `message` lists numbered options and `clarification` holds them structured; answer with the number as text (`{"text": "2"}`), an option label, or `{"clarification_id": "...", "option": 2}`. Questions expire after 30 minutes. "mach das rückgängig" undoes the person's last command. A signed-in web session can call the endpoint too.

The list agent needs `ANTHROPIC_API_KEY` or `ANTHROPIC_PROXY_URL` (model `LIST_AGENT_MODEL`, default `claude-haiku-5-5`); without either, sentences answer 503 while the tools and answers by number keep working. Each access (or user) may send `LIST_AGENT_DAILY_COMMAND_LIMIT` sentences per day (default 300); above that sentences answer 429. Tool calls, web clicks and answers to a question do not count.

### Key through a credential proxy

Instead of holding the key itself, the app can send its model calls through a credential proxy such as a [OneCLI](https://onecli.sh) gateway, which injects the real key. Set `ANTHROPIC_PROXY_URL` to the proxy URL of an identity that holds only the Anthropic secret (with its token, e.g. `http://x:<token>@172.17.0.1:10255`), leave `ANTHROPIC_API_KEY` empty and let Node trust the proxy's CA: put the CA file into `certs/` next to `docker-compose.yml` (mounted read-only at `/run/certs`) and set `NODE_EXTRA_CA_CERTS=/run/certs/<file>`. Only the model client uses the proxy; all other traffic goes direct.

## Deployment

The app is deployed with `scripts/deploy.sh`, which syncs the repo to the deploy host and rebuilds the Docker Compose service there. It is reachable on the Tailnet only and is not exposed to the public internet.

Migrations and scripts run in a one-off container from the Dockerfile's `builder` stage, the compose service `tools` (the runner image contains neither `scripts/` nor `prisma.config.ts`). It joins the `stack_default` network, reads `.env` and is never started by `docker compose up`:

```bash
docker compose run --rm --build tools <command>
```

### Deploy steps for this release

`scripts/deploy.sh` syncs and restarts in one go. For this release run only its `rsync` line, then these steps in the deploy directory on the host; step 4 starts the new version.

The `rsync` line has no `--delete`, so files this release removes stay on the host and end up in the image. The old machine `apply` route uses the dropped `ItemUpdateLog` model and breaks the build. Remove them on the host after syncing:

```bash
rm -rf src/app/api/machine src/server/machineAuth.ts scripts/migrate-user.ts scripts/migrate-data.js src/functions
```

0. Back up the database first. The migration drops a table and the cleanup in step 7 deletes accounts; neither can be undone otherwise:
   ```bash
   docker exec <postgres-container> pg_dump -U <db-user> -Fc shared_lists > shared_lists-before-agent-backend.dump
   ```
1. Check whether `ItemUpdateLog` has rows. The migration drops this table, and the removed machine `apply` route may have written to it. Export the rows first if they matter:
   ```bash
   docker exec -it <postgres-container> psql -U <db-user> -d shared_lists -c 'SELECT count(*) FROM "ItemUpdateLog";'
   ```
2. Build the one-off container from the `builder` stage (it reads `.env` and joins `stack_default`):
   ```bash
   docker compose build tools
   ```
3. Apply the migration before `docker compose up`:
   ```bash
   docker compose run --rm tools bunx prisma migrate deploy
   ```
4. Set the new variables in `.env` (see `.env.local.example`), at least `SHARED_LISTS_API_TOKEN_OWNER_EMAIL`: without it every `/api/v1/*` call answers 403 and the NanoClaw bridge stops working. For the list agent add `ANTHROPIC_API_KEY` (or `ANTHROPIC_PROXY_URL`, see above), optionally `LIST_AGENT_MODEL` and `LIST_AGENT_DAILY_COMMAND_LIMIT`. Remove `SHARED_LISTS_MACHINE_TOKEN`; nothing reads it anymore. Then start the new version:
   ```bash
   docker compose up -d --build web
   ```
5. Check that the account addressed by the removed `scripts/migrate-user.ts` no longer accepts the default password that script set (the script stays in the public Git history). Try to sign in with it; if it works, change the password.
6. Create an agent access for Claude Code under `/settings/agents` and register the MCP server in Claude Code (see "Agent access" above).
7. Clean up old accounts in the same one-off container. First list what would be removed (dry run), then delete after typing the confirmation. `--apply` needs a terminal (`ssh -t`). Keep the account named in `SHARED_LISTS_API_TOKEN_OWNER_EMAIL`, or `/api/v1/*` answers 403 afterwards. Deleting an account also deletes the agent accesses it created:
   ```bash
   docker compose run --rm tools bun scripts/cleanup-accounts.ts --keep <email>,<email>
   docker compose run --rm tools bun scripts/cleanup-accounts.ts --keep <email>,<email> --apply
   ```
