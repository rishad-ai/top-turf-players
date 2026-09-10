# TOP Turf Players

A daily 7-a-side football matchday PWA — scores, streaks, rankings, and match history for a ~30-35 member football group.

## Stack

- **Next.js 16** (App Router, TypeScript) — pinned to `16.3.4` (stable). See the note below on why the version is pinned rather than left floating.
- **Tailwind CSS v4** for styling (custom football-pitch design tokens in `src/app/globals.css`)
- **Drizzle ORM + PostgreSQL** (plain `pg`/node-postgres driver) for the database
- **Vercel Blob** for player photo uploads in production (local filesystem fallback for dev)
- **Self-hosted fonts** via `@fontsource` (Space Grotesk for display, Inter for body)
- Hand-written service worker for PWA/offline support (no `next-pwa` dependency)

## Deploying to Vercel

This app is built to deploy directly on Vercel with minimal setup:

1. **Push this repo to GitHub/GitLab/Bitbucket** and import it into a new Vercel project
   (or run `vercel` from this directory with the Vercel CLI).

2. **Add Postgres.** In the Vercel dashboard → your project → **Storage** → **Create Database**
   → choose **Neon** (Vercel's native Postgres integration). This automatically sets a
   `DATABASE_URL` (or `POSTGRES_URL`) environment variable on your project — no manual copying needed.

3. **Add Blob storage.** Same **Storage** tab → **Create** → **Blob**. This automatically sets
   `BLOB_READ_WRITE_TOKEN`. Without this, player photo uploads will fail in production (there's
   no writable local disk on Vercel's serverless functions).

4. **Set the remaining environment variables** (Project → Settings → Environment Variables):
   ```
   SESSION_SECRET=<a long random string - generate with `openssl rand -base64 32`>
   SEED_ADMIN_USERNAME=admin
   SEED_ADMIN_PASSWORD=<a real password, not the repo default>
   ```

5. **Run the database migration against production** before (or right after) your first deploy.
   The easiest way: pull the production env vars locally and run the migration from your machine:
   ```bash
   vercel env pull .env.production.local
   npx dotenv -e .env.production.local -- npx drizzle-kit migrate
   ```
   (Or use `vercel env pull .env.local` if you want the same file `drizzle.config.ts` already reads.)
   You only need to do this once initially, and again each time `src/db/schema.ts` changes
   (generate a new migration with `npm run db:generate` first, commit it, then run `db:migrate`
   against production the same way).

6. **Seed the first admin user** the same way, once:
   ```bash
   npx dotenv -e .env.production.local -- npx tsx src/db/seed.ts
   ```

7. **Deploy.** Vercel builds with `npm run build` automatically. The proxy/middleware
   (`src/proxy.ts`, protecting `/admin/*`) runs on Vercel's Node.js runtime automatically —
   no special config needed.

After that, everything else (dashboard, players, matches, rankings) is public/read-only exactly
as built; only `/admin` requires the login you seeded in step 6.

### Why the Next.js version is pinned

While building this, I found that Next.js 16.3.4's dev server (`next dev`) fails to set the
correct HTTP 404 status when `notFound()` is called after an `await` inside an async Server
Component **if that route (or any ancestor route) has a `loading.tsx` file**. It's a genuine,
reproducible framework issue in the dev server specifically — confirmed absent in the
**production** build (`next build` + `next start`, which is what Vercel actually runs), so it
doesn't affect the deployed app. Still, to avoid the issue affecting local development and to
avoid any risk from an unpinned version drifting to something worse, the version is pinned in
`package.json` rather than left as a floating range. If you upgrade Next.js later, re-test that
`/players/[id]` and `/matches/[id]` correctly return 404 for a nonexistent ID in production mode
before trusting a newer version.

As a related consequence: **`loading.tsx` files were removed from every route that calls
(or has a descendant that calls) `notFound()`** — that's `/`, `/players`, `/players/[id]`,
`/matches`, and `/matches/[id]`. Only `/rankings/loading.tsx` remains, since that route has no
dynamic not-found logic. This was a deliberate trade: correct HTTP status codes over loading
skeletons on those five routes. If Next.js fixes the underlying streaming/Suspense interaction
in a future version, loading states can be safely reintroduced there.

## Local development

```bash
npm install

# Run a local Postgres (any method works - Docker, a local install, whatever you have).
# Then create .env.local:
cp .env.local.example .env.local
# and edit DATABASE_URL to point at your local Postgres.

npm run db:migrate   # create tables
npm run db:seed      # create the first admin user (admin / changeme123 by default)
npm run dev
```

Open http://localhost:3000. Player photo uploads fall back to writing into `/public/uploads`
locally (no Blob token needed for local dev) — this only happens automatically when
`BLOB_READ_WRITE_TOKEN` isn't set.

### Environment variables (`.env.local`)

```
DATABASE_URL=postgresql://user:password@localhost:5432/your_db_name
SESSION_SECRET=replace-this-with-a-long-random-string-in-production
SEED_ADMIN_USERNAME=admin
SEED_ADMIN_PASSWORD=changeme123
```

**Change `SESSION_SECRET` and `SEED_ADMIN_PASSWORD` before deploying anywhere real.**

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Run the production build (`build` first) |
| `npm run db:generate` | Generate a new Drizzle migration after changing `src/db/schema.ts` |
| `npm run db:migrate` | Apply migrations to Postgres |
| `npm run db:seed` | Create the first admin user (safe to re-run — skips if the username already exists) |
| `npm run db:studio` | Open Drizzle Studio to browse the database |

Scripts that need the database (`db:*`, and the test scripts below) read `.env.local` via
Next.js automatically when run through `npm run`, but if you invoke `tsx` directly, pass
`--env-file=.env.local` (Node's native env-file flag) or they won't find `DATABASE_URL`:

```bash
npx tsx --env-file=.env.local scripts/test-match-service.ts
```

## Project structure

```
src/
  app/                    Routes (App Router)
    page.tsx              Dashboard (today's match, streaks, rankings snapshot)
    players/               Public player list + profile (stats, streaks, history)
    matches/               Public match history + detail (with search/filters)
    rankings/              Leaderboards (wins, goals, win %, streaks)
    admin/                 Login-gated: player & match management
    api/                    REST-ish API routes backing all of the above
  components/              UI components, grouped by domain (players, matches, dashboard, layout, ui)
  lib/                     Business logic — kept separate from UI per project rules
    matchValidation.ts     All the "CRITICAL RULE" validation from the spec
    matchService.ts        Transactional match create/update/delete (Postgres transactions)
    stats.ts                Win/loss/draw/goals/win% calculated from match history
    streaks.ts               Winning streak + regular/irregular losing streak engines
    dashboard.ts             Aggregates match + stats + streaks for the homepage
  db/
    schema.ts               Drizzle schema (players, matches, match_players, goals, admin_users)
    index.ts                 Postgres connection (node-postgres Pool)
scripts/
  test-*.ts                Standalone test scripts (run with `npx tsx --env-file=.env.local scripts/<file>.ts`)
                             covering match validation, stats, and streak calculations
                             against the exact examples from the product spec.
public/
  manifest.json, sw.js, icons/, offline.html    PWA assets
```

## Testing

There's no test runner wired up (Jest/Vitest) — the test scripts in `scripts/` are
standalone Node scripts that exercise the business logic directly against a real Postgres
database and assert against the spec's exact examples (including the tricky calendar-day
losing-streak rules). They truncate their own tables at the start, so they're safe to run
against your dev database (re-run `npm run db:seed` afterward to get your admin user back —
the scripts don't touch `admin_users`, but a fresh `TRUNCATE ... admin_users` at the start of
`test-streaks-db.ts` and `test-match-service.ts` does clear it).

```bash
npx tsx --env-file=.env.local scripts/test-match-service.ts
npx tsx --env-file=.env.local scripts/test-stats-engine.ts
npx tsx --env-file=.env.local scripts/test-streaks-pure.ts   # no DB needed, but still reads env at import time
npx tsx --env-file=.env.local scripts/test-streaks-db.ts
```

All 74 assertions across these four scripts currently pass.

## Known limitations / things to revisit

- **No self-service admin password change yet** — the only way to rotate credentials today is
  re-running the seed script with different env vars after deleting the existing row, or adding
  a small admin settings page.
- **PWA install testing**: manifest, icons, and service worker are all in place and individually
  verified (valid manifest JSON, correct icon sizes including a maskable variant, service worker
  passes a syntax check and registers with a sensible network-first-for-navigation /
  cache-first-for-assets strategy), but an actual "Add to Home Screen" test on a real device is
  worth doing before launch — this was built in an environment with no headless browser available
  to automate that check.
- **Timezone**: "today" (used for the dashboard's today's-match check and the streak engine's day
  boundaries) is computed from the server's clock in UTC. Vercel's serverless functions run in
  UTC by default; if the group's actual match time causes an off-by-one-day issue around
  midnight in their local timezone, that's worth revisiting (either by explicitly converting to
  the group's timezone in `src/lib/dashboard.ts` and `src/lib/streaks.ts`, or setting a
  `TZ` environment variable).
