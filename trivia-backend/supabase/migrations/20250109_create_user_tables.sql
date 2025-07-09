-- Create user_profiles table to extend Supabase auth.users
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  role TEXT CHECK (role IN ('trivia_host', 'venue_owner', 'admin')),
  provider_id UUID REFERENCES public.trivia_providers(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_venues table for venue permissions
CREATE TABLE IF NOT EXISTS public.user_venues (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'host')),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  granted_by UUID REFERENCES auth.users(id),
  PRIMARY KEY (user_id, venue_id)
);

-- Create indexes for performance
CREATE INDEX idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX idx_user_profiles_provider_id ON public.user_profiles(provider_id);
CREATE INDEX idx_user_venues_venue_id ON public.user_venues(venue_id);
CREATE INDEX idx_user_venues_user_id ON public.user_venues(user_id);

-- Enable RLS on new tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_venues ENABLE ROW LEVEL SECURITY;

-- Create function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create updated_at trigger for user_profiles
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for user_profiles
CREATE POLICY "Users can view own profile" 
  ON public.user_profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON public.user_profiles FOR UPDATE 
  USING (auth.uid() = id);

-- RLS Policies for user_venues
CREATE POLICY "Users can view their venue associations" 
  ON public.user_venues FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Venue owners can manage permissions" 
  ON public.user_venues FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_venues owner_check
      WHERE owner_check.venue_id = user_venues.venue_id 
      AND owner_check.user_id = auth.uid()
      AND owner_check.role = 'owner'
    )
  );

-- RLS Policies for venues (update existing table)
CREATE POLICY "Authenticated users can view all venues" 
  ON public.venues FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert venues" 
  ON public.venues FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update venues they manage" 
  ON public.venues FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_venues 
      WHERE user_venues.venue_id = venues.id 
      AND user_venues.user_id = auth.uid()
    )
  );

-- RLS Policies for events (update existing table)
CREATE POLICY "Authenticated users can view active events" 
  ON public.events FOR SELECT 
  USING (is_active = true OR auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage events for their venues" 
  ON public.events FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_venues 
      WHERE user_venues.venue_id = events.venue_id 
      AND user_venues.user_id = auth.uid()
    )
  );

-- Add created_by columns to track who created venues and events
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);