# trivia-nearby

Frontend for [trivianearby.com](https://trivianearby.com) — a mobile-first directory for finding nearby trivia events. React 19 + Vite + TypeScript + Tailwind v4.

- **Backend:** [`../trivia-backend/`](../trivia-backend) (Supabase + Node scrapers).
- **Operations / deployment:** see [`../trivia-backend/DEPLOYMENT.md`](../trivia-backend/DEPLOYMENT.md).
- **Architecture context:** see [`../ARCHITECTURE_REVIEW.md`](../ARCHITECTURE_REVIEW.md).

## Local development

```bash
pnpm install
cp .env.example .env.local    # fill in the values
pnpm dev                      # http://localhost:5173
```

Requires the Supabase project to already exist (the hosted one or a local `supabase start`). For a brand-new database, apply the migrations under `../supabase/migrations/` first — see [`../trivia-backend/OPERATIONS.md`](../trivia-backend/OPERATIONS.md).

### Environment variables

All frontend env vars are prefixed `VITE_` so Vite exposes them to the browser bundle. They are **not secret** — they ship to the client.

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key (public; RLS enforces access) |
| `VITE_GOOGLE_PLACES_API_KEY` | Google Places API key, used by the admin venue search. Restrict by HTTP referrer in the Google Cloud console. |

Backend-only keys (service role, SMTP, Google Places server-side key) live in [`../trivia-backend/.env.example`](../trivia-backend/.env.example).

## Scripts

```bash
pnpm dev            # Vite dev server
pnpm build          # typecheck + production build
pnpm preview        # serve the production build locally
pnpm lint           # ESLint
pnpm test           # Playwright (headless)
pnpm test:headed    # Playwright with browser visible
pnpm test:ui        # Playwright test UI
```

## Project layout

```
src/
  App.tsx                  landing page (location entry + trivia list)
  AppRouter.tsx            route map; see below
  main.tsx                 entry point
  context/
    auth_context.tsx       Supabase auth session + role state
    theme_context.tsx      dark/light mode (dark by default)
  components/              all UI components (flat; public + admin mixed)
  hooks/                   data-fetching hooks (useVenues, etc.)
  lib/                     supabase client
  utils/                   city coords, geolocation, image helpers
  types/                   shared TS types
public/                    static assets + PWA manifest + icons
tests/                     Playwright end-to-end tests
```

## Routes

Public:

- `/` — landing / location entry
- `/trivia-near-:location` — SEO route per city (e.g. `/trivia-near-nashville`)
- `/event/:eventId` — event detail
- `/beta` — PWA install instructions

Admin (behind `<AdminRoute>`):

- `/admin/login`, `/admin/register`, `/admin/forgot-password`, `/admin/reset-password`
- `/admin` — dashboard
- `/admin/venues`, `/admin/venues/search`, `/admin/venues/new`, `/admin/venues/my-venues`
- `/admin/venues/:venueId`, `/admin/venues/:venueId/detail`
- `/admin/events`, `/admin/events/new`, `/admin/events/:eventId`
- `/admin/schedule` — event-occurrence scheduler view
- `/admin/providers` — super-admin only

## Notes

- The Vite dev server proxies `/api/nominatim` and `/api/places` to external services (see `vite.config.ts`) so the frontend can hit them without CORS preflights in development.
- PWA icons live in `public/`; `vite.config.ts` wires the manifest.
- Auth currently has some hardcoded super-admin user IDs in `context/auth_context.tsx`; a rewrite is planned — see [`../ARCHITECTURE_REVIEW.md`](../ARCHITECTURE_REVIEW.md).
