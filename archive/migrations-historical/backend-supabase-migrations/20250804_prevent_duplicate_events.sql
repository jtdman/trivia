-- Migration: Prevent Duplicate Events
-- This migration adds constraints and indexes to prevent duplicate events

-- Add unique constraint to prevent duplicate events
-- Only applies to active events to allow soft-deleted duplicates
ALTER TABLE events 
ADD CONSTRAINT unique_event_combination 
UNIQUE (venue_id, event_type, day_of_week, start_time, provider_id)
WHERE is_active = true;

-- Add index for better performance on duplicate checks
CREATE INDEX IF NOT EXISTS idx_events_duplicate_check 
ON events (venue_id, event_type, day_of_week, start_time, provider_id) 
WHERE is_active = true;

-- Add index for scheduler performance
CREATE INDEX IF NOT EXISTS idx_events_scheduler 
ON events (is_active, frequency, day_of_week) 
WHERE is_active = true;

-- Add helpful function to check for existing events before insert
CREATE OR REPLACE FUNCTION check_event_exists(
  p_venue_id UUID,
  p_event_type TEXT,
  p_day_of_week TEXT,
  p_start_time TIME,
  p_provider_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM events 
    WHERE venue_id = p_venue_id
      AND event_type = p_event_type  
      AND day_of_week = p_day_of_week
      AND start_time = p_start_time
      AND provider_id = p_provider_id
      AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add RPC for analyzing duplicates (used by cleanup script)
CREATE OR REPLACE FUNCTION analyze_duplicate_events()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  WITH duplicate_analysis AS (
    SELECT 
      venue_id,
      event_type,
      day_of_week,
      start_time,
      provider_id,
      COUNT(*) as duplicate_count,
      ARRAY_AGG(id ORDER BY created_at) as event_ids
    FROM events 
    WHERE is_active = true
    GROUP BY venue_id, event_type, day_of_week, start_time, provider_id
    HAVING COUNT(*) > 1
  )
  SELECT json_build_object(
    'total_events', (SELECT COUNT(*) FROM events WHERE is_active = true),
    'unique_combinations', (SELECT COUNT(DISTINCT CONCAT(venue_id, '|', event_type, '|', day_of_week, '|', start_time, '|', provider_id)) FROM events WHERE is_active = true),
    'duplicate_groups', (SELECT COUNT(*) FROM duplicate_analysis),
    'total_duplicates', (SELECT COALESCE(SUM(duplicate_count - 1), 0) FROM duplicate_analysis)
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add enhanced system stats function
CREATE OR REPLACE FUNCTION get_system_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'totalEvents', (SELECT COUNT(*) FROM events WHERE is_active = true),
    'totalOccurrences', (SELECT COUNT(*) FROM event_occurrences),
    'activeProviders', (SELECT COUNT(*) FROM trivia_providers WHERE is_active = true),
    'upcomingOccurrences', (SELECT COUNT(*) FROM event_occurrences WHERE occurrence_date >= CURRENT_DATE),
    'statusBreakdown', (
      SELECT json_object_agg(status, count)
      FROM (
        SELECT status, COUNT(*) as count
        FROM event_occurrences 
        WHERE occurrence_date >= CURRENT_DATE
        GROUP BY status
      ) status_counts
    ),
    'frequencyBreakdown', (
      SELECT json_object_agg(frequency, count)
      FROM (
        SELECT frequency, COUNT(*) as count
        FROM events 
        WHERE is_active = true
        GROUP BY frequency
      ) freq_counts
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;