-- Create first admin user
-- Run this after creating a user account through the web interface
-- Replace 'your-email@example.com' with the actual email you used to register

-- Method 1: If you know the email address
UPDATE user_profiles 
SET role = 'admin' 
WHERE id = (
  SELECT id FROM auth.users 
  WHERE email = 'your-email@example.com'
);

-- Method 2: If you want to see all users first
-- SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC LIMIT 5;

-- Method 3: Make the most recent user an admin
-- UPDATE user_profiles 
-- SET role = 'admin' 
-- WHERE id = (
--   SELECT id FROM auth.users 
--   ORDER BY created_at DESC 
--   LIMIT 1
-- );

-- Verify the admin user was created
SELECT 
  up.id,
  u.email,
  up.display_name,
  up.role,
  up.created_at
FROM user_profiles up
JOIN auth.users u ON u.id = up.id
WHERE up.role = 'admin';