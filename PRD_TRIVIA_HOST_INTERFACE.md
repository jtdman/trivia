# Product Requirements Document: Trivia Host Interface

## Overview
This PRD defines the requirements for a web-based interface that allows trivia hosts and venue owners to add and manage their venue and event information in the Trivia Nearby database.

## Goals
1. Enable trivia hosts to self-service venue and event management
2. Reduce manual data entry and maintenance burden
3. Ensure data quality through verification processes
4. Maintain existing database structure and relationships

## User Personas

### Primary: Trivia Host/Company
- Runs trivia events at multiple venues
- Needs to manage event schedules across locations
- Examples: Challenge Entertainment staff, independent trivia hosts

### Secondary: Venue Owner/Manager
- Owns/manages a single venue
- Wants to attract customers with trivia events
- May not run events themselves but hosts them

## Authentication & User Management

### Supabase Auth Integration
Leverage Supabase's built-in authentication system for user management.

### Profile & Authorization Tables
```sql
-- User profiles (extends Supabase auth.users)
user_profiles:
- id (UUID, Primary Key, Foreign Key → auth.users)
- display_name (TEXT)
- role (TEXT) - 'trivia_host', 'venue_owner', 'admin'
- provider_id (UUID, Foreign Key → trivia_providers, nullable)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)

-- Venue permissions
user_venues:
- user_id (UUID, Foreign Key → auth.users)
- venue_id (UUID, Foreign Key → venues)
- role (TEXT) - 'owner', 'manager', 'host'
- granted_at (TIMESTAMPTZ)
- granted_by (UUID, Foreign Key → auth.users)
```

### Authentication Flow
1. Supabase Auth handles:
   - Email/password registration with verification
   - OAuth providers (Google, Facebook, etc.)
   - Password reset via email
   - Session management with JWT tokens
   - Secure cookie-based sessions

2. Custom implementation:
   - Create user_profile on auth.users trigger
   - Role-based access control via RLS policies
   - Venue-level permissions

## Core Features

### 1. Venue Management

#### Add New Venue
**Input Fields:**
- Venue name (required)
- Street address (required)
- City, State, ZIP (required)
- Phone number (optional)
- Website (optional)
- Venue type (bar, restaurant, brewery, etc.)

**Process:**
1. User enters basic venue information
2. System attempts Google Places API match
3. If match found:
   - Display Google data for confirmation
   - User confirms or edits
   - Save with `verification_status = 'verified'`
4. If no match:
   - Save with original data
   - Set `verification_status = 'pending'`
   - Queue for manual review

#### Edit Existing Venue
- Only users with venue relationship can edit
- Cannot edit Google-verified fields directly
- Can request verification update
- Track edit history

#### Venue Dashboard
- List of user's venues
- Verification status indicators
- Quick stats (active events, upcoming events)
- Google metrics (rating, reviews) if available

### 2. Event Management

