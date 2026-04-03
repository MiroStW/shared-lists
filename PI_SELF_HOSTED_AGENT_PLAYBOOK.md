# Shared Lists: Pi Self-Hosted + Agent Integration Playbook

This document is the implementation plan for transforming `shared-lists` in two directions:

1. remove Firebase completely and run the app fully on Miro's Raspberry Pi
2. add a safe integration so NanoClaw can update list items, including matching spoken grocery items to existing entries even when wording differs

The intended audience is an agent working in this repository. The goal is to make the work executable step by step without needing to reconstruct context from chat history.

## Scope

In scope:

- finish the existing migration from Firebase to Prisma/Postgres/NextAuth
- self-host the app and database on the Pi
- migrate existing Firebase data into Postgres
- add a narrow machine-facing API for controlled item updates
- add item normalization, aliases, and fuzzy matching for grocery workflows
- integrate NanoClaw through a host-side bridge, not direct database access

Out of scope for the first pass:

- multi-tenant SaaS behavior
- perfect real-time sync on day one
- generic LLM write access to the database
- exposing raw database credentials to NanoClaw containers

## Current Repo State

This repository is already mid-migration. Treat the current uncommitted Prisma/NextAuth work as the baseline, not the old Firebase architecture.

Observed state:

- Firebase-era docs and deploy scripts still exist in `README.md`, `firebase.json`, `.github/workflows/firebase-hosting-*.yml`, and `src/functions/*`
- Prisma schema exists in `prisma/schema.prisma`
- Prisma client wiring exists in `src/db/prisma.ts`
- NextAuth credentials auth exists in `src/auth/authOptions.ts` and `src/app/api/auth/[...nextauth]/route.ts`
- list, item, section, invite, register, and user-exists routes exist under `src/app/api/*`
- a Firebase-to-Postgres migration script exists in `scripts/migrate-data.js`
- the UI has already been partially adapted away from Firestore subscriptions toward fetch-based APIs

Important constraint:

- the git worktree is dirty. Do not revert unrelated user changes. Work with the current changes unless the user explicitly asks otherwise.

Important local repo convention:

- `.agent/rules/always_use_bun.md` says to use `bun` instead of `npm`, `pnpm`, or `yarn`

## Target Architecture

Final target architecture:

- `Next.js` app running on the Pi
- `PostgreSQL` running on the Pi
- `Prisma` as the only application data layer
- `NextAuth` for authentication
- reverse proxy on the Pi via `Caddy` or `nginx`
- optional SMTP for invite emails
- NanoClaw integration through a narrow authenticated app API

Recommended runtime layout on the Pi:

- `shared-lists-web`
- `shared-lists-db`
- `shared-lists-proxy`
- persistent Postgres volume
- daily database backup to NAS or Nextcloud

## Default Decisions

Unless the user says otherwise, make these assumptions:

- database: local Postgres on the Pi, not SQLite
- process model: Docker Compose on the Pi
- reverse proxy: Caddy
- auth: email/password via NextAuth credentials provider
- invite flow: internal app route plus SMTP email if SMTP is configured
- real-time behavior: polling or explicit refresh first, SSE later if needed
- list automation target: grocery list first

## Global Rules For The Agent

1. Do not reset or discard unrelated local changes.
2. Build on the existing Prisma migration instead of starting over.
3. Prefer small, verifiable steps that leave the app runnable.
4. Keep secrets out of the repo. Add examples and docs, never real values.
5. Do not give NanoClaw direct Postgres credentials.
6. Use `bun` for install, build, and local commands unless forced otherwise by a tool.

## Phase 1: Finish The Backend Migration Off Firebase

This is the current priority.

### Goal

Make the app run locally and on the Pi without any Firebase dependency in runtime, deployment, or core product behavior.

### Definition Of Done

Phase 1 is done when all of the following are true:

- app starts without Firebase config or Firebase services
- auth works with NextAuth and Prisma
- list, section, item, and invite flows work through app routes and Postgres
- no production path depends on Firestore, Firebase Auth, Firebase Hosting, or Firebase Functions
- Firebase packages and files are removed unless required only for the one-time migration script
- docs explain local and Pi setup for the new stack

