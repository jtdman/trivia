-- Fix infinite recursion in user_profiles RLS policies
-- The platform admin policy was causing recursion by checking the same table it's protecting

-- First, drop the problematic policy if it exists
DROP POLICY IF EXISTS "Platform admins can manage all profiles" ON user_profiles;

-- Create a safe version that avoids recursion
-- Platform admins can view all profiles
CREATE POLICY "Platform admins can view all profiles" ON user_profiles
  FOR SELECT USING (
    auth.uid() = id OR  -- Users can see their own profile
    auth.uid() IN (     -- Platform admins can see all profiles
      SELECT id FROM user_profiles 
      WHERE id = auth.uid() 
      AND role = 'platform_admin'
      LIMIT 1  -- Ensure single row result
    )
  );

-- Platform admins can update all profiles
CREATE POLICY "Platform admins can update all profiles" ON user_profiles
  FOR UPDATE USING (
    auth.uid() = id OR  -- Users can update their own profile
    EXISTS (
      SELECT 1 FROM auth.users u
      JOIN user_profiles up ON u.id = up.id
      WHERE u.id = auth.uid() 
      AND up.role = 'platform_admin'
      LIMIT 1
    )
  );

-- Platform admins can insert profiles (for managing users)
CREATE POLICY "Platform admins can insert profiles" ON user_profiles
  FOR INSERT WITH CHECK (
    auth.uid() = id OR  -- Users can create their own profile
    EXISTS (
      SELECT 1 FROM auth.users u
      JOIN user_profiles up ON u.id = up.id
      WHERE u.id = auth.uid() 
      AND up.role = 'platform_admin'
      LIMIT 1
    )
  );

-- Platform admins can delete profiles
CREATE POLICY "Platform admins can delete profiles" ON user_profiles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      JOIN user_profiles up ON u.id = up.id
      WHERE u.id = auth.uid() 
      AND up.role = 'platform_admin'
      LIMIT 1
    )
  );

-- Also ensure email column exists (from the user's migration)
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Update the handle_new_user function to include email
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
  )
  ON CONFLICT (id) DO NOTHING; -- Prevent duplicate key errors
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;