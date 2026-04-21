# Real-Time Tarot AI

## Project Purpose

Build a real-time tarot reading app that combines tarot card symbolism with live environmental context. The system uses a background worker to ingest weather and lunar data, stores normalized snapshots in Supabase, and pushes updates to a realtime Next.js frontend.

The tarot theme is the product wrapper. The grading focus is the system design:

- external data ingestion
- background worker processing
- Supabase storage and auth
- realtime frontend updates
- user personalization

## Core Product Flow

1. A user signs up and creates a profile with `city`, `zodiac_sign`, and `reading_style`.
2. A worker periodically fetches weather and lunar data for active cities.
3. The worker normalizes the response and upserts the latest city snapshot into `live_context`.
4. The worker also appends each fetch into `context_history`.
5. Supabase Realtime broadcasts `live_context` changes to subscribed frontend clients.
6. The user draws tarot cards and the app generates a context-aware interpretation using:
   - tarot card meanings
   - latest city context
   - user zodiac sign
   - selected reading style
7. The final reading is stored in `readings` so the user can revisit it later.

## Architecture Overview

### Monorepo Layout

- `apps/web`: Next.js frontend deployed to Vercel
- `apps/worker`: Node.js polling worker deployed to Railway
- `supabase`: SQL schema, policies, and future seed files

### Frontend

- `Next.js`
- `Supabase Auth`
- `Supabase JS client`
- `Supabase Realtime`
- `Tailwind CSS`

Responsibilities:

- auth and session handling
- profile setup and editing
- dashboard with live context panel
- tarot draw UI
- readings history UI
- realtime subscription to `live_context`

### Worker

- `Node.js` + `TypeScript`
- deployed separately, for example on Railway

Responsibilities:

- find active cities from user profiles
- fetch weather data
- compute or fetch lunar phase
- derive a lightweight `zodiac_context_tag`
- upsert latest context
- persist history snapshots

The worker should write with the Supabase service role key, not the browser anon key.

### Database

- `Supabase Postgres`
- `Supabase Auth`
- `Supabase Realtime`

## Data Flow

External APIs -> Worker -> `live_context` + `context_history` -> Supabase Realtime -> Next.js dashboard

User Auth -> `profiles`

User Draw Action -> `tarot_cards` + latest `live_context` + `profiles` -> interpretation logic -> `readings`

## Realtime Design

Realtime is required on `live_context`.

Expected UX:

- the dashboard subscribes to the current user's city row
- when the worker updates that city, the context panel refreshes without a page reload

`readings` realtime is optional. It can be added later if the app wants to stream newly created readings into history automatically.

## Personalization Model

Each user can customize:

- city
- zodiac sign
- reading style

These settings influence:

- which `live_context` row is read
- which cosmic tone is displayed
- how the final interpretation is worded

## Reading Generation Strategy

Start with a template-based system.

Inputs:

- spread type
- selected tarot cards
- upright or reversed state
- base tarot meanings
- current weather label
- lunar phase
- zodiac sign
- reading style

Output:

- a short interpretation paragraph
- optional keywords or advice sentence

LLM generation is a stretch goal, not the MVP dependency.

## Database Tables

Required tables:

- `profiles`
- `live_context`
- `context_history`
- `tarot_cards`
- `readings`
- `saved_readings`

Important modeling choice:

- `live_context` stores only the latest snapshot per city
- `context_history` stores immutable historical records
- `readings` should reference a historical snapshot, not only the mutable live row

## Auth and Authorization

Use Supabase Auth for sign-up and login.

Recommended policy model:

- users can read and update their own `profiles`
- users can read and create their own `readings`
- users can read and manage their own `saved_readings`
- authenticated users can read shared reference tables like `tarot_cards` and `live_context`
- worker writes happen through the service role and bypass normal RLS restrictions

## Worker Polling Logic

Suggested interval: every 10 minutes.

Polling loop:

1. Query distinct active cities from `profiles`.
2. For each city, fetch current weather.
3. Compute or fetch the current lunar phase.
4. Generate a normalized label set:
   - `weather_label`
   - `lunar_phase`
   - `zodiac_context_tag`
5. Upsert the latest row in `live_context`.
6. Insert the same snapshot into `context_history`.

## Deployment Setup

### Web

- deploy Next.js app to Vercel

### Worker

- deploy polling worker to Railway

### Database

- Supabase project for Auth, Postgres, and Realtime

### Local Environment

- keep browser-safe keys in `apps/web`
- keep service role secrets in `apps/worker`
- mirror required variables in local `.env.local` and deployment dashboards

## MVP Definition

The minimum viable submission should include:

- sign up and login
- editable user profile
- one city per user
- weather plus lunar phase ingestion
- worker-based periodic updates
- realtime dashboard context updates
- single-card tarot draw
- context-aware reading generation
- reading history
- deployed frontend and worker

## Non-Goals for MVP

Do not prioritize these before the core system works:

- complex astrology API integrations
- animated tarot spreads
- multi-card drag interactions
- agent chat interface
- notifications
- multilingual support

## Environment Variables

Expected environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPEN_METEO_GEOCODING_BASE_URL`
- `OPEN_METEO_BASE_URL`
- `LUNAR_API_BASE_URL` or internal lunar calculator config

## Assignment Alignment Checklist

- monorepo with `apps/web` and `apps/worker`
- Next.js + Tailwind frontend
- Railway worker polling external data
- Supabase for auth, database, and realtime
- personalized user experience through profile preferences
- CLAUDE.md as architecture blueprint
- deployable split across Vercel and Railway

## Notes for Future Development

- If horoscope APIs are unreliable, keep zodiac context rule-based.
- If multiple cities per user are added later, split city preferences into a separate table.
- If readings become more complex, store richer structured card data in `cards_drawn` JSON.
