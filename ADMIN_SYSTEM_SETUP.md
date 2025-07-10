# Admin System Setup & Usage Guide

## Overview
The Trivia Nearby admin system provides role-based access control for managing venues, events, providers, and users. This guide covers setup, configuration, and usage.

## 🔧 Database Setup

### 1. Apply Required Migration
First, apply the user profile creation migration to your Supabase instance:

```sql
-- File: trivia-backend/supabase/migrations/20250110_fix_user_profile_creation.sql
-- Run this migration in your Supabase SQL editor
```

This migration creates:
- Proper RLS policies for user profiles
- Automatic user profile creation trigger
- Role management functions
- Admin user creation function

### 2. Enable Required Features
Ensure these Supabase features are enabled:
- Row Level Security (RLS) on all tables
- Auth email confirmations (recommended)
- Custom SMTP (optional, for branded emails)

## 👤 User Roles

### Role Hierarchy
1. **Platform Admin** (`platform_admin`)
   - Full system access
   - Can manage all users, venues, events
   - Can change user roles
   - Access to user management interface

2. **Trivia Host** (`trivia_host`)
   - Can manage events across multiple venues
   - Can claim and manage venues
   - Limited administrative access

3. **Venue Owner** (`venue_owner`)
   - Can manage their own venues
   - Can create and manage events at their venues
   - Can claim venues they own

4. **Staff** (`staff`)
   - Basic access level
   - Can view public information
   - Default role for new users

## 🚀 Initial Setup

### Creating the First Admin User

#### Method 1: Direct Database Update (Recommended)
```sql
-- Update an existing user to platform admin
UPDATE user_profiles 
SET role = 'platform_admin', updated_at = NOW()
WHERE email = 'your-admin-email@example.com';
```

#### Method 2: Using Admin Function (After first admin exists)
```sql
SELECT create_admin_user('new-admin@example.com');
```

### Testing the Setup
1. Register a new user at `/admin/register`
2. Verify user profile is created automatically
3. Promote the user to platform admin
4. Test admin dashboard access

## 🔐 Authentication Flow

### User Registration Process
1. User submits registration form
2. Supabase creates auth user
3. Database trigger automatically creates user profile with 'staff' role
4. User receives email verification (if enabled)
5. User can log in and access appropriate features based on role

### Login Process
1. User enters credentials at `/admin/login`
2. Supabase authenticates user
3. App fetches user profile with role information
4. User is redirected to appropriate dashboard

### Error Handling
- Missing profiles are automatically created
- Clear error messages for auth failures
- Fallback mechanisms for role checking

## 🎯 Admin Interface Usage

### Accessing Admin Features
- **Admin Dashboard**: `/admin` - Overview and quick actions
- **Venues Management**: `/admin/venues` - Manage all venues
- **Events Management**: `/admin/events` - Manage all events
- **Provider Contacts**: `/admin/providers` - Manage trivia providers
- **User Management**: `/admin/team` - Manage user roles (platform admin only)

### User Management (Platform Admin Only)
1. Navigate to `/admin/team`
2. View all registered users
3. Click edit button next to user
4. Select new role from dropdown
5. Save changes

Role changes take effect immediately and update user permissions across the system.

### Venue Management
- **View All Venues**: See complete venue list with status
- **Claim Venues**: Allow venue owners to claim their establishments
- **Edit Venue Info**: Update venue details and verification status
- **Manage Events**: Create and edit events for venues

### Event Management
- **Create Events**: Set up new trivia events
- **Edit Events**: Modify existing event details
- **Event Status**: Track active vs inactive events
- **Provider Assignment**: Link events to trivia providers

## 🛡️ Security Features

### Row Level Security (RLS)
- All database tables use RLS policies
- Users can only access data appropriate to their role
- Platform admins have elevated access across all tables

### Role-Based Access Control
- UI elements show/hide based on user role
- API endpoints validate user permissions
- Database policies enforce access restrictions

### Data Protection
- User passwords handled by Supabase Auth
- No sensitive data stored in local storage
- All admin actions logged and auditable

## 🐛 Troubleshooting

### Common Issues

#### "Failed to load user profile"
**Cause**: User profile not created during registration
**Solution**: 
1. Check if migration was applied correctly
2. Verify RLS policies are active
3. Manually create profile if needed:
```sql
INSERT INTO user_profiles (id, email, role, created_at, updated_at)
VALUES (
  'user-uuid-from-auth-users',
  'user-email@example.com', 
  'staff',
  NOW(),
  NOW()
);
```

#### "Access denied" for admin features
**Cause**: User doesn't have appropriate role
**Solution**:
1. Verify user role in database: `SELECT * FROM user_profiles WHERE email = 'user@example.com'`
2. Update role if needed: `UPDATE user_profiles SET role = 'platform_admin' WHERE email = 'user@example.com'`

#### Registration not working
**Cause**: Email confirmation required or RLS blocking insert
**Solution**:
1. Check Supabase Auth settings
2. Verify RLS policies allow profile creation
3. Check browser console for specific errors

### Debug Steps
1. **Check Browser Console**: Look for authentication and API errors
2. **Verify Database State**: Use Supabase dashboard to check user_profiles table
3. **Test RLS Policies**: Use Supabase SQL editor to test policies
4. **Check Auth Status**: Verify Supabase auth state in browser dev tools

## 📊 Monitoring & Maintenance

### Regular Tasks
- Monitor user registrations and role assignments
- Review venue claim requests
- Update provider contact information
- Check for inactive events and venues

### Performance Monitoring
- Track user login patterns
- Monitor database query performance
- Review RLS policy effectiveness

### Backup Considerations
- User profiles and roles are critical data
- Venue ownership relationships should be backed up
- Event history may be valuable for analytics

## 🔄 Updates & Migrations

### Applying Schema Changes
1. Create migration in `trivia-backend/supabase/migrations/`
2. Test migration on staging/development
3. Apply to production during maintenance window
4. Update application code if needed

### Role System Changes
If adding new roles or permissions:
1. Update TypeScript interfaces in `src/lib/supabase.ts`
2. Update role checking logic in components
3. Add new RLS policies as needed
4. Update documentation

## 📞 Support

### For Developers
- Check TypeScript types in `src/lib/supabase.ts`
- Review auth context in `src/context/auth_context.tsx`
- Examine RLS policies in migration files

### For Administrators
- User management interface provides most common tasks
- Database queries can be run via Supabase dashboard
- Contact technical team for complex issues

---
*Last Updated: January 2025*
*Version: Admin System v1.0*