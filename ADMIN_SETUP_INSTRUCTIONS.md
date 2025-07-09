# Admin Interface Setup Instructions

## Phase 1 Completed ✅

The following has been implemented:

### Database Setup
- Created migration file: `trivia-backend/supabase/migrations/20250109_create_user_tables.sql`
- Tables added:
  - `user_profiles` - Extends Supabase auth.users
  - `user_venues` - Manages venue permissions
- RLS policies configured for secure access

### Frontend Components
- **Authentication Context** (`auth_context.tsx`) - Manages user state
- **Admin Route Guard** (`AdminRoute.tsx`) - Protects admin pages
- **Admin Layout** (`AdminLayout.tsx`) - Navigation and layout
- **Admin Login** (`AdminLogin.tsx`) - Login page
- **Admin Dashboard** (`AdminDashboard.tsx`) - Overview page
- **App Router** (`AppRouter.tsx`) - Route configuration

### Routes Configured
- `/admin/login` - Login page
- `/admin` - Dashboard (protected)
- `/admin/venues` - Venue management (placeholder)
- `/admin/events` - Event management (placeholder)
- `/admin/team` - Team management (placeholder)
- `/admin/profile` - User profile (placeholder)

## Next Steps

### 1. Apply Database Migration
```bash
# Connect to your Supabase project and run the migration
cd trivia-backend
# Apply the migration using Supabase CLI or dashboard
```

### 2. Configure Supabase Auth
1. Go to your Supabase dashboard
2. Navigate to Authentication > Providers
3. Enable Email/Password authentication
4. Optionally enable OAuth providers (Google, Facebook)
5. Configure email templates for verification/reset

### 3. Test the Admin Interface
1. Start the dev server: `pnpm dev`
2. Navigate to `/admin`
3. You'll be redirected to login
4. Create a test account
5. Update the user's role in the database:
   ```sql
   UPDATE user_profiles 
   SET role = 'admin' 
   WHERE id = 'your-user-id';
   ```

### 4. Create First Admin User
After creating your first user via the UI:
```sql
-- Make a user an admin
UPDATE user_profiles 
SET role = 'admin' 
WHERE id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');
```

## Phase 2 Preview: Venue Management

Next phase will implement:
- Venue CRUD operations
- Google Places integration for verification
- Claim existing venue functionality
- Venue list with search/filters

## Environment Variables Needed

Make sure these are set in your `.env`:
```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Security Notes

- All admin routes are protected by authentication
- RLS policies ensure users can only manage their own venues
- The `created_by` columns track ownership
- Venue owners can grant permissions to other users

## Current Limitations

1. Registration is open to anyone - you may want to restrict this
2. No email verification required yet
3. Password reset functionality needs to be implemented
4. Team invitation system not yet built

## Testing Checklist

- [ ] Database migration applied successfully
- [ ] Can navigate to /admin and see login page
- [ ] Can create new account
- [ ] Can login with created account
- [ ] Admin dashboard loads after login
- [ ] Navigation works between admin pages
- [ ] Dark/light theme toggle works
- [ ] Mobile menu works correctly
- [ ] Logout functionality works