-- RESET USER SYSTEM WITH CLEAN ARCHITECTURE
-- This completely resets the user management system with proper Supabase patterns

-- 1. DROP EXISTING USER PROFILE STRUCTURES
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.update_user_role(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.create_admin_user(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_email(UUID) CASCADE;

-- Drop all existing policies on user_profiles
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can create own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Platform admins can manage all profiles" ON user_profiles;

-- 2. RECREATE USER_PROFILES TABLE WITH CLEAN STRUCTURE
DROP TABLE IF EXISTS user_profiles CASCADE;

CREATE TABLE user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('platform_admin', 'trivia_host', 'venue_owner', 'staff')),
  provider_id UUID REFERENCES trivia_providers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 3. CREATE PROPER RLS POLICIES
-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile (but not role)
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Platform admins can do everything
CREATE POLICY "Platform admins full access" ON user_profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role = 'platform_admin'
    )
  );

-- Allow users to insert their own profile (for auto-creation)
CREATE POLICY "Users can create own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 4. CREATE AUTOMATIC PROFILE CREATION TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, role, created_at, updated_at)
  VALUES (
    NEW.id,
    'staff', -- Default role for new users
    NOW(),
    NOW()
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Profile already exists, ignore
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. CREATE ROLE MANAGEMENT FUNCTIONS
-- Function to update user roles (platform admin only)
CREATE OR REPLACE FUNCTION public.update_user_role(
  target_user_id UUID,
  new_role TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  current_user_role TEXT;
BEGIN
  -- Check if current user is platform admin
  SELECT role INTO current_user_role
  FROM user_profiles
  WHERE id = auth.uid();
  
  IF current_user_role != 'platform_admin' THEN
    RAISE EXCEPTION 'Only platform admins can change user roles';
  END IF;
  
  -- Validate role
  IF new_role NOT IN ('platform_admin', 'trivia_host', 'venue_owner', 'staff') THEN
    RAISE EXCEPTION 'Invalid role specified. Must be: platform_admin, trivia_host, venue_owner, or staff';
  END IF;
  
  -- Update the user role
  UPDATE user_profiles
  SET role = new_role, updated_at = NOW()
  WHERE id = target_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found for ID: %', target_user_id;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to promote user to admin by email (god-mode setup)
CREATE OR REPLACE FUNCTION public.create_platform_admin(
  admin_email TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  admin_user_id UUID;
  existing_admin_count INTEGER;
BEGIN
  -- Find user by email in auth.users
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = admin_email;
  
  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'No user found with email: %', admin_email;
  END IF;
  
  -- Check if any platform admins exist
  SELECT COUNT(*) INTO existing_admin_count
  FROM user_profiles
  WHERE role = 'platform_admin';
  
  -- If admins exist, check if current user is admin
  IF existing_admin_count > 0 THEN
    IF NOT EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'platform_admin'
    ) THEN
      RAISE EXCEPTION 'Only existing platform admins can create new admin users';
    END IF;
  END IF;
  
  -- Create or update user profile to platform admin
  INSERT INTO user_profiles (id, role, created_at, updated_at)
  VALUES (admin_user_id, 'platform_admin', NOW(), NOW())
  ON CONFLICT (id) 
  DO UPDATE SET 
    role = 'platform_admin', 
    updated_at = NOW();
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user details with email (for admin interface)
CREATE OR REPLACE FUNCTION public.get_user_with_email(user_id UUID)
RETURNS TABLE(
  id UUID,
  email TEXT,
  display_name TEXT,
  role TEXT,
  provider_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.id,
    au.email,
    up.display_name,
    up.role,
    up.provider_id,
    up.created_at,
    up.updated_at
  FROM user_profiles up
  JOIN auth.users au ON up.id = au.id
  WHERE up.id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to list all users with emails (platform admin only)
CREATE OR REPLACE FUNCTION public.list_all_users()
RETURNS TABLE(
  id UUID,
  email TEXT,
  display_name TEXT,
  role TEXT,
  provider_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
DECLARE
  current_user_role TEXT;
BEGIN
  -- Check if current user is platform admin
  SELECT up.role INTO current_user_role
  FROM user_profiles up
  WHERE up.id = auth.uid();
  
  IF current_user_role != 'platform_admin' THEN
    RAISE EXCEPTION 'Only platform admins can list all users';
  END IF;
  
  RETURN QUERY
  SELECT 
    up.id,
    au.email,
    up.display_name,
    up.role,
    up.provider_id,
    up.created_at,
    up.updated_at
  FROM user_profiles up
  JOIN auth.users au ON up.id = au.id
  ORDER BY up.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. GRANT PERMISSIONS
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.user_profiles TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_role(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_platform_admin(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_with_email(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_all_users() TO authenticated;

-- 7. ADD HELPFUL COMMENTS
COMMENT ON TABLE user_profiles IS 'User profiles with roles and additional data (emails stored in auth.users)';
COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates user profile when auth user is created';
COMMENT ON FUNCTION public.update_user_role(UUID, TEXT) IS 'Allows platform admins to change user roles';
COMMENT ON FUNCTION public.create_platform_admin(TEXT) IS 'Promotes a user to platform admin by email (god-mode setup)';
COMMENT ON FUNCTION public.get_user_with_email(UUID) IS 'Gets user profile with email for admin interfaces';
COMMENT ON FUNCTION public.list_all_users() IS 'Lists all users with emails (platform admin only)';

-- 8. CREATE UPDATED_AT TRIGGER
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();