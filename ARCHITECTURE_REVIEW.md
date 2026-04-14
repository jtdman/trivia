# Trivia Nearby — Architecture Review

**Date started:** 2026-04-13
**Purpose:** Take stock of the current state of the codebase after a long pause, identify what works and what doesn't, and decide where to invest next. Living document — update as decisions are made.

---

## 1. Current State

### What's Working
- **Data model is sound.** The events-vs-occurrences split is complete. `events` stores recurring templates; `event_occurrences` stores specific dated instances. Frontend reads from occurrences. Admin writes to events + auto-generates 4 weeks of occurrences. A Sunday-night scheduler extends the horizon.
- **PostGIS location queries work.** `get_venues_with_distance` RPC handles location-aware search.
- **Google Places validation pipeline is built.** Script fetches venue metadata, downloads photos, resizes, uploads to Supabase Storage, logs API usage. Functional but manual-only.
- **Production site is live** at trivianearby.com on Hetzner.

### What's Broken or Half-Finished

**Authentication has three overlapping systems that don't talk to each other:**
1. Migrations define `admin_users` + `provider_users` + sophisticated RLS policies — never queried by client.
2. A `user_profiles` table with roles — dropped in a later migration.
3. Client code hardcodes super-admin user IDs and relies on in-memory flags — this is what actually runs.

The RLS policies in the DB are dead code. Authorization is effectively "honor system" client-side checks. A user tweaking `isSuperAdmin` in browser devtools could see everything.

**Provider approval workflow is incomplete.**
Users can sign up as trivia providers (status='pending'), a notification fires — but there's no UI to approve them. Known providers are hardcoded in a migration.

**Venue ownership is ambiguous.**
A venue can be owned by an individual (`created_by`) OR by a provider (`provider_id` on related events). Two ownership models coexist without clear UX.

**Scrapers are stalled.**
- Challenge Entertainment: last update July 2025, manual JSON dumps, no active scraper.
- NerdyTalk: had 5 scraper variants and 7 data files for the same source — consolidated down in cleanup.
- BrainBlast: manual data, scraper exists, no schedule.
- 3 other providers (Geeks Who Drink, King Trivia, Sporcle) archived as BLOCKED by bot detection.
- Google Places validation: ~828 venues, very few verified — never scheduled.

**Junk inventory (largely addressed in cleanup branch):**
- 12 one-off maintenance scripts in backend root — deleted, recoverable from git history.
- 7+ overlapping operational docs — being consolidated.
- 3 migration attempts for the same auth problem — pending review.
- A separate `admin-interface/` React app with its own `node_modules` — was orphan local-only files, removed.
- Root-level debug files — removed.

### Deployment Sync State
- Local `main` is ~10 commits ahead of the server.
- Server runs `deployment` branch — working but stale.
- `origin/deployment` on GitHub is behind both.
- No deploys until architecture direction is settled. Server is stable as-is.

---

## 2. Core Architectural Tensions

These cascade into everything else.

### Tension A: Directory vs. Marketplace vs. Platform
- **Directory:** Aggregate public data; end users find trivia; no provider accounts needed.
- **Marketplace:** Providers sign up, claim/add venues, manage their events. Admin approves.
- **Platform:** Add end-user accounts (favorites, RSVPs, teams, leaderboards).

### Tension B: Source of Event Truth
- **Scraped-only:** Read-only aggregator. Simple. Accuracy depends on partners. Legal risk for TOS-protected sources.
- **Provider-submitted-only:** Cleaner data. Chicken-and-egg growth problem.
- **Hybrid:** Scrape for coverage, providers maintain accuracy. Matches reality of the space.

### Tension C: Venue Identity
Venues today come from three paths: scraped, Google-Places-validated, user-submitted. No canonical dedup story. The same bar can exist 2–3 times under different names. `google_place_id` should be the canonical key — it isn't today.

### Tension D: Role Model
- **Simple:** One role (admin). Approve manually.
- **Two-tier:** Super-admin + provider-admin. Provider signs up, gets approved, manages their scope.
- **Three-tier:** Above + venue-owner (individual bar manager claims their bar).

---

## 3. Recommendations

### Near-term cleanup (in progress on `cleanup-for-assessment` branch)
- Done: removed orphan dirs, debug files, duplicate scrapers, one-off fix scripts.
- In progress: consolidate operational docs into `OPERATIONS.md` + `DEPLOYMENT.md`; archive originals.
- Pending: review `marketing/`, `n8n/`, `tasks/` directories at root.