### Step 1.1: Stabilize The Working Baseline

Actions:

1. inspect `git status --short` and preserve unrelated edits
2. confirm the repo installs and builds from the current branch state
3. document any failing routes or compile errors before broad cleanup

Commands:

```bash
bun install
bun run build
```

If the build fails, fix only what is required for the Postgres/NextAuth path to compile. Do not attempt a broad refactor before the app is stable.

### Step 1.2: Clean The Dependency And Script Surface

Files to inspect:

- `package.json`
- `bun.lockb`
- `firebase.json`
- `.github/workflows/firebase-hosting-merge.yml`
- `.github/workflows/firebase-hosting-pull-request.yml`
- `README.md`

Actions:

1. remove Firebase deploy scripts once they are no longer needed
2. remove Firebase runtime dependencies after code paths are gone:
   - `firebase`
   - `firebase-admin`
   - `firebase-functions`
   - `firebase-tools`
   - `@google-cloud/functions-framework`
3. add scripts for the self-hosted stack, for example:
   - `db:generate`
   - `db:migrate`
   - `db:push` if useful in development
   - `db:studio`
4. replace Firebase hosting workflow files with either:
   - no CI deploy yet, or
   - a generic build workflow

Recommended `package.json` direction:

- keep `dev`, `build`, `start`, `lint`
- add Prisma scripts using `bunx prisma ...`
- remove `emulate` and `deploy` once obsolete

### Step 1.3: Finish Environment Variable Hygiene

Files to inspect:

- `.env.local.example`
- `.env.local`
- `.env`
- `src/db/prisma.ts`
- `src/auth/authOptions.ts`
- `next.config.js`

Actions:

1. define the required env vars in an example file
2. remove Firebase-specific env assumptions from app runtime
3. document these required variables:

