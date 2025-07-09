-- Clean up junk venue data and create filters for future imports
-- This removes obvious garbage data that shouldn't have been imported

-- First, let's see what we're about to delete
SELECT 
    'PREVIEW - Will be deleted' as action,
    name_original,
    address_original,
    verification_status,
    (SELECT COUNT(*) FROM events WHERE venue_id = venues.id) as event_count
FROM public.venues 
WHERE 
    -- Empty or meaningless names
    name_original = '' 
    OR name_original IS NULL
    OR name_original LIKE 'section_%'
    OR name_original LIKE '%section_%'
    OR name_original = 'Become a Host'
    OR name_original = 'Weekly Clues'
    OR name_original LIKE '%|%hosted by%'
    OR name_original = 'TENNESSEE'
    OR name_original = 'CDATA'
    
    -- Empty addresses for venues that should have them
    OR (address_original = '' AND google_formatted_address IS NULL)
    
    -- Obvious non-venue entries
    OR name_original LIKE '%PM,%'
    OR name_original LIKE '%AM,%'
    OR name_original LIKE '%hosted by%'
    OR name_original LIKE '%reminder%'
    OR name_original LIKE '%email%'
    
ORDER BY name_original;

-- Delete venues with 0 events that are clearly junk
DELETE FROM public.venues 
WHERE id IN (
    SELECT v.id 
    FROM public.venues v
    LEFT JOIN public.events e ON v.id = e.venue_id
    WHERE 
        -- Must have 0 events
        e.id IS NULL
        AND (
            -- Empty or meaningless names
            v.name_original = '' 
            OR v.name_original IS NULL
            OR v.name_original LIKE 'section_%'
            OR v.name_original LIKE '%section_%'
            OR v.name_original = 'Become a Host'
            OR v.name_original = 'Weekly Clues'
            OR v.name_original LIKE '%|%hosted by%'
            OR v.name_original = 'TENNESSEE'
            OR v.name_original = 'CDATA'
            
            -- Empty addresses for venues that should have them
            OR (v.address_original = '' AND v.google_formatted_address IS NULL)
            
            -- Obvious non-venue entries
            OR v.name_original LIKE '%PM,%'
            OR v.name_original LIKE '%AM,%'
            OR v.name_original LIKE '%hosted by%'
            OR v.name_original LIKE '%reminder%'
            OR v.name_original LIKE '%email%'
        )
);

-- Create a function to validate venue data before import
CREATE OR REPLACE FUNCTION is_valid_venue_data(
    venue_name TEXT,
    venue_address TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
    -- Check for invalid names
    IF venue_name IS NULL OR venue_name = '' THEN
        RETURN FALSE;
    END IF;
    
    -- Check for junk patterns
    IF venue_name LIKE 'section_%' 
        OR venue_name LIKE '%section_%'
        OR venue_name = 'Become a Host'
        OR venue_name = 'Weekly Clues'
        OR venue_name LIKE '%|%hosted by%'
        OR venue_name LIKE '%PM,%'
        OR venue_name LIKE '%AM,%'
        OR venue_name LIKE '%hosted by%'
        OR venue_name LIKE '%reminder%'
        OR venue_name LIKE '%email%'
        OR venue_name IN ('TENNESSEE', 'CDATA', 'TEXAS', 'FLORIDA', 'CALIFORNIA')
    THEN
        RETURN FALSE;
    END IF;
    
    -- Must have some kind of address information
    IF (venue_address IS NULL OR venue_address = '') THEN
        RETURN FALSE;
    END IF;
    
    -- Must be reasonable length
    IF LENGTH(venue_name) < 3 OR LENGTH(venue_name) > 100 THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to prevent junk data insertion
CREATE OR REPLACE FUNCTION prevent_junk_venue_insert() 
RETURNS TRIGGER AS $$
BEGIN
    IF NOT is_valid_venue_data(NEW.name_original, NEW.address_original) THEN
        RAISE EXCEPTION 'Invalid venue data: name=% address=%', NEW.name_original, NEW.address_original;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add the trigger (commented out initially - enable when ready)
-- DROP TRIGGER IF EXISTS prevent_junk_venues ON public.venues;
-- CREATE TRIGGER prevent_junk_venues
--     BEFORE INSERT ON public.venues
--     FOR EACH ROW
--     EXECUTE FUNCTION prevent_junk_venue_insert();

-- Show cleanup results
SELECT 
    'CLEANUP COMPLETE' as status,
    COUNT(*) as remaining_venues,
    COUNT(*) FILTER (WHERE verification_status = 'needs_review') as needs_review,
    COUNT(*) FILTER (WHERE verification_status = 'failed') as failed,
    COUNT(*) FILTER (WHERE verification_status = 'verified') as verified
FROM public.venues;