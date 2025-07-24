-- Create NerdyTalk Test Provider Account
-- Run this in your Supabase SQL editor

-- Step 1: First create the user account in Supabase Auth
-- Go to Authentication > Users in Supabase dashboard and manually create:
-- Email: nerdytalk@test.com
-- Password: test123456
-- Or use the signup form at /admin/register

-- Step 2: Get the NerdyTalk provider ID
-- (This should be: 3e3b8ff6-e564-41e1-bf30-b19f10ffc5ce)

-- Step 3: After creating the user account, get the user ID and run this:

-- REPLACE 'USER_ID_HERE' with the actual user ID from auth.users
INSERT INTO provider_users (user_id, provider_id, role) 
VALUES (
  'USER_ID_HERE', 
  '3e3b8ff6-e564-41e1-bf30-b19f10ffc5ce', 
  'admin'
);

-- Step 4: Update the provider status to approved (optional)
UPDATE trivia_providers 
SET status = 'approved'
WHERE id = '3e3b8ff6-e564-41e1-bf30-b19f10ffc5ce';

-- Verify the setup:
SELECT 
  u.email,
  tp.name as provider_name,
  pu.role
FROM auth.users u
JOIN provider_users pu ON u.id = pu.user_id
JOIN trivia_providers tp ON pu.provider_id = tp.id
WHERE tp.id = '3e3b8ff6-e564-41e1-bf30-b19f10ffc5ce';