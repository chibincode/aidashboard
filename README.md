# Signal Deck

AI UX/UI and competitor intelligence workbench built with `Next.js 16`, `TypeScript`, `Tailwind CSS`, `Drizzle ORM`, `Auth.js`, and `Inngest`.

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
- Invite-only Auth.js email login scaffold using Resend

## Stack

- App: `Next.js App Router`
- Styling: `Tailwind CSS v4`
- Database: `Postgres + Drizzle ORM`
- Auth: `Auth.js`
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

3. Run the app in demo mode:

```bash
npm run dev
```

This works without a database. You can browse the dashboard and test read/save interactions immediately.

## Switch to live data mode

Set these values in `.env.local`:

```bash
DATABASE_URL=...
AUTH_SECRET=...
AUTH_TRUST_HOST=true
RESEND_API_KEY=...
AUTH_EMAIL_FROM=...
INVITE_ALLOWLIST=you@company.com,another@company.com
INNGEST_EVENT_KEY=...
INNGEST_SIGNING_KEY=...
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Signal Deck
```

Then initialize the database:

```bash
npm run db:push
npm run db:seed
```

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

- Demo mode is intentionally read-only for admin mutations. The control room UI is live, but create/edit/delete actions require `DATABASE_URL`.
- `X` support is implemented as a controllable adapter surface. For v1, the safest path is an RSS-compatible bridge.
- The scheduled ingestion route is ready at `/api/inngest`, and source sync now records `feed_items`, source links, tag links and `ingestion_runs` when Postgres is configured.

## Verification

Current repo status verified with:

```bash
npm run lint
npm run test
npm run build
```
