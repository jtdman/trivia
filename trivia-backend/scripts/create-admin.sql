-- Script to create an admin user for development
-- Replace 'your-email@example.com' with your actual email

-- First, check if the user exists
DO $$
DECLARE
    user_email TEXT := 'your-email@example.com';
    user_id UUID;
BEGIN
    -- Get the user ID
    SELECT id INTO user_id FROM auth.users WHERE email = user_email;
    
    IF user_id IS NOT NULL THEN
        -- Update the user profile to admin
        UPDATE public.user_profiles 
        SET role = 'admin', 
            display_name = 'Admin User'
        WHERE id = user_id;
        
        RAISE NOTICE 'User % has been made an admin', user_email;
    ELSE
        RAISE NOTICE 'User % not found. Please create the account first.', user_email;
    END IF;
END $$;