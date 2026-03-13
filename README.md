# Signal Deck

AI UX/UI and competitor intelligence workbench built with `Next.js 16`, `TypeScript`, `Tailwind CSS`, `Drizzle ORM`, `Supabase Auth`, and `Inngest`.

## What is implemented

- Dashboard with fixed watchfloor sections:
  - `New Since Last Visit`
  - `AI UX/UI`
  - `Competitor Watch`
  - `Industry Signals`
  - `Saved`
- Dense feed cards with:
  - mark read / unread
  - save / unsave
  - source jump-out
  - new / unread emphasis
- Filter bar for:
  - entity
  - tag
  - source type
  - unread-only
  - saved-only
- Control room pages for:
  - `Sources`
  - `Entities`
  - `Tags`
  - `Rules`
- Hybrid runtime:
  - no `DATABASE_URL` => demo mode with seeded content and cookie-backed read/save state
  - with `DATABASE_URL` => Postgres-backed admin + persistence
- Ingestion foundation for:
  - RSS / Atom
  - Website scraping
  - YouTube feed parsing
  - X via controllable RSS-compatible adapter
- Inngest scheduled fan-out skeleton for 30-minute source sync
- Invite-only Supabase Auth magic-link login for a single owner account

## Stack

- App: `Next.js App Router`
- Styling: `Tailwind CSS v4`
- Database: `Postgres + Drizzle ORM`
- Auth: `Supabase Auth`
- Jobs: `Inngest`
- Tests: `Vitest`

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Copy env template:

```bash
cp .env.example .env.local
```

3. Configure Postgres in `.env.local`:

```bash
DATABASE_URL=...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
INVITE_ALLOWLIST=you@company.com
INNGEST_EVENT_KEY=...
INNGEST_SIGNING_KEY=...
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Signal Deck
```

4. In Supabase Auth, add your local confirm URL to the allowed redirects:

```text
http://localhost:3000/auth/confirm
```

5. Initialize the database:

```bash
npm run db:push
npm run db:seed
```

6. Start the app:

```bash
npm run dev
```

`DATABASE_URL` is the intended local-development path. Without it, the dashboard can still render seeded preview data, but admin/settings editing stays read-only.

For a second machine, you can skip manual `.env.local` editing and run:

```bash
npm run setup:device
```

The script will prompt for `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and
`INVITE_ALLOWLIST`, write `.env.local`, and run `db:push`.

For personal-account login, configure Supabase Auth email, set the confirm redirect URL, and keep exactly one owner email in `INVITE_ALLOWLIST`.

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run test
npm run db:generate
npm run db:push
npm run db:migrate
npm run db:seed
```

## Notes

- This repo is DB-first. Treat the no-`DATABASE_URL` path as a preview fallback, not the primary workflow.
- Admin mutations, including source management, require `DATABASE_URL`.
- `X` support is implemented as a controllable adapter surface. For v1, the safest path is an RSS-compatible bridge.
- The scheduled ingestion route is ready at `/api/inngest`, and source sync now records `feed_items`, source links, tag links and `ingestion_runs` when Postgres is configured.

## Verification

Current repo status verified with:

```bash
npm run lint
npm run test
npm run build
```
