# Real-Time Tarot AI

A multi-service demo for Assignment 4: a background worker polls weather + lunar
data, Supabase stores the latest city context and pushes realtime updates, and a
Next.js frontend produces a tarot reading personalized by the signed-in user.

```
Open-Meteo ─► Worker (Railway) ─► Supabase (Postgres + Realtime) ─► Next.js (Vercel)
```

## Repo layout

```
apps/web       Next.js frontend (Vercel)
apps/worker    Node.js polling worker (Railway)
supabase       schema.sql + seed.sql + RLS policies
```

## Quick start

1. Create a Supabase project, run `supabase/schema.sql` then `supabase/seed.sql`
   in the SQL editor, and verify Realtime is enabled for `public.live_context`.
2. Copy `.env.example` to `apps/web/.env.local` and `apps/worker/.env` and fill in
   the Supabase URL + keys.
3. Install and run:

   ```bash
   npm install
   npm run dev:web       # http://localhost:3000
   npm run dev:worker    # polls every POLL_INTERVAL_MINUTES
   ```

4. Sign up in the web app, set your city / zodiac / reading style. Within one
   poll cycle the dashboard will show live weather + lunar phase for your city,
   and "Draw a card" will create a context-aware reading.

## Deploy

- Web → Vercel. Set root directory to the repo root, use the included
  `vercel.json` or the defaults, and add `NEXT_PUBLIC_SUPABASE_URL` +
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Worker → Railway. New service, root directory `apps/worker`; the included
  `railway.toml` handles build + start. Add `NEXT_PUBLIC_SUPABASE_URL` and
  `SUPABASE_SERVICE_ROLE_KEY`.
- See [DEPLOYMENT_GUIDE.zh.md](./DEPLOYMENT_GUIDE.zh.md) for a step-by-step
  walkthrough in Chinese.

## Architecture doc

See [CLAUDE.md](./CLAUDE.md) for the full system design and the rationale behind
splitting `live_context` (mutable, realtime) from `context_history` (immutable
snapshots referenced by each reading).
