# Manual Setup Instructions for Provider Authentication System

## Overview
Since the MCP interface doesn't allow schema modifications, you'll need to apply the database changes manually. Here's a step-by-step guide.

## Step 1: Apply Database Schema Changes

Run these SQL commands in your Supabase SQL Editor (Dashboard > SQL Editor):

```sql
-- 1. Add authentication fields to trivia_providers
ALTER TABLE trivia_providers 
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS auth_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS approval_notes TEXT,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Add constraint for auth_status
ALTER TABLE trivia_providers 
DROP CONSTRAINT IF EXISTS trivia_providers_auth_status_check,
ADD CONSTRAINT trivia_providers_auth_status_check 
CHECK (auth_status IN ('pending', 'approved', 'rejected'));

-- 2. Create admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

-- 3. Create provider_users table
CREATE TABLE IF NOT EXISTS provider_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES trivia_providers(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'editor')),
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider_id)
);

-- 4. Update event_occurrences table
ALTER TABLE event_occurrences 
DROP CONSTRAINT IF EXISTS event_occurrences_status_check,
ADD CONSTRAINT event_occurrences_status_check 
  CHECK (status IN ('scheduled', 'confirmed', 'cancelled', 'completed'));

ALTER TABLE event_occurrences
ADD COLUMN IF NOT EXISTS is_themed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS theme_name TEXT,
ADD COLUMN IF NOT EXISTS theme_description TEXT,
ADD COLUMN IF NOT EXISTS confirmed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 5. Add status fields to venues and events
ALTER TABLE venues 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved',
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

ALTER TABLE venues 
DROP CONSTRAINT IF EXISTS venues_status_check,
ADD CONSTRAINT venues_status_check 
CHECK (status IN ('pending', 'approved', 'rejected'));

ALTER TABLE events
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved',
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

ALTER TABLE events
DROP CONSTRAINT IF EXISTS events_status_check,
ADD CONSTRAINT events_status_check 
CHECK (status IN ('pending', 'approved', 'rejected'));

-- 6. Create indexes
CREATE INDEX IF NOT EXISTS idx_trivia_providers_auth_user_id ON trivia_providers(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_trivia_providers_auth_status ON trivia_providers(auth_status);
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);
CREATE INDEX IF NOT EXISTS idx_provider_users_user_id ON provider_users(user_id);
CREATE INDEX IF NOT EXISTS idx_provider_users_provider_id ON provider_users(provider_id);

-- 7. Enable RLS on new tables
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_users ENABLE ROW LEVEL SECURITY;

-- 8. Update existing data
UPDATE venues SET status = 'approved', approved_at = NOW() 
WHERE status IS NULL;

UPDATE events SET status = 'approved', approved_at = NOW() 
WHERE status IS NULL;

UPDATE trivia_providers SET auth_status = 'approved', approved_at = NOW() 
WHERE name IN ('Challenge Entertainment', 'NerdyTalk Trivia', 'BrainBlast Trivia')
AND auth_status = 'pending';
```

## Step 2: Create Demo Accounts

### A. Create Your God-Level Admin Account

1. Go to Supabase Dashboard > Authentication > Users
2. Click "Create User"
3. Use your email address
4. Set a password
5. Copy the User ID that gets generated

Then run this SQL with your actual User ID:

```sql
-- Replace 'YOUR_USER_ID_HERE' with the actual UUID from step 5
INSERT INTO admin_users (user_id, email, role) 
VALUES ('YOUR_USER_ID_HERE', 'your-email@example.com', 'super_admin');
```

### B. Create NerdyTalk Provider Account

1. Create another user in Supabase Dashboard
2. Use a different email (e.g., demo@nerdytalktrivia.com)
3. Copy the User ID

Then run this SQL:

```sql
-- Get NerdyTalk provider ID
SELECT id FROM trivia_providers WHERE name = 'NerdyTalk Trivia';

-- Replace with actual User ID and Provider ID
INSERT INTO provider_users (user_id, provider_id, role) 
VALUES ('NERDYTALK_USER_ID_HERE', 'NERDYTALK_PROVIDER_ID_HERE', 'admin');

-- Also link the provider to the user
UPDATE trivia_providers 
SET auth_user_id = 'NERDYTALK_USER_ID_HERE', auth_status = 'approved'
WHERE name = 'NerdyTalk Trivia';
```

## Step 3: Test the Setup

After running the SQL commands, you can test the setup:

1. Try logging in with both accounts
2. Check that you can query the new tables
3. Verify RLS policies are working

## Step 4: Continue with Implementation

Once the schema is in place, we can proceed with:
- Building the admin interface
- Creating the Sunday job
- Setting up email notifications
- Building the smart venue search

## Troubleshooting

If you encounter errors:
1. Check that you're running the SQL as a superuser/service role
2. Verify UUIDs are correctly copied (no quotes or extra spaces)
3. Make sure auth.users records exist before creating references

Let me know when you've completed these steps and I'll continue with the next phase!