### Auth rewrite (next major work)
- **Single source of truth:** Supabase JWT `app_metadata.role` as the role claim.
- **RLS enforced, not bypassed.** Client queries should work against real RLS — not parallel JS filters.
- **Remove hardcoded user IDs entirely.**

### Scraper strategy
- One ingestion harness with pluggable adapters per source. Not 5 separate scripts.
- Partnership-first for accuracy maintenance: providers verify their schedule periodically rather than re-scraping weekly.
- Kill scrapers for bot-protected sites — risk/reward is bad.

### Google Places as canonical venue identity
- Make `google_place_id` the dedup key.
- Run validation as a scheduled job (weekly batch), not manual.
- Hybrid search per [`docs/HYBRID_SEARCH_STRATEGY.md`](docs/HYBRID_SEARCH_STRATEGY.md): local DB first, fall back to Google Places only when nothing matches, use session tokens to minimize API cost.

### Rewrite vs. evolve?
**Evolve.** The data model is the part that's hardest to get right, and it's correct. The broken parts (auth, admin flows, scrapers) are in discrete layers that can be replaced without touching the DB. A full rewrite would re-learn lessons already paid for.

---

## 4. Decisions Log

_Format: `YYYY-MM-DD | decision | rationale`._

- **2026-04-13 | D1: Primary user is the end-user finding trivia.** Providers exist as a fallback correction layer (add missing events, mark skipped weeks, end a series). Ideal state = zero provider interaction; data flows in automatically.
- **2026-04-13 | D2: Free directory + banner ads.** No paid tiers, no subscriptions. Mobile-first; must look good on desktop/tablet.
- **2026-04-13 | D3: Provider = the org running trivia at a venue.** Usually a multi-venue company (NerdyTalk, Challenge). Sometimes the venue itself when a bar runs their own trivia. Same DB concept; in that case `provider = venue` in effect.
- **2026-04-13 | D4: Evolve, don't rewrite.** Data model stays. Rebuild the broken layers: auth, admin UX, scrapers.
- **2026-04-13 | D5: Ingestion model — harness + pluggable adapters.** One ingestion harness, one target schema, one scheduled runner. Each source is an adapter that normalizes into the common shape.
- **2026-04-13 | D6: Staleness — verify-with-provider, not re-scrape.** Weekly re-scraping is too expensive and brittle. Capture provider contact info; send a light "confirm your schedule is still correct" prompt on a cadence. Scrape for initial coverage; providers maintain accuracy thereafter. "Verified as of YYYY-MM-DD" becomes a first-class concept on events.
- **2026-04-13 | D7: Venue dedup via google_place_id + local-first lookup.** Per the hybrid search strategy doc: autocomplete hits the local DB first, falls back to Google Places only when nothing matches, uses session tokens to minimize API cost.

## 5. Cleanup Plan

### Phase 1 — Understand
- [x] Inventory current state (this doc).
- [ ] Walk through running app once — trace one event from DB row → API query → rendered card.
- [ ] Confirm which auth system is *actually running in production* vs. vestigial.

### Phase 2 — Delete / Archive (in progress)
- [x] Remove duplicate NerdyTalk scrapers (5 → 1) and consolidated data files.
- [x] Remove 12 one-off fix scripts.
- [x] Remove orphan `admin-interface/` and stale deploy artifact.
- [x] Remove root-level debug files.
- [ ] Archive 7+ overlapping operational docs into `archive/docs/`; produce one `OPERATIONS.md`.
- [ ] Review `marketing/`, `n8n/`, `tasks/` directories.
- [ ] Remove dead RLS migrations that reference dropped tables.

### Phase 3 — Consolidate auth
- [ ] Pick one auth model. Proposed: Supabase JWT `app_metadata.role`.
- [ ] Remove hardcoded user IDs from `auth_context.tsx`.
- [ ] Either enforce RLS properly or drop the policies and document client-side-only authorization.
- [ ] Document the admin approval flow honestly (e.g. "manual SQL insert").

### Phase 4 — Document the workflow
- [ ] Rewrite the top-level README: what the app is, how to run it, the data flow (ingestion → validation → display), key tables, key components.
- [ ] Add `docs/ARCHITECTURE.md` with a diagram (mermaid/ASCII): sources → venues → events → occurrences → frontend.
- [ ] Add `docs/ADDING_A_PROVIDER.md` — concrete steps to add a new scraper adapter.

### Phase 5 — Future feature work (out of scope for this cleanup)
- New scraper adapters (Boston-area providers, etc.).
- Provider self-service approval UI.
- Verify-with-provider flow (D6).
