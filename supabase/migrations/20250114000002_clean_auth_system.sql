-- Clean Auth System - Use Supabase Native Auth
-- This replaces the complex custom auth with simple Supabase native patterns

-- Drop problematic tables and policies
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;
DROP TABLE IF EXISTS provider_users CASCADE;

-- Clean up trivia_providers policies
DROP POLICY IF EXISTS "Approved providers viewable by everyone" ON trivia_providers;
DROP POLICY IF EXISTS "Users can create providers" ON trivia_providers;
DROP POLICY IF EXISTS "Users can view their own providers" ON trivia_providers;
DROP POLICY IF EXISTS "God admin can manage all providers" ON trivia_providers;

-- Clean up venues policies  
DROP POLICY IF EXISTS "Approved venues viewable by everyone" ON venues;
DROP POLICY IF EXISTS "Users can create venues" ON venues;
DROP POLICY IF EXISTS "Users can view their own venues" ON venues;
DROP POLICY IF EXISTS "God admin can manage all venues" ON venues;

-- Clean up events policies
DROP POLICY IF EXISTS "Approved events viewable by everyone" ON events;
DROP POLICY IF EXISTS "Users can create events for their providers" ON events;
DROP POLICY IF EXISTS "Users can view their own events" ON events;
DROP POLICY IF EXISTS "God admin can manage all events" ON events;

-- Clean up notifications policies
DROP POLICY IF EXISTS "God admin can manage notifications" ON notifications;

-- Add provider_id to trivia_providers (links to auth.users)
ALTER TABLE trivia_providers 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Create simple, clean RLS policies using Supabase native auth

-- Trivia Providers - Simple and clean
CREATE POLICY "Public can view approved providers" ON trivia_providers
FOR SELECT USING (status = 'approved');

CREATE POLICY "Authenticated users can create providers" ON trivia_providers
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Users can manage their own providers" ON trivia_providers
FOR ALL USING (user_id = auth.uid());

CREATE POLICY "God admin can manage all providers" ON trivia_providers
FOR ALL USING (auth.jwt() ->> 'role' = 'god_admin');

-- Venues - Simple ownership model
CREATE POLICY "Public can view approved venues" ON venues
FOR SELECT USING (status = 'approved');

CREATE POLICY "Authenticated users can create venues" ON venues
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND created_by_user_id = auth.uid());

CREATE POLICY "Users can manage their own venues" ON venues
FOR ALL USING (created_by_user_id = auth.uid());

CREATE POLICY "God admin can manage all venues" ON venues
FOR ALL USING (auth.jwt() ->> 'role' = 'god_admin');

-- Events - Must belong to user's provider
CREATE POLICY "Public can view approved events" ON events
FOR SELECT USING (status = 'approved');

CREATE POLICY "Users can create events for their providers" ON events
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND 
  created_by_user_id = auth.uid() AND
  provider_id IN (SELECT id FROM trivia_providers WHERE user_id = auth.uid())
);

CREATE POLICY "Users can manage events for their providers" ON events
FOR ALL USING (
  created_by_user_id = auth.uid() AND
  provider_id IN (SELECT id FROM trivia_providers WHERE user_id = auth.uid())
);

CREATE POLICY "God admin can manage all events" ON events
FOR ALL USING (auth.jwt() ->> 'role' = 'god_admin');

-- Notifications - Only god admin can see them
CREATE POLICY "God admin can manage notifications" ON notifications
FOR ALL USING (auth.jwt() ->> 'role' = 'god_admin');

-- Simple function to set user role in metadata
CREATE OR REPLACE FUNCTION set_user_role(user_id uuid, role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE auth.users 
  SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('role', role)
  WHERE id = user_id;
END;
$$;

-- Function to check if user is god admin (for use in app)
CREATE OR REPLACE FUNCTION is_god_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN auth.jwt() ->> 'role' = 'god_admin';
END;
$$;

-- Function to get user's provider (if any)
CREATE OR REPLACE FUNCTION get_user_provider()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (SELECT id FROM trivia_providers WHERE user_id = auth.uid() LIMIT 1);
END;
$$;