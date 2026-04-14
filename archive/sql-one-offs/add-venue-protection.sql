-- Add venue protection fields
-- This script adds is_imported and created_by fields to track venue ownership and protection

-- Add the new columns
ALTER TABLE public.venues 
ADD COLUMN IF NOT EXISTS is_imported BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Update existing imported venues to be protected
-- Set is_imported = true for venues that have Google data but no created_by
UPDATE public.venues 
SET is_imported = TRUE 
WHERE google_place_id IS NOT NULL 
  AND created_by IS NULL;

-- Create index for faster ownership queries
CREATE INDEX IF NOT EXISTS idx_venues_created_by ON public.venues(created_by);
CREATE INDEX IF NOT EXISTS idx_venues_is_imported ON public.venues(is_imported);

-- Update RLS policies to respect ownership
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view all venues" ON public.venues;
DROP POLICY IF EXISTS "Users can insert venues" ON public.venues;
DROP POLICY IF EXISTS "Users can update their own venues" ON public.venues;
DROP POLICY IF EXISTS "Platform admins can update any venue" ON public.venues;

-- Create new policies
CREATE POLICY "Users can view all venues" ON public.venues
    FOR SELECT USING (true);

CREATE POLICY "Users can insert venues" ON public.venues
    FOR INSERT WITH CHECK (
        auth.uid() = created_by OR 
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('platform_admin', 'trivia_host', 'venue_owner')
        )
    );

CREATE POLICY "Users can update their own venues" ON public.venues
    FOR UPDATE USING (
        auth.uid() = created_by OR
        EXISTS (
            SELECT 1 FROM public.user_venues 
            WHERE venue_id = public.venues.id 
            AND user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() 
            AND role = 'platform_admin'
        )
    );

-- Platform admins can delete venues (with restrictions in app logic)
CREATE POLICY "Platform admins can delete venues" ON public.venues
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() 
            AND role = 'platform_admin'
        )
    );

-- Verify the changes
SELECT 
    COUNT(*) as total_venues,
    COUNT(*) FILTER (WHERE is_imported = true) as imported_venues,
    COUNT(*) FILTER (WHERE created_by IS NOT NULL) as venues_with_owner
FROM public.venues;