```text
DATABASE_URL=
NEXTAUTH_URL=
NEXTAUTH_SECRET=
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

4. remove the hardcoded `FIREBASE_PROJECT_ID` from `next.config.js` unless still needed temporarily for migration tooling
5. verify Prisma uses `DATABASE_URL` only

### Step 1.4: Audit And Finish Core CRUD Behavior

Files to inspect closely:

- `src/app/api/lists/route.ts`
- `src/app/api/lists/[id]/route.ts`
- `src/app/api/lists/[id]/items/route.ts`
- `src/app/api/items/[id]/route.ts`
- `src/app/api/lists/[id]/sections/route.ts`
- `src/app/api/sections/route.ts`
- `src/app/api/sections/[id]/route.ts`
- `src/app/api/invites/route.ts`
- `src/app/api/invites/[id]/accept/route.ts`

Actions:

1. verify all routes enforce ownership or contributor access correctly
2. verify create, rename, delete, reorder, and completion toggling all work through Prisma
3. remove any remaining assumptions carried over from Firestore document shapes
4. make sure route responses are consistent enough for the client
5. add server-side validation where currently missing

Specific checks:

- items must support moving between root list and section
- reorder route must persist order deterministically
- list ownership checks must not rely on old `authorizedUsers` logic
- invites must work even without Firebase-triggered email functions

### Step 1.5: Replace The Old Invite Email Path

Current issue:

- old invite email sending lives in `src/functions/sendEmail.js` and depends on Firebase triggers
- new invite route creates invite records but does not currently replace the trigger behavior

Recommended path:

1. move email sending into app-side code or a server-only utility, for example `src/server/sendInviteEmail.ts`
2. after creating an invite in `src/app/api/invites/route.ts`, send the email directly if SMTP is configured
3. if SMTP is missing, still create the invite and return the join URL so the UI can show/copy it

Acceptance criteria:

- sharing a list no longer depends on Firebase Functions
- the system degrades gracefully if email is not configured

### Step 1.6: Finalize Auth Migration

Files to inspect:

- `src/auth/authOptions.ts`
- `src/auth/getServerSession.ts`
- `src/app/sessionContext.tsx`
- `src/app/signin/*`
- `src/app/SignOutBtn.tsx`
- `src/app/(app)/header/UserMenu.tsx`

Actions:

1. verify sign-up, sign-in, sign-out, and session hydration work with NextAuth only
2. remove all remaining Firebase UI or Google popup assumptions unless deliberately re-added later
3. ensure credentials auth handles bad passwords and unknown emails cleanly
4. ensure `session.user.id` is always present in server routes

Important migration note:

- Firebase Auth users cannot simply bring their passwords over. For migrated users, choose one of these:
  - force password reset flow
  - set temporary passwords and ask users to change them
  - keep only email identity and have the user re-register

If this app is effectively personal/family use, a pragmatic temporary-password or manual reset path is acceptable.

### Step 1.7: Replace Firestore Live Updates Pragmatically

Files to inspect:

- `src/app/(app)/listsContext.tsx`
- `src/app/(app)/lists/[id]/itemsContext.tsx`
- `src/app/(app)/lists/[id]/items/*`

Current direction:

- the old Firestore subscription model has already been replaced with route fetching plus `refreshItems()`

Recommended first version:

1. keep fetch-based behavior
2. use optimistic updates where already present
3. add explicit refresh after mutations
4. add polling only if needed

Do not block Phase 1 on real-time transport.

If later needed, add one of:

- short polling
- Server-Sent Events
- websockets

### Step 1.8: Remove Firebase Files Once Migration Is Complete

Delete or archive after the app runs fully without them:

- `src/firebase/*`
- `src/db/useDb.ts`
- `src/db/firestoreConverter.ts`
- `src/db/firestore.rules`
- `src/db/firestore.indexes.json`
- `src/functions/firebaseFunctions.js`
- `src/functions/addAuthorizedUser.js`
- `src/functions/recursiveDelete.js`
- `src/functions/dataMigrations.js`

Keep only what is required for one-time migration, ideally under `scripts/`.

If `scripts/migrate-data.js` still depends on `firebase-admin`, that is acceptable temporarily. Keep that script isolated and document that it is not part of runtime.

### Step 1.9: Harden The Data Migration Script

File to inspect:

- `scripts/migrate-data.js`

Actions:

1. make the script idempotent
2. clearly document required credentials and inputs
3. make it log counts for:
   - users
   - lists
   - sections
   - items
   - invites
4. ensure it handles missing timestamps safely
5. decide how to treat Firebase Auth users without password hashes

Recommended additions:

- dry-run mode
- summary output
- failure exit code

### Step 1.10: Add Minimal Regression Coverage

Add tests for the highest-risk paths:

- auth credentials flow
- `GET/POST /api/lists`
- `GET/POST /api/lists/[id]/items`
- `PATCH/DELETE /api/items/[id]`
- invite creation and acceptance
- access control for owner vs contributor vs outsider

If no test harness exists yet, start with route-level integration tests around the app API.

### Step 1.11: Rewrite The README For The New Reality

`README.md` currently describes a Firebase app. Replace it with:

- what the app does now
- how to run it locally with Postgres
- how to run migrations
- how to seed or import Firebase data
- how to deploy on the Pi

Do not leave Firebase setup as the main getting-started path.

### Phase 1 Final Acceptance Checklist

Before moving to Phase 2, verify all items below manually:

- `bun run build` passes
- app boots locally with Postgres
- registration works
- sign-in works
- create list works
- create section works
- create item works
- rename item works
- complete item works
- reorder works
- share invite works without Firebase Functions
- no runtime import from Firebase remains in app code

## Phase 2: Deploy Fully On The Raspberry Pi

### Goal

Run the complete app stack on the Pi with persistence, restart behavior, and backups.

### Recommended Layout

On the Pi, use a deployment directory like:

```text
/home/miro/stack/shared-lists/
```

Recommended contents:

```text
docker-compose.yml
.env
caddy/
backups/
```

### Step 2.1: Containerize The App

Add:

- `Dockerfile`
- optional `.dockerignore`
- optional `docker-compose.yml` in the repo or a deployment example file

Services:

- `web`
- `db`
- `proxy`

Requirements:

- persistent Postgres volume
- app container runs `prisma migrate deploy` before start, or migrations are run as a separate deploy step
- reverse proxy terminates TLS

### Step 2.2: Configure Runtime Env On The Pi

Required secrets on the Pi:

```text
DATABASE_URL=
NEXTAUTH_URL=
NEXTAUTH_SECRET=
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

Never commit real values.

### Step 2.3: Add Backup And Recovery

Minimum requirement:

- nightly `pg_dump`
- store backups outside the Postgres volume
- document restore steps

### Step 2.4: Do A Controlled Cutover

Cutover sequence:

1. freeze or reduce writes to Firebase if possible
2. run final migration from Firebase to Postgres
3. compare counts between source and target
4. test real user flows on the Pi deployment
5. switch DNS or reverse proxy to the Pi-hosted app
6. keep Firebase data for rollback until confidence is high

## Phase 3: Add A Narrow Machine API For List Updates

### Goal

Give NanoClaw a safe, explicit interface to update list items without direct database access.

### Design Rule

NanoClaw must call a narrow authenticated app API. It must not:

- connect directly to Postgres
- run arbitrary SQL
- receive database credentials in the container

### Recommended New Server Modules

- `src/server/itemMatching.ts`
- `src/server/itemNormalization.ts`
- `src/server/machineAuth.ts`
- `src/app/api/machine/lists/[id]/resolve/route.ts`
- `src/app/api/machine/lists/[id]/apply/route.ts`

### Step 3.1: Add Machine Authentication

Add a service token auth check for internal machine routes, for example:

```text
SHARED_LISTS_MACHINE_TOKEN=
```

The token should live only on the Pi host and in host-side NanoClaw config.

### Step 3.2: Add Resolve Endpoint

Purpose:

- accept raw candidate names such as `coriander`, `Koriander`, `cilantro`
- return best matches from an existing list with confidence and rationale

Suggested request shape:

```json
{
  "items": ["coriander", "edamame", "peanut butter"]
}
```

Suggested response shape:

```json
{
  "results": [
    {
      "query": "coriander",
      "matchType": "alias",
      "confidence": 0.97,
      "existingItemId": "item_123",
      "existingName": "coriander fresh"
    }
  ]
}
```

### Step 3.3: Add Apply Endpoint

Purpose:

- reopen matching items by setting `completed = false`
- create new unchecked items when no reliable match exists
- optionally attach aliases after confirmed matches

Suggested request shape:

```json
{
  "operations": [
    {
      "type": "reopen",
      "itemId": "item_123",
      "query": "Koriander"
    },
    {
      "type": "create",
      "name": "edamame"
    }
  ]
}
```

Return a summary payload suitable for NanoClaw to report back to the user.

## Phase 4: Add Item Matching, Normalization, And Learning

### Goal

Make grocery updates robust against:

- spelling variants
- singular/plural differences
- English/German variants
- slightly different descriptive names

### Schema Changes

Add to Prisma:

1. normalized field on `Item`
2. optional alias table
3. optional audit log

Suggested models:

```prisma
model ItemAlias {
  id          String   @id @default(cuid())
  itemId       String
  alias        String
  normalized   String
  locale       String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  item Item @relation(fields: [itemId], references: [id], onDelete: Cascade)

  @@unique([itemId, normalized])
}

model ItemUpdateLog {
  id             String   @id @default(cuid())
  listId          String
  itemId          String?
  source          String
  action          String
  rawInput        String
  normalizedInput String
  matchConfidence Float?
  createdAt       DateTime @default(now())
}
```

### Matching Strategy

Use this order:

1. exact normalized match against item names
2. exact normalized match against aliases
3. fuzzy match using trigram or string similarity
4. LLM tie-break only when candidates are close and confidence is not clear

Normalization rules should include:

- lowercase
- trim
- collapse whitespace
- strip punctuation where safe
- normalize umlauts and accents
- map known bilingual variants where useful

Examples to encode early:

- `koriander` -> `coriander`
- `erdnussbutter` -> `peanut butter`
- `frühlingszwiebeln` -> `spring onions`

Do not overfit too early. Start with a small alias table and expand from observed usage.

### Matching Safety Rules

Auto-apply only when confidence is high.

If confidence is ambiguous:

- ask NanoClaw to clarify, or
- create a new unchecked item but report the uncertainty

The system must avoid silently reopening the wrong item.

## Phase 5: Integrate NanoClaw

This work belongs in the NanoClaw repo, but it depends on the machine API above.

Relevant local reference repo:

```text
/Users/mirowilms/Documents/2nd-brain/projects/home_automation/nanoclaw-code
```

### Design Rules

1. NanoClaw gets a host-side bridge, not direct DB access.
2. The machine token stays on the host side.
3. Voice transcription is allowed.
4. High-confidence grocery updates may auto-apply.
5. Ambiguous updates should ask for clarification.

### Recommended NanoClaw Changes

Add host-side modules similar to other bridge patterns:

- `src/shared-lists-config.ts`
- `src/shared-lists-bridge.ts`
- optional approval integration if you decide some writes should require explicit approval

The current preferred behavior for grocery reopening is:

- no separate approval for high-confidence reopen/create in the dedicated grocery workflow
- user-visible summary message after the change
- keep an audit trail in the shared-lists app

### Suggested NanoClaw Flow

1. user sends a voice note such as:
   - `we need coriander, edamame, and more peanut butter`
2. NanoClaw transcribes audio
3. NanoClaw extracts candidate grocery items
4. NanoClaw calls the shared-lists resolve endpoint
5. NanoClaw decides:
   - high confidence -> apply automatically
   - ambiguous -> ask follow-up
6. NanoClaw calls the apply endpoint
7. NanoClaw replies with a concise summary:
   - reopened `coriander fresh`
   - created `edamame`
   - reopened `spread - peanut butter`

### Suggested Initial Scope

Do not start with arbitrary list selection.

First version should:

- target one configured grocery list ID
- support only reopen existing or create new unchecked items
- avoid destructive operations

## Phase 6: Rollout Sequence

Use this exact order.

1. finish Phase 1 in this repo
2. run local verification
3. deploy self-hosted stack to the Pi
4. run Firebase import into Postgres
5. verify real user flows on the Pi
6. add machine API and matching layer
7. add NanoClaw bridge
8. test text-only updates first
9. test voice-note updates second
10. only then switch habitual grocery capture to NanoClaw

## Concrete Work Backlog

Use this as the execution backlog.

### Backend Migration Backlog

- make the current Prisma/NextAuth branch build cleanly
- remove Firebase runtime imports from app code
- replace invite trigger with app-side email or share-link fallback
- remove obsolete Firebase routes, files, and scripts
- update `package.json` scripts for Prisma
- update README and env examples
- add minimal route/integration tests

### Pi Deployment Backlog

- add Dockerfile
- add compose example
- add backup instructions
- document reverse proxy config
- document one-time cutover from Firebase

### Agent Update Backlog

- add item normalization
- add `ItemAlias` support
- add machine auth
- add resolve endpoint
- add apply endpoint
- add audit logging

### NanoClaw Backlog

- add shared-lists host bridge
- configure machine token on host
- add grocery workflow prompt/instructions
- test text update path
- test voice transcription path

## Verification Checklist For The Agent

Before marking the project complete, verify:

- no app runtime path depends on Firebase
- the Pi deployment runs the full stack
- data imported successfully from Firebase
- NanoClaw can reopen an existing item with a differently worded phrase
- NanoClaw can create a missing item
- ambiguous matches do not silently update the wrong item

## Suggested File Touch Order

Use roughly this order to reduce churn:

1. `package.json`
2. `next.config.js`
3. auth and Prisma server files
4. API route fixes
5. invite email replacement
6. Firebase file cleanup
7. README and env examples
8. Docker and deployment files
9. Prisma schema additions for aliases and logs
10. machine API routes

## Final Notes

Do not try to perfect everything at once.

The right first milestone is:

- `shared-lists` runs fully on the Pi without Firebase
- the grocery list can be updated safely by NanoClaw through a narrow internal API

Everything after that is refinement.
