-- Add approval system for user-generated content
-- This allows new trivia providers to register and add content that stays hidden until approved

-- Add status to trivia_providers table
ALTER TABLE trivia_providers 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'));

-- Update existing providers to approved status
UPDATE trivia_providers SET status = 'approved' WHERE status IS NULL;

-- Add status to venues table for user-created venues
ALTER TABLE venues 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS created_by_user_id uuid REFERENCES auth.users(id);

-- Update existing venues to approved status (they came from scraping)
UPDATE venues SET status = 'approved' WHERE status IS NULL;

-- Add status to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS created_by_user_id uuid REFERENCES auth.users(id);

-- Update existing events to approved status (they came from scraping)
UPDATE events SET status = 'approved' WHERE status IS NULL;

-- Create notifications table for admin alerts
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL, -- 'new_provider', 'new_venue', 'new_event'
  title text NOT NULL,
  message text NOT NULL,
  related_id uuid, -- ID of the related provider/venue/event
  related_table text, -- 'trivia_providers', 'venues', 'events'
  is_read boolean DEFAULT false,
  created_at timestamp DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Create provider_users table to link users to their trivia provider
CREATE TABLE IF NOT EXISTS provider_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES trivia_providers(id) ON DELETE CASCADE,
  role text DEFAULT 'admin', -- 'admin', 'editor'
  created_at timestamp DEFAULT now(),
  UNIQUE(user_id, provider_id)
);

-- Add indices for performance
CREATE INDEX IF NOT EXISTS idx_venues_status ON venues(status);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_trivia_providers_status ON trivia_providers(status);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- Update RLS policies to only show approved content to public
-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Public venues are viewable by everyone" ON venues;
DROP POLICY IF EXISTS "Public events are viewable by everyone" ON events;
DROP POLICY IF EXISTS "Public providers are viewable by everyone" ON trivia_providers;

-- Create new policies that only show approved content to public
CREATE POLICY "Approved venues are viewable by everyone" ON venues
FOR SELECT USING (status = 'approved');

CREATE POLICY "Approved events are viewable by everyone" ON events  
FOR SELECT USING (status = 'approved');

CREATE POLICY "Approved providers are viewable by everyone" ON trivia_providers
FOR SELECT USING (status = 'approved');

-- Allow users to see their own pending content
CREATE POLICY "Users can view their own venues" ON venues
FOR ALL USING (created_by_user_id = auth.uid());

CREATE POLICY "Users can view their own events" ON events
FOR ALL USING (created_by_user_id = auth.uid());

-- Allow god-mode admin to see everything
CREATE POLICY "God admin can see all venues" ON venues
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid() AND role = 'god'
  )
);

CREATE POLICY "God admin can see all events" ON events
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid() AND role = 'god'
  )
);

CREATE POLICY "God admin can see all providers" ON trivia_providers
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid() AND role = 'god'
  )
);

-- Notifications policies
CREATE POLICY "God admin can see all notifications" ON notifications
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid() AND role = 'god'
  )
);

CREATE POLICY "God admin can update notifications" ON notifications
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid() AND role = 'god'
  )
);

-- Provider_users policies
CREATE POLICY "Users can view their provider relationships" ON provider_users
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "God admin can see all provider relationships" ON provider_users
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid() AND role = 'god'
  )
);