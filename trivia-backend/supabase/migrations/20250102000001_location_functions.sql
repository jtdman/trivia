-- Create function to get venues near a location
CREATE OR REPLACE FUNCTION get_venues_near_location(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius_km DOUBLE PRECISION DEFAULT 50,
  max_results INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  name_original TEXT,
  address_original TEXT,
  google_place_id VARCHAR,
  google_name TEXT,
  google_formatted_address TEXT,
  google_location GEOMETRY,
  google_rating NUMERIC,
  google_phone_number TEXT,
  google_website TEXT,
  google_photo_reference TEXT,
  thumbnail_url TEXT,
  verification_status TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  distance_km DOUBLE PRECISION,
  events JSON
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id,
    v.name_original,
    v.address_original,
    v.google_place_id,
    v.google_name,
    v.google_formatted_address,
    v.google_location,
    v.google_rating,
    v.google_phone_number,
    v.google_website,
    v.google_photo_reference,
    v.thumbnail_url,
    v.verification_status,
    v.created_at,
    v.updated_at,
    ST_Distance(
      ST_Transform(v.google_location, 3857),
      ST_Transform(ST_SetSRID(ST_MakePoint(lng, lat), 4326), 3857)
    ) / 1000 AS distance_km,
    COALESCE(
      json_agg(
        json_build_object(
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
      '[]'::json
    ) AS events
  FROM venues v
  LEFT JOIN events e ON v.id = e.venue_id AND e.is_active = true
  WHERE v.google_location IS NOT NULL
    AND ST_DWithin(
      ST_Transform(v.google_location, 3857),
      ST_Transform(ST_SetSRID(ST_MakePoint(lng, lat), 3857), 3857),
      radius_km * 1000
    )
  GROUP BY v.id, v.name_original, v.address_original, v.google_place_id, 
           v.google_name, v.google_formatted_address, v.google_location,
           v.google_rating, v.google_phone_number, v.google_website,
           v.google_photo_reference, v.thumbnail_url, v.verification_status,
           v.created_at, v.updated_at
  ORDER BY distance_km
  LIMIT max_results;
END;
$$;

-- Create function to check daily API limit
CREATE OR REPLACE FUNCTION check_daily_api_limit(service TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  daily_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO daily_count
  FROM api_usage_log
  WHERE service_name = service
    AND DATE(request_timestamp) = CURRENT_DATE;
    
  RETURN daily_count;
END;
$$;

-- Create function to log API usage
CREATE OR REPLACE FUNCTION log_api_usage(
  p_service_name TEXT,
  p_endpoint TEXT DEFAULT NULL,
  p_venue_id UUID DEFAULT NULL,
  p_response_status INTEGER DEFAULT NULL,
  p_rate_limit_remaining INTEGER DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
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
  );
END;
$$;