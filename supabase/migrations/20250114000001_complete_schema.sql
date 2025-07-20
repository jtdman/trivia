-- Complete TriviaNearby Schema with Approval System
-- This creates the full database schema for local development

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create trivia_providers table
CREATE TABLE IF NOT EXISTS trivia_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  website text,
  contact_info jsonb,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  is_active boolean DEFAULT true,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- Create venues table
CREATE TABLE IF NOT EXISTS venues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_original text,
  address_original text,
  google_place_id text,
  google_name text,
  google_formatted_address text,
  google_photo_reference text,
  thumbnail_url text,
  latitude double precision,
  longitude double precision,
  location geography(POINT,4326),
  phone text,
  website text,
  rating double precision,
  user_ratings_total integer,
  price_level integer,
  types text[],
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_by_user_id uuid REFERENCES auth.users(id),
  distance_miles double precision
);

-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid REFERENCES venues(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES trivia_providers(id) ON DELETE CASCADE,
  event_type text DEFAULT 'trivia',
  day_of_week text NOT NULL,
  start_time time NOT NULL,
  end_time time,
  frequency text DEFAULT 'weekly' CHECK (frequency IN ('weekly', 'one-time')),
  prize_amount decimal(10,2),
  prize_description text,
  additional_info text,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_by_user_id uuid REFERENCES auth.users(id),
  event_date date -- For one-time events
);

-- Create admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  role text DEFAULT 'admin' CHECK (role IN ('admin', 'god')),
  created_at timestamp DEFAULT now(),
  UNIQUE(user_id)
);

-- Create provider_users table (links users to their trivia providers)
CREATE TABLE IF NOT EXISTS provider_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES trivia_providers(id) ON DELETE CASCADE,
  role text DEFAULT 'admin' CHECK (role IN ('admin', 'editor')),
  created_at timestamp DEFAULT now(),
  UNIQUE(user_id, provider_id)
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('new_provider', 'new_venue', 'new_event', 'approval_request')),
  title text NOT NULL,
  message text NOT NULL,
  related_id uuid,
  related_table text CHECK (related_table IN ('trivia_providers', 'venues', 'events')),
  is_read boolean DEFAULT false,
  created_at timestamp DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Create user_profiles table (for compatibility)
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email text,
  full_name text,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Create indices for performance
CREATE INDEX IF NOT EXISTS idx_venues_location ON venues USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_venues_status ON venues(status);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_venue_id ON events(venue_id);
CREATE INDEX IF NOT EXISTS idx_events_provider_id ON events(provider_id);
CREATE INDEX IF NOT EXISTS idx_trivia_providers_status ON trivia_providers(status);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_provider_users_user_id ON provider_users(user_id);
CREATE INDEX IF NOT EXISTS idx_provider_users_provider_id ON provider_users(provider_id);

-- Enable RLS on all tables
ALTER TABLE trivia_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create permissive RLS policies for local development
-- These are more permissive than production for easier testing

-- Trivia Providers policies
CREATE POLICY "Approved providers viewable by everyone" ON trivia_providers
FOR SELECT USING (status = 'approved');

CREATE POLICY "Users can create providers" ON trivia_providers
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view their own providers" ON trivia_providers
FOR SELECT USING (
  id IN (SELECT provider_id FROM provider_users WHERE user_id = auth.uid())
);

CREATE POLICY "God admin can manage all providers" ON trivia_providers
FOR ALL USING (
  EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND role = 'god')
);

-- Venues policies
CREATE POLICY "Approved venues viewable by everyone" ON venues
FOR SELECT USING (status = 'approved');

CREATE POLICY "Users can create venues" ON venues
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view their own venues" ON venues
FOR SELECT USING (created_by_user_id = auth.uid());

CREATE POLICY "God admin can manage all venues" ON venues
FOR ALL USING (
  EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND role = 'god')
);

-- Events policies
CREATE POLICY "Approved events viewable by everyone" ON events
FOR SELECT USING (status = 'approved');

CREATE POLICY "Users can create events for their providers" ON events
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND
  provider_id IN (SELECT provider_id FROM provider_users WHERE user_id = auth.uid())
);

CREATE POLICY "Users can view their own events" ON events
FOR SELECT USING (
  created_by_user_id = auth.uid() OR
  provider_id IN (SELECT provider_id FROM provider_users WHERE user_id = auth.uid())
);

CREATE POLICY "God admin can manage all events" ON events
FOR ALL USING (
  EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND role = 'god')
);

-- Admin users policies
CREATE POLICY "Admin users can view admin records" ON admin_users
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "God admin can manage admin users" ON admin_users
FOR ALL USING (
  EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND role = 'god')
);

-- Provider users policies
CREATE POLICY "Users can view their provider relationships" ON provider_users
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create provider relationships for themselves" ON provider_users
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "God admin can manage provider relationships" ON provider_users
FOR ALL USING (
  EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND role = 'god')
);

-- Notifications policies
CREATE POLICY "God admin can manage notifications" ON notifications
FOR ALL USING (
  EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND role = 'god')
);

-- User profiles policies
CREATE POLICY "Users can view own profile" ON user_profiles
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile" ON user_profiles
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can create own profile" ON user_profiles
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "God admin can manage profiles" ON user_profiles
FOR ALL USING (
  EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND role = 'god')
);

-- Insert god admin user (you'll need to replace the user_id with your actual local test user ID)
-- This will be updated after you create your test account locally