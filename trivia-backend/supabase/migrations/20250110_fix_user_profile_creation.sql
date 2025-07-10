-- Fix user profile creation workflow
-- This migration adds automatic user profile creation when users sign up

-- First, ensure we have the correct RLS policies for user_profiles table
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can create own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

-- Create comprehensive RLS policies for user_profiles
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can create own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Platform admins can manage all profiles
CREATE POLICY "Platform admins can manage all profiles" ON user_profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role = 'platform_admin'
    )
  );

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    'staff', -- Default role for new users
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger to automatically create user profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to promote users to different roles (platform admin only)
CREATE OR REPLACE FUNCTION public.update_user_role(
  user_id UUID,
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
    RAISE EXCEPTION 'Invalid role specified';
  END IF;
  
  -- Update the user role
  UPDATE user_profiles
  SET role = new_role, updated_at = NOW()
  WHERE id = user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.user_profiles TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_role(UUID, TEXT) TO authenticated;

-- Create admin user function (for initial setup)
CREATE OR REPLACE FUNCTION public.create_admin_user(
  admin_email TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  -- This can only be run by existing platform admins or if no admins exist
  IF EXISTS (SELECT 1 FROM user_profiles WHERE role = 'platform_admin') THEN
    -- Check if current user is platform admin
    IF NOT EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'platform_admin'
    ) THEN
      RAISE EXCEPTION 'Only platform admins can create new admin users';
    END IF;
  END IF;
  
  -- Update user to platform admin
  UPDATE user_profiles
  SET role = 'platform_admin', updated_at = NOW()
  WHERE email = admin_email;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User with email % not found', admin_email;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.create_admin_user(TEXT) TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates user profile when auth user is created';
COMMENT ON FUNCTION public.update_user_role(UUID, TEXT) IS 'Allows platform admins to change user roles';
COMMENT ON FUNCTION public.create_admin_user(TEXT) IS 'Promotes a user to platform admin (requires existing admin or empty admin table)';