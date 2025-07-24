# Creating a Test Provider Account

## Steps to Create a Test Provider Account

1. **Sign up for a new account**
   - Go to http://localhost:5173/admin/register
   - Use email: testprovider@trivianearby.com (or any email you prefer)
   - Set a password

2. **Create a test provider in the database**
   ```sql
   -- Insert a test provider
   INSERT INTO trivia_providers (name, website, is_active, status) 
   VALUES ('Test Trivia Co', 'https://testtrivia.com', true, 'approved')
   RETURNING id;
   ```

3. **Link the user to the provider**
   ```sql
   -- Get the user ID for your test account
   SELECT id FROM auth.users WHERE email = 'testprovider@trivianearby.com';
   
   -- Link user to provider (replace IDs with actual values)
   INSERT INTO provider_users (user_id, provider_id, role) 
   VALUES ('USER_ID_HERE', 'PROVIDER_ID_HERE', 'admin');
   ```

4. **Add some test venues**
   ```sql
   -- Add test venues (replace PROVIDER_ID with actual value)
   INSERT INTO venues (name_original, address_original, verification_status, is_imported, created_by_user_id)
   VALUES 
   ('The Test Tavern', '123 Main St, Nashville, TN', 'verified', false, 'USER_ID_HERE'),
   ('Quiz Night Cafe', '456 Oak Ave, Nashville, TN', 'verified', false, 'USER_ID_HERE'),
   ('Trivia Sports Bar', '789 Broadway, Nashville, TN', 'verified', false, 'USER_ID_HERE');
   ```

5. **Create weekly trivia events**
   ```sql
   -- Create weekly events for each venue (replace IDs)
   INSERT INTO events (venue_id, provider_id, event_type, day_of_week, start_time, frequency, is_active)
   VALUES 
   -- Tuesday night at Test Tavern
   ('VENUE_ID_1', 'PROVIDER_ID', 'Weekly Trivia Night', 'Tuesday', '19:00:00', 'weekly', true),
   -- Wednesday at Quiz Night Cafe  
   ('VENUE_ID_2', 'PROVIDER_ID', 'Pub Quiz Wednesday', 'Wednesday', '20:00:00', 'weekly', true),
   -- Thursday at Trivia Sports Bar
   ('VENUE_ID_3', 'PROVIDER_ID', 'Sports Trivia Thursday', 'Thursday', '18:30:00', 'weekly', true);
   ```

## Quick Test Setup Script

Save this as a `.sql` file and run it after creating your test account:

```sql
-- Step 1: Insert test provider
INSERT INTO trivia_providers (name, website, is_active, status) 
VALUES ('Test Trivia Co', 'https://testtrivia.com', true, 'approved');

-- You'll need to manually:
-- 1. Create account at /admin/register
-- 2. Get the user_id and provider_id 
-- 3. Link them in provider_users table
-- 4. Add venues and events as shown above
```

## Testing the Filter

Once set up:
1. Sign in as your test provider account
2. Go to http://localhost:5173/admin/schedule
3. You'll see only your provider's events
4. Sign back in as god admin (jtdman+tfadmin@gmail.com)
5. Use the "All Providers" checkbox to toggle between all events and just your events