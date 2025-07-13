-- IMPORTANT: Run this in your Supabase SQL Editor to fix the infinite recursion error

-- Drop all existing policies for user_profiles to start fresh
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can create own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Platform admins can manage all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Platform admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Platform admins can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Platform admins can insert profiles" ON user_profiles;
DROP POLICY IF EXISTS "Platform admins can delete profiles" ON user_profiles;

-- Create simple, non-recursive policies
CREATE POLICY "Anyone can view any profile" ON user_profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- For now, only the user themselves can delete their profile
CREATE POLICY "Users can delete own profile" ON user_profiles
  FOR DELETE USING (auth.uid() = id);

-- Add email column if missing
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Update role values to match your app
ALTER TABLE user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_role_check;

ALTER TABLE user_profiles 
ADD CONSTRAINT user_profiles_role_check 
CHECK (role IN ('platform_admin', 'trivia_host', 'venue_owner', 'staff'));