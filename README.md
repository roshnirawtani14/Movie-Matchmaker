# Movie Night Matchmaker 🍿

Two people, two moods, one swipe deck. Partner A sets up tonight's vibe, shares a QR code,
Partner B joins independently, Gemini merges both preference profiles into a search brief, and
you both swipe through the same 30 titles (in different orders) until you match — with a direct
link to exactly where to stream it in India.

## Stack

- **Frontend**: React + Vite + TypeScript + Tailwind CSS v4 + Framer Motion (swipe gestures) + `qrcode.react`
- **Backend**: Supabase Postgres (data + Realtime sync between partners) + Supabase Edge Functions (Deno) for anything that needs a secret API key
- **External APIs**: Google Gemini for brief generation/refinement, TMDB for titles/metadata, RapidAPI "OTT details" for Indian OTT platforms

No login/accounts — each partner is identified by an anonymous id stored in their browser's
`localStorage`, scoped to that movie-night session.

## 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) and create a project (or use one you already have).
2. In **Project Settings → API**, copy the **Project URL** and **anon public key**.
3. Install the Supabase CLI (Windows: `scoop install supabase`, or see
   [supabase.com/docs/guides/cli](https://supabase.com/docs/guides/cli) — `npm i -g supabase` is
   intentionally blocked by the package itself).
4. From this project folder:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

`db push` runs [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql), which
creates all tables, enables Row Level Security with open policies (there's no auth layer — the
session id + partner id in localStorage *is* the access boundary), and turns on Realtime for the
`sessions`, `partners`, and `matches` tables.

## 2. Get the three external API keys

| Service | Where to get it | Used for |
|---|---|---|
| **Google Gemini** | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) | Merging both partners' preferences into a search brief, and refining it for round 2 |
| **TMDB** | [themoviedb.org](https://www.themoviedb.org/settings/api) → API → copy the **API Read Access Token (v4 auth)** | Titles, posters, ratings, runtime, synopses |
| **RapidAPI — OTT details** | [rapidapi.com/gox-ai-gox-ai-default/api/ott-details](https://rapidapi.com/gox-ai-gox-ai-default/api/ott-details) → Subscribe → copy your RapidAPI key | Which Indian OTT platforms a title is on right now, with direct links |

Set these as **Edge Function secrets** (never in frontend code or `.env` that ships to the browser):

```bash
supabase secrets set GEMINI_API_KEY=...
supabase secrets set TMDB_API_KEY=your-tmdb-v4-read-access-token
supabase secrets set RAPIDAPI_KEY=your-rapidapi-key
supabase secrets set RAPIDAPI_HOST=ott-details.p.rapidapi.com
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically into every Edge
Function by Supabase — you don't set those yourself.

## 3. Deploy the Edge Functions

```bash
supabase functions deploy start-matching
supabase functions deploy record-swipe
supabase functions deploy complete-round
```

- **`start-matching`** — runs once both partners submit preferences. Calls Gemini to build a
  search brief, then TMDB to pull the first pool of 30 titles.
- **`record-swipe`** — called on every swipe. Detects a mutual right-swipe and, the instant it
  happens, looks up Indian streaming platforms and writes the match — both screens pick it up via
  Realtime at the same moment.
- **`complete-round`** — called when a partner finishes their deck. Once both are done with no
  match: round 1 → Gemini refines the brief from what was actually liked and TMDB returns a fresh
  deduplicated pool of 30; round 2 → computes the top 5 by combined swipe score for the "you two
  decide" screen.

## 4. Configure and run the frontend

```bash
cp .env.example .env   # then fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

Open the printed local URL. To test the two-partner flow for real, open it on your phone too —
`vite.config.ts` is already set to `host: true`, so `npm run dev` also prints a `Network:` URL you
can open on a second device on the same Wi-Fi (needed anyway to actually scan the QR code from
one phone with another).

## How the flow maps to the code

| Step | Where |
|---|---|
| Partner A starts a session | [`src/pages/Home.tsx`](src/pages/Home.tsx) → `createSessionAsPartnerA` |
| Preference form (both partners) | [`src/pages/Preferences.tsx`](src/pages/Preferences.tsx) |
| QR + share-to-messaging-app | [`src/components/QRShare.tsx`](src/components/QRShare.tsx) (Web Share API with an image file, falls back to copy-link) |
| Partner B scans/joins | [`src/pages/Join.tsx`](src/pages/Join.tsx) |
| Waiting room / auto-advance | [`src/pages/Waiting.tsx`](src/pages/Waiting.tsx) |
| Brief + pool generation | `supabase/functions/start-matching` |
| Swipe deck (per-partner shuffle) | [`src/pages/Swipe.tsx`](src/pages/Swipe.tsx), [`src/components/SwipeDeck.tsx`](src/components/SwipeDeck.tsx), [`src/components/SwipeCard.tsx`](src/components/SwipeCard.tsx) |
| Match detection + streaming lookup | `supabase/functions/record-swipe` |
| Match reveal | [`src/pages/Match.tsx`](src/pages/Match.tsx) |
| Round 2 refinement / top-5 tiebreaker | `supabase/functions/complete-round` |
| Top-5 joint decision | [`src/pages/FinalPick.tsx`](src/pages/FinalPick.tsx) |
| Post-watch rating | [`src/pages/Rate.tsx`](src/pages/Rate.tsx) |
| History-based personalisation | `viewer_taste` table, written to on every swipe/match/rating, read by `start-matching` and `complete-round` via the brief prompts — an anonymous `viewer_id` in localStorage carries taste across sessions on the same browser without requiring a login |

## Known limitation: "IMDb rating"

There's no OMDb/IMDb API wired in. TMDB doesn't expose real IMDb scores, so the "minimum rating"
filter and the number shown on each card are **TMDB's own community rating** (same 0–10 scale,
generally very close to IMDb, but not the same underlying number). If you want the literal IMDb
score, add OMDb as another integration — `supabase/functions/_shared/tmdb.ts` is where the rating
is read off each title.

## Project structure

```
src/
  components/   SwipeCard, SwipeDeck, QRShare, PlatformLink, OptionPills, LoadingScene
  hooks/        useSession.ts — Realtime subscription to session/partners/match
  lib/          supabaseClient, api (all reads/writes + Edge Function calls), identity, types, shuffle
  pages/        Home, Join, Preferences, Waiting, Swipe, Match, FinalPick, Rate
supabase/
  migrations/   0001_init.sql — full schema, RLS policies, Realtime publication
  functions/    start-matching, record-swipe, complete-round, _shared/ (gemini, tmdb, streaming, cors, supabase client)
```
