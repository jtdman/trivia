# Local Supabase Development Setup

## Prerequisites
- Podman installed
- Supabase CLI installed: `npm install -g supabase`

## Setup Steps

### 1. Initialize Supabase Project
```bash
cd /Users/jason/code/trivia
supabase init
```

### 2. Start Local Supabase (using Podman)
```bash
# Configure Supabase to use Podman instead of Docker
export SUPABASE_DB_START_ARGS="--runtime=podman"

# Start local Supabase stack
supabase start
```

### 3. Get Local Connection Details
After starting, Supabase CLI will output:
- API URL (usually http://localhost:54321)
- Anon Key
- Service Role Key
- Database URL

### 4. Environment Configuration
Create `.env.local` in trivia-nearby/:
```env
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=your-local-anon-key
```

### 5. Database Migration
```bash
# Create migration from our existing schema
supabase db reset

# Or manually create migration
supabase migration new initial_schema
```

## Migration SQL to Run

We'll need to recreate:
1. Core tables (venues, events, trivia_providers, etc.)
2. Approval system modifications
3. RLS policies (but permissive for testing)
4. Sample data for testing

## Benefits of Local Development
- Full database access for debugging
- No RLS policy conflicts during development
- Can test migrations before applying to production
- Faster iteration cycles
- Full control over data and schema changes

## Next Steps
1. Set up local environment
2. Migrate schema with proper RLS policies
3. Test full registration → approval → venue creation flow
4. Once working locally, apply fixes to production