#### Add New Event
**Input Fields:**
- Select venue (from user's venues)
- Event type (dropdown: Live Trivia, Singo, Themed Trivia, etc.)
- Day of week
- Start time
- End time (optional)
- Frequency (weekly, bi-weekly, monthly, one-time)
- Start date
- End date (optional, for limited runs)
- Prize information:
  - Prize amount (optional)
  - Prize description (e.g., "Gift cards for top 3 teams")
- Max teams (optional)
- Special notes (optional)

**Validation:**
- Prevent double-booking (same venue, overlapping times)
- Require at least 1 hour duration if end time provided
- Start date cannot be in the past

#### Edit Event
- All fields editable except venue
- Option to apply changes to:
  - Future occurrences only
  - All occurrences
  - Specific date range

#### Cancel Event
- Cancel single occurrence
- Cancel all future occurrences
- Provide cancellation reason (stored in notes)

#### Event Calendar View
- Monthly calendar showing all events
- Filter by venue
- Click to view/edit event details
- Visual indicators for event status

### 3. Event Occurrence Management

#### View Occurrences
- List view of upcoming occurrences
- Filter by venue, date range, status
- Bulk actions (cancel multiple)

#### Manage Single Occurrence
- Mark as cancelled with reason
- Reschedule (creates new occurrence)
- Add notes (special theme, guest host, etc.)
- Mark as completed with actual times

### 4. Provider Management (Trivia Companies)

#### Provider Profile
- Company name
- Website
- Contact information
- Logo upload
- About/description

#### Team Management
- Invite team members via email
- Assign venues to team members
- Set permissions per venue

### 5. Reporting & Analytics

#### Basic Reports
- Event attendance trends
- Cancellation rates
- Venue performance comparison
- Prize money distributed

## User Interface Requirements

### Design Principles
- Mobile-responsive (hosts may update from venues)
- Dark mode support (matching main app)
- Simple, intuitive navigation
- Clear status indicators
- Bulk actions where appropriate

### Key Pages
1. **Dashboard** - Overview of all venues/events
2. **Venues** - List and manage venues
3. **Events** - List and manage events
4. **Calendar** - Visual event calendar
5. **Team** - Manage team members (for providers)
6. **Profile** - User settings and preferences

### UI Components
- Venue cards with verification badges
- Event cards with key details
- Calendar widget
- Time picker with common trivia times
- Status badges (active, cancelled, pending)
- Confirmation modals for destructive actions

## Technical Requirements

### Integration with Existing App
- Admin interface built within the existing React + Vite app
- Shared components and styling with main app
- Protected routes using Supabase Auth
- Reuse existing theme context and dark mode support
- Admin routes under `/admin` path

### Integration with Existing Database
- Respect existing foreign key relationships
- Maintain data integrity
- Use existing stored procedures where applicable
- Follow established naming conventions

### API Endpoints
```
Authentication (via Supabase):
// Handled by Supabase Auth SDK
// supabase.auth.signUp()
// supabase.auth.signInWithPassword()
// supabase.auth.signOut()
// supabase.auth.resetPasswordForEmail()
// supabase.auth.signInWithOAuth()

Venues:
GET    /api/venues (user's venues)
POST   /api/venues
GET    /api/venues/:id
PUT    /api/venues/:id
DELETE /api/venues/:id
POST   /api/venues/:id/verify

Events:
GET    /api/events (user's events)
POST   /api/events
GET    /api/events/:id
PUT    /api/events/:id
DELETE /api/events/:id
GET    /api/events/:id/occurrences
PUT    /api/events/:id/occurrences/:date

Provider:
GET    /api/provider/profile
PUT    /api/provider/profile
GET    /api/provider/team
POST   /api/provider/team/invite
DELETE /api/provider/team/:userId
```

### Performance Requirements
- Page load < 2 seconds
- API responses < 500ms
- Support 100+ concurrent users
- Efficient pagination for large datasets

### Security Requirements
- HTTPS only
- Input sanitization
- SQL injection prevention (via parameterized queries)
- Rate limiting on API endpoints
- CORS configuration
- Supabase handles session management

### Row Level Security (RLS) Policies
```sql
-- user_profiles policies
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- venues policies  
CREATE POLICY "Authenticated users can view all venues" ON venues
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert venues" ON venues
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update venues they manage" ON venues
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_venues 
      WHERE user_venues.venue_id = venues.id 
      AND user_venues.user_id = auth.uid()
    )
  );

-- events policies
CREATE POLICY "Anyone can view active events" ON events
  FOR SELECT USING (is_active = true);

CREATE POLICY "Users can manage events for their venues" ON events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_venues 
      WHERE user_venues.venue_id = events.venue_id 
      AND user_venues.user_id = auth.uid()
    )
  );

-- user_venues policies
CREATE POLICY "Users can view their venue associations" ON user_venues
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Venue owners can manage permissions" ON user_venues
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_venues owner_check
      WHERE owner_check.venue_id = user_venues.venue_id 
      AND owner_check.user_id = auth.uid()
      AND owner_check.role = 'owner'
    )
  );
```

## Verification Workflow

### Venue Verification Process
1. **Automatic Verification** (Google Places match)
   - Confidence threshold > 90%
   - Address components match
   - Name similarity > 80%

2. **Manual Review Queue** (Admin interface)
   - Pending venues list
   - Side-by-side comparison
   - Approve/reject/request-info actions
   - Bulk processing capabilities

3. **Verification States**
   - `pending` - Awaiting review
   - `verified` - Confirmed accurate
   - `failed` - Could not verify
   - `needs_review` - Requires user input

## Data Validation Rules

### Venue Validation
- Name: 2-100 characters
- Address: Valid format, geocodable
- Phone: Valid format (if provided)
- Website: Valid URL (if provided)

### Event Validation
- Time: Start < End (if end provided)
- Day: Valid day of week
- Frequency: Valid enum value
- Prize: Non-negative decimal
- Dates: Start date required, end date >= start date

## Admin Route Protection

### Route Guard Component
```typescript
// Protected route wrapper for admin pages
const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const { userProfile } = useUserProfile();
  
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/admin/login" />;
  if (!['admin', 'trivia_host', 'venue_owner'].includes(userProfile?.role)) {
    return <Navigate to="/" />;
  }
  
  return children;
};
```

### Admin Layout
- Shared admin navigation header
- Breadcrumb navigation
- User menu with profile/logout
- Mobile-friendly sidebar for navigation

## Migration & Rollout Plan

### Phase 1: Authentication System
1. Configure Supabase Auth with email/OAuth providers
2. Implement user_profiles table with RLS policies
3. Create auth flow UI components

### Phase 2: Basic Venue Management
1. Venue CRUD operations
2. Google Places integration
3. Verification workflow

### Phase 3: Event Management
1. Event CRUD operations
2. Calendar view
3. Occurrence management

### Phase 4: Provider Features
1. Team management
2. Multi-venue access
3. Bulk operations

### Phase 5: Analytics & Reporting
1. Basic reports
2. Export functionality
3. Advanced analytics

## Existing Data Migration Strategy

### Handling 722 Existing Venues
1. **Claim Process for Existing Venues**
   - Users can search and claim unowned venues
   - Require verification (business license, email domain, etc.)
   - Admin approval for sensitive venues
   - Prevent duplicate claims

2. **Challenge Entertainment Data**
   - Mark all current events as Challenge Entertainment owned
   - Create Challenge Entertainment admin account
   - Protect from unauthorized edits

3. **Orphaned Venues**
   - Remain publicly visible but unmanaged
   - Can be claimed by verified users
   - Admin can assign to users

## Success Metrics
- 50+ venues self-registered in first month
- 80% of new events added through interface
- < 5% verification failure rate
- 90% user satisfaction score
- 50% reduction in manual data entry time

## Future Enhancements
- Mobile app for on-the-go updates
- Integration with social media for event promotion
- Automated email reminders for hosts
- QR code check-in system
- Real-time attendance tracking
- Revenue tracking and reporting
- Integration with POS systems

## Appendix: Mock Data Examples

### Example Venue Object
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "name_original": "Murphy's Pub",
  "address_original": "123 Main St, Boston, MA 02101",
  "google_place_id": "ChIJN1t_tDeuEmsRUsoyG83frY4",
  "google_name": "Murphy's Pub & Grill",
  "google_formatted_address": "123 Main Street, Boston, MA 02101, USA",
  "google_location": "POINT(-71.057083 42.361145)",
  "google_rating": 4.2,
  "verification_status": "verified",
  "created_by": "550e8400-e29b-41d4-a716-446655440002"
}
```

### Example Event Object
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440003",
  "venue_id": "550e8400-e29b-41d4-a716-446655440001",
  "provider_id": "550e8400-e29b-41d4-a716-446655440004",
  "event_type": "Live Trivia",
  "day_of_week": "Tuesday",
  "start_time": "19:00:00",
  "end_time": "21:00:00",
  "frequency": "weekly",
  "prize_amount": 50.00,
  "prize_description": "$30 first place, $20 second place gift cards",
  "is_active": true,
  "created_by": "550e8400-e29b-41d4-a716-446655440002"
}
```