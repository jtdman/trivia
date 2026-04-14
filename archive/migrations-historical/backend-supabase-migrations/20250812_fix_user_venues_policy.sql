-- Fix infinite recursion in user_venues RLS policy
-- The issue is that the "Venue owners can manage permissions" policy queries user_venues within itself

-- Drop the problematic policy
DROP POLICY IF EXISTS "Venue owners can manage permissions" ON user_venues;

-- Create a simpler policy that doesn't cause recursion
-- Only allow users to manage their own venue associations, not others
CREATE POLICY "Users can manage their own venue associations" ON user_venues
  FOR ALL USING (user_id = auth.uid());

-- Allow admin users to manage all venue associations
CREATE POLICY "Admin users can manage all venue associations" ON user_venues
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.user_id = auth.uid() 
      AND admin_users.role = 'god'
    )
  );