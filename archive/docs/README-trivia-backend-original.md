# Trivia Backend

Data processing and management for the trivia venue database.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase and Google Places API credentials
   ```

3. **Run database migration:**
   ```bash
   # Apply the schema to your Supabase database
   # Copy the contents of supabase/migrations/20250101000001_initial_schema.sql
   # and run it in your Supabase SQL editor
   ```

## Scripts

### Import Venues
Import venue data from JSON file and validate with Google Places API:

```bash
npm run import-venues path/to/venues.json
```

**Features:**
- Parses venue and event data
- Calls Google Places API for validation
- Respects rate limits (max 1000 calls/day)
- Handles duplicates with upsert logic
- Creates normalized venue and event records

### Validate Places
Validate existing venues against Google Places API:

```bash
# Show validation statistics
npm run validate-places stats

# Validate all unverified venues
npm run validate-places validate

# Dry run (preview only)
npm run validate-places validate --dry-run --limit 10

# Validate only failed venues
npm run validate-places validate --failed --limit 50
```

**Options:**
- `--dry-run`: Preview changes without updating database
- `--pending`: Only validate pending venues
- `--failed`: Only validate failed venues  
- `--needs-review`: Only validate venues needing review
- `--limit N`: Limit to N venues

## Rate Limiting

The system enforces Google Places API limits:
- **Maximum 1000 requests per day**
- **10 requests per second** (110ms delay between calls)
- Daily usage tracked in `api_usage_log` table

## Database Schema

### Core Tables
- **`venues`**: Venue information with Google Places data
- **`events`**: Trivia events (normalized from venues)
- **`trivia_providers`**: Companies like Challenge Entertainment
- **`api_usage_log`**: API call tracking for rate limiting

### Key Features
- **PostGIS integration** for location-based queries
- **Verification workflow** for manual review
- **Duplicate prevention** via unique constraints
- **Rate limiting** with daily quotas

## Verification Statuses

- **`pending`**: Newly imported, not yet validated
- **`verified`**: Successfully matched with Google Places
- **`failed`**: Could not find in Google Places
- **`needs_review`**: Found but requires manual verification

## Annual Validation

For annual re-validation of venue data:

```bash
# Validate a batch of older venues (respecting daily limits)
npm run validate-places validate --limit 900
```

The system tracks `last_places_api_call` to prioritize older venues for re-validation.