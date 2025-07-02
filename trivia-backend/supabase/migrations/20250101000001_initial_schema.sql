-- Enable extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Trivia providers (companies like Challenge Entertainment)
CREATE TABLE trivia_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    website TEXT,
    contact_info JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Venues table (optimized for Google Places API integration)
CREATE TABLE venues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Original scraped data
    name_original TEXT NOT NULL,
    address_original TEXT NOT NULL,
    
    -- Google Places API data
    google_place_id VARCHAR(255) UNIQUE,
    google_name TEXT,
    google_formatted_address TEXT,
    google_location GEOMETRY(Point, 4326),
    google_phone_number TEXT,
    google_website TEXT,
    google_rating DECIMAL(3,2), -- 0.00 to 5.00
    google_user_ratings_total INTEGER,
    google_price_level INTEGER, -- 0-4 scale
    google_business_status TEXT, -- OPERATIONAL, CLOSED_TEMPORARILY, etc.
    google_types TEXT[], -- Array of place types
    
    -- Photo/thumbnail data
    google_photo_reference TEXT, -- Main photo reference from Google Places
    thumbnail_url TEXT, -- CDN URL for app thumbnail
    
    -- Verification status
    verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'failed', 'needs_review')),
    verification_notes TEXT,
    last_verified_at TIMESTAMPTZ,
    
    -- Rate limiting for annual validation
    last_places_api_call TIMESTAMPTZ,
    api_call_count INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events table (normalized from venues)
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    provider_id UUID REFERENCES trivia_providers(id),
    
    -- Event details
    event_type TEXT NOT NULL, -- 'Live Trivia', 'Singo', etc.
    day_of_week TEXT NOT NULL CHECK (day_of_week IN ('Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday')),
    start_time TIME NOT NULL,
    end_time TIME, -- Optional
    frequency TEXT DEFAULT 'weekly' CHECK (frequency IN ('weekly', 'monthly', 'one-time')),
    
    -- Prize and competition info
    prize_amount DECIMAL(10,2),
    prize_description TEXT,
    max_teams INTEGER,
    
    -- Status and scheduling
    is_active BOOLEAN DEFAULT true,
    start_date DATE, -- When this event series began
    end_date DATE, -- Optional end date for limited series
    
    -- Original scraped data for reference
    original_date_text TEXT, -- e.g., "Tuesday, July 1, 2025"
    original_time_text TEXT, -- e.g., "7:00 PM"
    scraped_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event occurrences (for specific dates/cancellations)
CREATE TABLE event_occurrences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    occurrence_date DATE NOT NULL,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'cancelled', 'completed')),
    actual_start_time TIME,
    actual_end_time TIME,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- API usage tracking for rate limiting
CREATE TABLE api_usage_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_name TEXT NOT NULL, -- 'google_places', 'google_photos', etc.
    endpoint TEXT,
    venue_id UUID REFERENCES venues(id),
    request_timestamp TIMESTAMPTZ DEFAULT NOW(),
    response_status INTEGER,
    rate_limit_remaining INTEGER,
    error_message TEXT
);

-- Indexes for performance
CREATE INDEX idx_venues_google_location_gist ON venues USING GIST (google_location);
CREATE INDEX idx_venues_verification_status ON venues (verification_status);
CREATE INDEX idx_venues_google_place_id ON venues (google_place_id);
CREATE INDEX idx_venues_last_places_api_call ON venues (last_places_api_call);
CREATE INDEX idx_events_venue_id ON events (venue_id);
CREATE INDEX idx_events_day_of_week ON events (day_of_week);
CREATE INDEX idx_events_active ON events (is_active);
CREATE INDEX idx_event_occurrences_date ON event_occurrences (occurrence_date);
CREATE INDEX idx_api_usage_log_timestamp ON api_usage_log (request_timestamp);
CREATE INDEX idx_api_usage_log_service ON api_usage_log (service_name);

-- Update triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_venues_updated_at
    BEFORE UPDATE ON venues
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_providers_updated_at
    BEFORE UPDATE ON trivia_providers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert Challenge Entertainment as default provider
INSERT INTO trivia_providers (name, website) 
VALUES ('Challenge Entertainment', 'https://challengeentertainment.com');

-- Function to check daily API limit (max 1000 requests per day)
CREATE OR REPLACE FUNCTION check_daily_api_limit(service TEXT DEFAULT 'google_places')
RETURNS INTEGER AS $$
DECLARE
    daily_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO daily_count
    FROM api_usage_log
    WHERE service_name = service
    AND request_timestamp >= CURRENT_DATE;
    
    RETURN daily_count;
END;
$$ LANGUAGE plpgsql;

-- Function to log API usage
CREATE OR REPLACE FUNCTION log_api_usage(
    p_service_name TEXT,
    p_endpoint TEXT DEFAULT NULL,
    p_venue_id UUID DEFAULT NULL,
    p_response_status INTEGER DEFAULT NULL,
    p_rate_limit_remaining INTEGER DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO api_usage_log (
        service_name,
        endpoint,
        venue_id,
        response_status,
        rate_limit_remaining,
        error_message
    ) VALUES (
        p_service_name,
        p_endpoint,
        p_venue_id,
        p_response_status,
        p_rate_limit_remaining,
        p_error_message
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql;