-- Update existing trivia_providers table to work with the admin interface

-- Add is_active column if it doesn't exist
ALTER TABLE public.trivia_providers 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Add some sample trivia providers if they don't exist
INSERT INTO public.trivia_providers (name, website, is_active) VALUES
('Geeks Who Drink', 'https://www.geekswhodrink.com', true),
('King Trivia', 'https://www.kingtrivia.com', true),
('Trivia Mafia', 'https://www.triviamafia.com', true),
('Sporcle Live', 'https://live.sporcle.com', true),
('Quiz Night America', 'https://www.quiznightamerica.com', true)
ON CONFLICT (name) DO NOTHING;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_trivia_providers_is_active ON public.trivia_providers(is_active);
CREATE INDEX IF NOT EXISTS idx_trivia_providers_name ON public.trivia_providers(name);

-- Enable RLS
ALTER TABLE public.trivia_providers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view active providers" ON public.trivia_providers;
DROP POLICY IF EXISTS "Platform admins can manage providers" ON public.trivia_providers;

-- Create RLS policies
CREATE POLICY "Users can view active providers" ON public.trivia_providers
    FOR SELECT USING (is_active = true);

CREATE POLICY "Platform admins can manage providers" ON public.trivia_providers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() 
            AND role = 'platform_admin'
        )
    );

-- Update the events table to ensure provider_id references trivia_providers
ALTER TABLE public.events 
DROP CONSTRAINT IF EXISTS events_provider_id_fkey;

ALTER TABLE public.events 
ADD CONSTRAINT events_provider_id_fkey 
FOREIGN KEY (provider_id) REFERENCES public.trivia_providers(id) ON DELETE SET NULL;

-- Add index for faster provider queries on events
CREATE INDEX IF NOT EXISTS idx_events_provider_id ON public.events(provider_id);

-- Set existing providers to active
UPDATE public.trivia_providers 
SET is_active = true 
WHERE is_active IS NULL;

-- Verify the setup
SELECT 
    COUNT(*) as total_providers,
    COUNT(*) FILTER (WHERE is_active = true) as active_providers
FROM public.trivia_providers;