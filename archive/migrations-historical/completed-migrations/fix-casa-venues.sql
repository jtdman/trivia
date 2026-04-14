-- Fix Casa Jose/Casa Mexicana venue issues
-- Issue 1: Casa Jose Franklin has incorrect bingo event (should have no events)
-- Issue 2: Casa Mexicana Shelbyville is missing from database

-- First, delete the incorrect Casa Jose Franklin bingo event
DELETE FROM events 
WHERE venue_id = 'acc3aa0c-db52-447e-b351-77c162001ef9';

-- Update the Casa Jose Franklin venue to indicate it needs review (no events)
UPDATE venues 
SET verification_status = 'needs_review'
WHERE id = 'acc3aa0c-db52-447e-b351-77c162001ef9';

-- Add Casa Mexicana Shelbyville venue (if it doesn't already exist)
-- Note: This would need to be done through the import process or with proper Google Places lookup
-- The venue should be:
-- Name: Casa Mexicana
-- Address: Shelbyville, TN
-- Event: Battle Bingo, Tuesday 6:30 PM

-- Verify Casa Jose Franklin now has no events
SELECT 
    v.name_original,
    v.google_name,
    v.google_formatted_address,
    v.verification_status,
    COUNT(e.id) as event_count
FROM venues v
LEFT JOIN events e ON v.id = e.venue_id
WHERE v.id = 'acc3aa0c-db52-447e-b351-77c162001ef9'
GROUP BY v.id, v.name_original, v.google_name, v.google_formatted_address, v.verification_status;