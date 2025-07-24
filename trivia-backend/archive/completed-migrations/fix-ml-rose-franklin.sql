-- Fix ML Rose Franklin schedule discrepancy
-- Issue: ML Rose Franklin shows Tuesday 7:00 PM in database but should be Thursday 7:30 PM
-- Source: NerdyTalk website shows Thursday 7:30 PM for ML Rose Franklin location

-- Update the ML Rose Franklin venue events
UPDATE events 
SET 
    day_of_week = 'Thursday', 
    start_time = '19:30:00', 
    original_time_text = '7:30 PM'
WHERE venue_id = '6e26ae9f-d771-42f5-8c11-6caa74f543b3'
  AND provider_id = (SELECT id FROM trivia_providers WHERE name = 'NerdyTalk Trivia');

-- Verify the correction
SELECT 
    v.name_original,
    v.google_name,
    v.google_formatted_address,
    e.day_of_week,
    e.start_time,
    e.original_time_text,
    tp.name as provider
FROM venues v
JOIN events e ON v.id = e.venue_id
JOIN trivia_providers tp ON e.provider_id = tp.id
WHERE v.id = '6e26ae9f-d771-42f5-8c11-6caa74f543b3';