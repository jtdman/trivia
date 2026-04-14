# SQL One-Off Scripts

These are ad-hoc SQL scripts that were run against the database during development to seed data, patch schemas, or clean up bad data. They are **not** part of the active migration sequence — their effects (where still relevant) are captured in [`supabase/migrations/`](../../supabase/migrations/).

Kept for reference; safe to delete once the auth/provider rebuild is complete.

## What's here

### Provider seeding
- `add-trivia-providers.sql` / `add-trivia-providers-fixed.sql` — initial seed of `trivia_providers` rows. The `-fixed` variant superseded the original.
- `comprehensive-trivia-providers.sql` — extended seed list excluding Challenge and NerdyTalk.
- `trivia-providers-with-contacts.sql` — provider seed with contact info scraped from company websites.
- `update-provider-contacts.sql` — patches contact info onto existing rows.
- `update-trivia-providers.sql` — adds `is_active` column to existing table.

### Admin/role setup
- `create-admin.sql` / `create-first-admin.sql` — create the platform admin user. Duplicates of each other.
- `update-roles.sql` — adds platform-admin vs user role distinction.

### Data hygiene
- `cleanup-junk-venues.sql` — removes garbage rows that should not have been imported.
- `add-venue-protection.sql` — adds `is_imported` and `created_by` to track venue ownership.
