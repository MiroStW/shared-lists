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

- `bun run lint` runs ESLint.
- `bun run e2e:install` installs the Playwright browser once. `bun run e2e` seeds data (see `.env.e2e.example`) and runs the end-to-end tests.

## Deployment

The app is deployed with `scripts/deploy.sh`, which syncs the repo to the deploy host and rebuilds the Docker Compose service there. It is reachable on the Tailnet only and is not exposed to the public internet.
