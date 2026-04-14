# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a trivia directory app for finding nearby trivia events. The project consists of:

- **Root directory**: Contains shared dependencies and project documentation
- **trivia-nearby/**: React + TypeScript + Vite application with dark theme support
- **trivia-backend/**: Node.js backend with Supabase integration and data scraping

The app is designed as a mobile-first web application that helps users find trivia events based on location.

### Current Status
- **Production URL**: https://trivianearby.com
- **Deployment**: Hetzner VPS (SSH alias `jtdev`, repo checkout at `/var/www/trivia/`). See [trivia-backend/DEPLOYMENT.md](trivia-backend/DEPLOYMENT.md).
- **Domain**: trivianearby.com (may expand to .co.uk depending on success)
- **Data Sources**: Hand-curated city seed JSONs (via `ingest/seed-city.ts`), plus per-provider importers for Challenge Entertainment, NerdyTalk, and BrainBlast. Automated scheduling has been intermittent — see `ARCHITECTURE_REVIEW.md` for current state and planned ingestion-harness work.

## Development Commands

All development commands should be run from the `trivia-nearby/` directory:

```bash
# Development server
pnpm dev

# Build for production
pnpm build

# Lint code
pnpm lint

# Preview production build
pnpm preview
```

## Architecture & Key Components

### Frontend Stack
- **React 19** with TypeScript
- **Vite** for build tooling and development server
- **Tailwind CSS v4** for styling
- **SWC** for fast React refresh
- **ESLint** with TypeScript and React configurations

### Project Structure
- `src/App.tsx`: Main application component with theme toggle
- `src/context/theme_context.tsx`: Theme management context (dark/light mode)
- `src/main.tsx`: Application entry point
- `src/index.css`: Global styles and Tailwind imports

### Theme System
The app uses a custom theme context that:
- Defaults to dark theme (as per PRD requirements)
- Persists theme preference in localStorage
- Sets `data-theme` attribute on document element
- Provides theme toggle functionality

### Backend Architecture (Active)
- **Supabase** with PostGIS for location-based queries
- **Database schema (active)**: `venues`, `events`, `event_occurrences`, `trivia_providers`, `api_usage_log`. Auth-related legacy tables (`admin_users`, `provider_users`, `user_profiles`) exist in the schema but are largely vestigial — see `ARCHITECTURE_REVIEW.md` for the auth consolidation plan.
- **Data pipeline**:
  - `ingest/seed-city.ts` — reusable adapter: JSON seed → venues (enriched via Google Places) → events → occurrences
  - `providers/*/` — per-provider scrapers + importers (Challenge Entertainment, NerdyTalk, BrainBlast)
  - `scripts/validate-places.ts` — Google Places enrichment (addresses, photos, lat/lng)
  - `jobs/generate-weekly-events.js` + `sunday-night-scheduler.js` — weekly occurrence generation
  - `jobs/backfill-occurrences.js` — idempotent gap-filler when the scheduler falls behind
  - `n8n/CE_Scraper.json` — n8n workflow (historical; not actively running)
- **Authentication**: Supabase native auth; admin dashboard at `/admin`. (Legacy RLS policies referencing dropped tables still exist — scheduled for cleanup.)
- **Location services**: Nominatim/OpenStreetMap for user-entered locations; Google Places for venue enrichment. Both proxied through Vite in dev.
- **Subdirectories**: `lib/` (Supabase client), `scripts/` (TS importers), `jobs/` (scheduled Node jobs), `providers/` (per-source scrapers), `ingest/` (city seed adapter + seed JSONs), `utils/` (dedup helpers), `supabase/` does **not** exist inside trivia-backend anymore — the Supabase CLI project lives at the repo root under `../supabase/`.

### Backend Commands

All backend commands run from `trivia-backend/` using **pnpm**. Requires Node 20.19+ (see `../.nvmrc`).

```bash
# Install backend dependencies
pnpm install

# Seed a city's venues + events + 4 weeks of occurrences from a JSON file
pnpm tsx ingest/seed-city.ts ingest/seeds/philadelphia.json
pnpm tsx ingest/seed-city.ts ingest/seeds/philadelphia.json --dry-run

# Import from a per-provider scraper output
pnpm import-nerdytalk
pnpm import-brainblast

# Validate / enrich venues via Google Places (downloads images)
pnpm validate-places validate --limit 10
pnpm validate-places stats

# Occurrence scheduling / maintenance
pnpm scheduler                              # runs the Sunday-night generator
pnpm scheduler:dry-run
node jobs/backfill-occurrences.js           # idempotent gap-filler
node jobs/backfill-occurrences.js --dry-run

# Monitor
pnpm monitor
```

Full operations guide: [trivia-backend/OPERATIONS.md](trivia-backend/OPERATIONS.md).

## Important Technical Details

### TypeScript Configuration
- Uses project references with separate configs for app and node
- Configured for strict type checking
- SWC plugin for fast compilation

### Styling Approach
- Mobile-first responsive design
- Dark theme as primary/default theme
- Tailwind CSS v4 with Vite plugin integration
- Uses Lucide React and Tabler icons (from root dependencies)

### Development Workflow
- ESLint configured for TypeScript, React hooks, and React refresh
- Vite provides hot module replacement for fast development
- pnpm as package manager (note: both root and trivia-nearby use pnpm)

## Key Requirements from PRD

1. Mobile-first, responsive design with dark theme default ✅
2. Location-based event discovery ✅
3. User authentication for venue owners ✅
4. Event management (add/edit) functionality ✅
5. Event cards showing: photo, name, venue, distance, address, time, prize money ✅

## Partnership Strategy

### Active Partnership
- **NerdyTalk**: Local Tennessee trivia provider, data-sharing conversation in progress. Importer lives at `providers/nerdytalk/import-nerdytalk-corrected.ts`.
- **Challenge Entertainment**: Manual JSON dumps from their site (no active partnership); last data pulled July 2025. Scraper + n8n workflow exist under `providers/challenge-entertainment/` and `n8n/CE_Scraper.json` but are not running on a schedule.

### Target Partnerships
- **JAMMIN' Trivia**: Multi-state presence (CO, GA, OR) - Contact: steve@myjammindjs.com
- **Trivia Nation**: 220+ shows weekly in Florida - Contact: admin@trivianation.com
- **OutSpoken Entertainment**: Atlanta metro area - Contact: (404) 273-1645
- **Team Trivia Georgia**: Atlanta region - Contact: (478) 887-4842
- **Dirty South Trivia**: Southeast region - Contact: dirtysouthtrivia.com/contact

## Technical Design Decisions

- I'm not concerned with pagination for the end user - we will only show the 20 closest trivias max on a day - maybe the week filter will have more but I prefer a load more button at the bottom

## Known Rough Edges

Tracked in `ARCHITECTURE_REVIEW.md`; short list here for context:

- **Auth layer has legacy code paths.** Hardcoded super-admin user IDs in `auth_context.tsx` and RLS policies referencing dropped tables. A consolidation pass is planned (JWT `app_metadata.role` as the single source of truth).
- **Sunday-night scheduler has been intermittent.** `jobs/backfill-occurrences.js` is the idempotent fallback. Cron install is in `setup-cron.sh`.
- **Per-event editing by venue owners** is scaffolded but not completed.

Previously tracked and resolved: Tomorrow/This-Week date filter was returning empty due to `toISOString()` producing UTC dates after ~7pm local; fixed in `useVenues.ts`.