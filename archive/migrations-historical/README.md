# Historical Migrations

These migrations are kept for reference but are **not** part of the active migration sequence.

## Active migrations

The active migrations live at the repo root in [`supabase/migrations/`](../../supabase/migrations/) — the standard Supabase CLI location. Those are the source of truth and what production has applied.

## What's in here

### `backend-supabase-migrations/`

The chronological migration history that lived under `trivia-backend/supabase/migrations/`. These were superseded by the consolidated schema in `supabase/migrations/20250114000001_complete_schema.sql` and `20250114000002_clean_auth_system.sql`. They include earlier auth attempts (`user_profiles`, `provider_users`, `admin_users`) that were dropped.

### `add_approval_system.sql`

An undated migration that lived at `trivia-backend/migrations/add_approval_system.sql` — added approval workflow columns to `trivia_providers`, `venues`, and `events`. Its concepts are folded into the consolidated schema.

## Why archive instead of delete?

These show *how* the schema evolved (especially the three failed auth attempts) and are useful context when rebuilding the auth system. Once auth is rewritten cleanly, this archive can be deleted.
