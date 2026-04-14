# Archive

Historical artifacts kept for reference but not part of the active codebase.

## Layout

- [`docs/`](./docs/) — original operational docs that were consolidated into `trivia-backend/OPERATIONS.md` and `DEPLOYMENT.md`.
- [`migrations-historical/`](./migrations-historical/) — the legacy migration timeline that was superseded by `supabase/migrations/`. See its README.
- [`sql-one-offs/`](./sql-one-offs/) — ad-hoc SQL bootstrap/patch scripts run during development.
- [`providers-archived/`](./providers-archived/) — provider scrapers that hit dead ends (bot detection, blocked sites). Currently: `geeks-who-drink/`.
- [`data-snapshots/`](./data-snapshots/) — point-in-time data dumps kept for forensic value.

## When to delete

Most of this can be removed once:
- The auth/provider rebuild is complete (then `migrations-historical/` and `sql-one-offs/` are no longer useful as context).
- The new ingestion harness is in place (then `providers-archived/` references aren't needed).

`docs/` should stay until the new `OPERATIONS.md`/`DEPLOYMENT.md` have been validated against actual operations for at least one full deploy cycle.
