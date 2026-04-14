-- =====================================================
-- TRIVIA APP COMPLETE DATABASE SETUP
-- =====================================================
-- This script documents and sets up the complete database
-- Run sections as needed in Supabase SQL Editor

-- =====================================================
-- 1. ENABLE REQUIRED EXTENSIONS
-- =====================================================
-- Enable PostGIS for geographic data
CREATE EXTENSION IF NOT EXISTS postgis;

-- =====================================================
-- 2. CREATE TABLES (if not already exists)
-- =====================================================

-- Trivia providers table
CREATE TABLE IF NOT EXISTS trivia_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  website TEXT,
  contact_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Venues table with PostGIS location support
CREATE TABLE IF NOT EXISTS venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_original TEXT NOT NULL,
  address_original TEXT NOT NULL,
  
  -- Google Places data
  google_place_id TEXT UNIQUE,
  google_name TEXT,
  google_formatted_address TEXT,
  google_location GEOGRAPHY(POINT, 4326), -- PostGIS point for lat/lng
  google_rating DOUBLE PRECISION,
  google_phone_number TEXT,
  google_website TEXT,
  google_photo_reference TEXT,
  
  -- Additional data
  thumbnail_url TEXT,
  verification_status TEXT CHECK (verification_status IN ('pending', 'verified', 'failed', 'needs_review')) DEFAULT 'pending',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES trivia_providers(id),
  
  -- Event details
  event_type TEXT NOT NULL, -- 'trivia', 'quiz', 'bingo', etc.
  day_of_week TEXT NOT NULL, -- 'monday', 'tuesday', etc.
  start_time TIME NOT NULL,
  end_time TIME,
  frequency TEXT CHECK (frequency IN ('weekly', 'monthly', 'one-time')) DEFAULT 'weekly',
  
  -- Prize information
  prize_amount DECIMAL(10,2),
  prize_description TEXT,
  max_teams INTEGER,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Geographic index for location-based queries
CREATE INDEX IF NOT EXISTS idx_venues_location ON venues USING GIST (google_location);

-- Venue lookup indexes
CREATE INDEX IF NOT EXISTS idx_venues_google_place_id ON venues (google_place_id);
CREATE INDEX IF NOT EXISTS idx_venues_verification_status ON venues (verification_status);

-- Event lookup indexes  
CREATE INDEX IF NOT EXISTS idx_events_venue_id ON events (venue_id);
CREATE INDEX IF NOT EXISTS idx_events_active ON events (is_active);
CREATE INDEX IF NOT EXISTS idx_events_day_of_week ON events (day_of_week);
CREATE INDEX IF NOT EXISTS idx_events_venue_active ON events (venue_id, is_active);

-- =====================================================
-- 4. CREATE LOCATION-BASED FUNCTION
-- =====================================================

-- Main function for getting venues sorted by distance (in miles)
CREATE OR REPLACE FUNCTION get_venues_with_distance(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  radius_miles DOUBLE PRECISION DEFAULT 30,
  venue_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  name_original TEXT,
  address_original TEXT,
  google_place_id VARCHAR(255),
  google_name TEXT,
  google_formatted_address TEXT,
  google_rating NUMERIC,
  google_phone_number TEXT,
  google_website TEXT,
  google_photo_reference TEXT,
  thumbnail_url TEXT,
  verification_status TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  longitude DOUBLE PRECISION,
  latitude DOUBLE PRECISION,
  distance_miles DOUBLE PRECISION,
  events JSONB
) 
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    v.id,
    v.name_original,
    v.address_original,
    v.google_place_id,
    v.google_name,
    v.google_formatted_address,
    v.google_rating,
    v.google_phone_number,
    v.google_website,
    v.google_photo_reference,
    v.thumbnail_url,
    v.verification_status,
    v.created_at,
    v.updated_at,
    ST_X(v.google_location) as longitude,
    ST_Y(v.google_location) as latitude,
    (ST_Distance(
      v.google_location,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
    ) / 1000.0) * 0.621371 as distance_miles,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', e.id,
          'event_type', e.event_type,
          'day_of_week', e.day_of_week,
          'start_time', e.start_time,
          'end_time', e.end_time,
          'frequency', e.frequency,
          'prize_amount', e.prize_amount,
          'prize_description', e.prize_description,
          'max_teams', e.max_teams,
          'is_active', e.is_active
        )
      ) FILTER (WHERE e.id IS NOT NULL),
      '[]'::jsonb
    ) as events
  FROM venues v
  LEFT JOIN events e ON v.id = e.venue_id AND e.is_active = true
  WHERE v.google_location IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM events e2 
      WHERE e2.venue_id = v.id AND e2.is_active = true
    )
    AND ST_DWithin(
      v.google_location,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      radius_miles * 1609.34
    )
  GROUP BY v.id, v.name_original, v.address_original, v.google_place_id, 
           v.google_name, v.google_formatted_address, v.google_rating,
           v.google_phone_number, v.google_website, v.google_photo_reference,
           v.thumbnail_url, v.verification_status, v.created_at, v.updated_at,
           v.google_location
  ORDER BY distance_miles
  LIMIT venue_limit;
END;
$function$;

-- =====================================================
-- 5. CREATE HELPER FUNCTIONS
-- =====================================================

-- Function to get venue coordinates only
CREATE OR REPLACE FUNCTION get_venue_coordinates()
RETURNS TABLE (
  id UUID,
  name TEXT,
  longitude DOUBLE PRECISION,
  latitude DOUBLE PRECISION
)
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    v.id,
    COALESCE(v.google_name, v.name_original) as name,
    ST_X(v.google_location) as longitude,
    ST_Y(v.google_location) as latitude
  FROM venues v
  WHERE v.google_location IS NOT NULL;
END;
$function$;

-- =====================================================
-- 6. ROW LEVEL SECURITY (RLS) SETUP
-- =====================================================

-- Enable RLS on tables (uncomment if needed)
-- ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE events ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE trivia_providers ENABLE ROW LEVEL SECURITY;

-- Basic read policies for authenticated users
-- CREATE POLICY "Allow public read access to venues" ON venues FOR SELECT USING (true);
-- CREATE POLICY "Allow public read access to events" ON events FOR SELECT USING (true);

-- =====================================================
-- 7. TEST QUERIES
-- =====================================================

-- Test location function with Nashville coordinates
-- SELECT * FROM get_nearby_venues(36.1627, -86.5804, 50, 10);

-- Test coordinate extraction
-- SELECT * FROM get_venue_coordinates() LIMIT 10;

-- Check venue distribution by state
-- SELECT 
--   CASE 
--     WHEN google_formatted_address LIKE '%TN%' THEN 'Tennessee'
--     WHEN google_formatted_address LIKE '%LA%' THEN 'Louisiana'
--     WHEN google_formatted_address LIKE '%FL%' THEN 'Florida'
--     ELSE 'Other'
--   END as state,
--   COUNT(*) as count
-- FROM venues 
-- WHERE google_formatted_address IS NOT NULL
-- GROUP BY 1
-- ORDER BY count DESC;

-- =====================================================
-- SETUP COMPLETE
-- =====================================================
-- After running this script:
-- 1. Tables and indexes are created
-- 2. PostGIS extension is enabled  
-- 3. Location-based functions are available
-- 4. Database is ready for the trivia app
-- =====================================================