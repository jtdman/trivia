-- Create trivia_providers table for managing trivia companies
-- This allows events to be associated with specific trivia providers or marked as self-hosted

-- Create the trivia_providers table
CREATE TABLE IF NOT EXISTS public.trivia_providers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    website VARCHAR(500),
    phone VARCHAR(50),
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_trivia_providers_is_active ON public.trivia_providers(is_active);
CREATE INDEX IF NOT EXISTS idx_trivia_providers_name ON public.trivia_providers(name);

-- Add some sample trivia providers
INSERT INTO public.trivia_providers (name, website, is_active) VALUES
('Geeks Who Drink', 'https://www.geekswhodrink.com', true),
('King Trivia', 'https://www.kingtrivia.com', true),
('Trivia Mafia', 'https://www.triviamafia.com', true),
('Sporcle Live', 'https://live.sporcle.com', true),
('Quiz Night America', 'https://www.quiznightamerica.com', true)
ON CONFLICT (name) DO NOTHING;

-- Add RLS policies for trivia_providers
ALTER TABLE public.trivia_providers ENABLE ROW LEVEL SECURITY;

-- Everyone can read active providers
CREATE POLICY "Users can view active providers" ON public.trivia_providers
    FOR SELECT USING (is_active = true);

-- Only platform admins can manage providers
CREATE POLICY "Platform admins can manage providers" ON public.trivia_providers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() 
            AND role = 'platform_admin'
        )
    );

-- Update the events table to ensure provider_id references trivia_providers
-- Note: provider_id can be null for self-hosted events
ALTER TABLE public.events 
DROP CONSTRAINT IF EXISTS events_provider_id_fkey;

ALTER TABLE public.events 
ADD CONSTRAINT events_provider_id_fkey 
FOREIGN KEY (provider_id) REFERENCES public.trivia_providers(id) ON DELETE SET NULL;

-- Add index for faster provider queries on events
CREATE INDEX IF NOT EXISTS idx_events_provider_id ON public.events(provider_id);

-- Update existing events to set provider_id to null (self-hosted) if not already set
UPDATE public.events 
SET provider_id = NULL 
WHERE provider_id IS NOT NULL 
  AND provider_id NOT IN (SELECT id FROM public.trivia_providers);

-- Verify the setup
SELECT 
    COUNT(*) as total_providers,
    COUNT(*) FILTER (WHERE is_active = true) as active_providers
FROM public.trivia_providers;

SELECT 
    COUNT(*) as total_events,
    COUNT(*) FILTER (WHERE provider_id IS NULL) as self_hosted_events,
    COUNT(*) FILTER (WHERE provider_id IS NOT NULL) as provider_events
FROM public.events;