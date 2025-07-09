-- Update role system to distinguish platform admin from regular users
-- Run this script to update the role constraints and set your platform admin role

-- First, update the constraint to allow the new roles
ALTER TABLE public.user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_role_check;

ALTER TABLE public.user_profiles 
ADD CONSTRAINT user_profiles_role_check 
CHECK (role IN ('platform_admin', 'trivia_host', 'venue_owner', 'staff'));

-- Update Jason's account to platform_admin (god access)
UPDATE public.user_profiles 
SET role = 'platform_admin' 
WHERE id = '76446aa0-91ad-47a9-af49-b10aeee9c30c';

-- Verify the update
SELECT 
  u.email,
  up.display_name,
  up.role,
  up.updated_at
FROM user_profiles up
JOIN auth.users u ON u.id = up.id
WHERE up.role = 'platform_admin';

-- Show role definitions for reference:
/*
Role Hierarchy:

1. platform_admin (Business Owner - Jason)
   - Full system access
   - Can see/edit all venues and events
   - Can manage all users and roles
   - Can access system-wide analytics

2. trivia_host (Trivia Companies)
   - Manage venues they're assigned to
   - Create/edit events for their venues
   - Can invite team members
   - Limited to their scope

3. venue_owner (Bar/Restaurant Owners)
   - Manage their specific venue
   - Work with trivia hosts on events
   - Usually single venue focus

4. staff (Team Members)
   - Assist with assigned venues/events
   - Limited permissions
   - Cannot invite others
*/