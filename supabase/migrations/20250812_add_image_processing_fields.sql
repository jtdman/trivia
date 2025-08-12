-- Add image processing tracking fields to venues table
ALTER TABLE venues 
ADD COLUMN IF NOT EXISTS image_processed_at TIMESTAMP WITH TIME ZONE;

-- Add index for finding venues that need processing
CREATE INDEX IF NOT EXISTS idx_venues_needs_image_processing 
ON venues(id) 
WHERE google_photo_reference IS NOT NULL 
AND thumbnail_url IS NULL;

-- Add comment to explain the field
COMMENT ON COLUMN venues.image_processed_at IS 'Timestamp when the venue image was last processed from Google Places API';