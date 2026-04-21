# AGENTS

## Repo Structure

- `apps/web`: Next.js frontend deployed to Vercel
- `apps/worker`: polling worker deployed to Railway
- `supabase`: schema and seed SQL

## Working Rules

- Keep the architecture aligned with Assignment 4:
  - external API polling
  - background worker
  - Supabase database + Realtime
  - Next.js frontend
  - auth and personalization
- Prefer small, reviewable commits by subsystem.
- Treat `live_context` as the realtime table and `context_history` as immutable history.
- Do not move reading generation logic into the worker. The worker owns context ingestion only.

