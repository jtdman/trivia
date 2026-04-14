-- Provider Authentication and Event Management System
-- This migration adds provider authentication, enhanced event occurrences, and admin approval system

-- 1. Add authentication fields to trivia_providers
ALTER TABLE trivia_providers 
ADD COLUMN auth_user_id UUID REFERENCES auth.users(id),
ADD COLUMN auth_status TEXT DEFAULT 'pending' CHECK (auth_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN approval_notes TEXT,
ADD COLUMN approved_by UUID REFERENCES auth.users(id),
ADD COLUMN approved_at TIMESTAMPTZ;

-- 2. Create provider signup table for manual approval workflow
CREATE TABLE provider_signups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID REFERENCES trivia_providers(id),
  business_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  business_website TEXT,
  verification_notes TEXT,
  auth_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ
);

-- 3. Update event_occurrences table with enhanced status and fields
ALTER TABLE event_occurrences 
ALTER COLUMN status TYPE TEXT,
DROP CONSTRAINT IF EXISTS event_occurrences_status_check,
ADD CONSTRAINT event_occurrences_status_check 
  CHECK (status IN ('scheduled', 'confirmed', 'cancelled', 'completed'));

-- Add fields for themed events and provider management
ALTER TABLE event_occurrences
ADD COLUMN is_themed BOOLEAN DEFAULT FALSE,
ADD COLUMN theme_name TEXT,
ADD COLUMN theme_description TEXT,
ADD COLUMN confirmed_by UUID REFERENCES auth.users(id),
ADD COLUMN confirmed_at TIMESTAMPTZ,
ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();

-- 4. Add approval system fields to venues and events
ALTER TABLE venues 
ADD COLUMN status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
ADD COLUMN approved_by UUID REFERENCES auth.users(id),
ADD COLUMN approved_at TIMESTAMPTZ;

ALTER TABLE events
ADD COLUMN status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
ADD COLUMN approved_by UUID REFERENCES auth.users(id),
ADD COLUMN approved_at TIMESTAMPTZ;

-- 5. Update user_profiles with new roles
ALTER TABLE user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_role_check,
ADD CONSTRAINT user_profiles_role_check 
  CHECK (role IN ('platform_admin', 'trivia_host', 'venue_owner', 'staff'));

-- 6. Create admin_users table for god-level access
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

-- 7. Create provider_users table for linking users to providers
CREATE TABLE IF NOT EXISTS provider_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES trivia_providers(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'editor')),
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider_id)
);

-- 8. Create notifications table for admin notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('new_provider', 'new_venue', 'new_event', 'provider_signup')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_id UUID, -- Can reference provider, venue, or event
  is_read BOOLEAN DEFAULT FALSE,
  created_for UUID REFERENCES auth.users(id), -- NULL means for all admins
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Create indexes for performance
CREATE INDEX idx_trivia_providers_auth_user_id ON trivia_providers(auth_user_id);
CREATE INDEX idx_trivia_providers_auth_status ON trivia_providers(auth_status);
CREATE INDEX idx_provider_signups_auth_user_id ON provider_signups(auth_user_id);
CREATE INDEX idx_event_occurrences_status ON event_occurrences(status);
CREATE INDEX idx_event_occurrences_occurrence_date ON event_occurrences(occurrence_date);
CREATE INDEX idx_event_occurrences_is_themed ON event_occurrences(is_themed);
CREATE INDEX idx_venues_status ON venues(status);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_admin_users_user_id ON admin_users(user_id);
CREATE INDEX idx_provider_users_user_id ON provider_users(user_id);
CREATE INDEX idx_provider_users_provider_id ON provider_users(provider_id);
CREATE INDEX idx_notifications_created_for ON notifications(created_for);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- 10. Create updated_at triggers
CREATE TRIGGER trigger_event_occurrences_updated_at
    BEFORE UPDATE ON event_occurrences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 11. Enable RLS on new tables
ALTER TABLE provider_signups ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 12. RLS Policies for provider_signups
CREATE POLICY "Users can view own provider signups" 
  ON provider_signups FOR SELECT 
  USING (auth_user_id = auth.uid());

CREATE POLICY "Users can create provider signups" 
  ON provider_signups FOR INSERT 
  WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "Admins can view all provider signups" 
  ON provider_signups FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid()
    )
  );

-- 13. RLS Policies for admin_users
CREATE POLICY "Admins can view admin users" 
  ON admin_users FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid()
    )
  );

-- 14. RLS Policies for provider_users
CREATE POLICY "Users can view own provider associations" 
  ON provider_users FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Provider admins can view their provider users" 
  ON provider_users FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM provider_users pu 
      WHERE pu.provider_id = provider_users.provider_id 
      AND pu.user_id = auth.uid() 
      AND pu.role = 'admin'
    )
  );

-- 15. RLS Policies for notifications
CREATE POLICY "Users can view own notifications" 
  ON notifications FOR SELECT 
  USING (
    created_for = auth.uid() OR 
    (created_for IS NULL AND EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid()
    ))
  );

CREATE POLICY "Users can update own notifications" 
  ON notifications FOR UPDATE 
  USING (
    created_for = auth.uid() OR 
    (created_for IS NULL AND EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid()
    ))
  );

-- 16. Update existing RLS policies for events to show approved content
DROP POLICY IF EXISTS "Authenticated users can view active events" ON events;
CREATE POLICY "Authenticated users can view approved active events" 
  ON events FOR SELECT 
  USING (is_active = true AND status = 'approved');

-- Admin override policy for events
CREATE POLICY "Admins can view all events" 
  ON events FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid()
    )
  );

-- Provider users can view their provider's events
CREATE POLICY "Provider users can view their events" 
  ON events FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM provider_users pu 
      WHERE pu.provider_id = events.provider_id 
      AND pu.user_id = auth.uid()
    )
  );

-- 17. Similar policies for venues
DROP POLICY IF EXISTS "Authenticated users can view all venues" ON venues;
CREATE POLICY "Authenticated users can view approved venues" 
  ON venues FOR SELECT 
  USING (status = 'approved');

CREATE POLICY "Admins can view all venues" 
  ON venues FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid()
    )
  );

-- 18. Policies for event_occurrences
ALTER TABLE event_occurrences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view scheduled and confirmed occurrences" 
  ON event_occurrences FOR SELECT 
  USING (
    status IN ('scheduled', 'confirmed') AND
    EXISTS (
      SELECT 1 FROM events e 
      WHERE e.id = event_occurrences.event_id 
      AND e.is_active = true 
      AND e.status = 'approved'
    )
  );

CREATE POLICY "Provider users can view their occurrences" 
  ON event_occurrences FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM events e
      JOIN provider_users pu ON e.provider_id = pu.provider_id
      WHERE e.id = event_occurrences.event_id 
      AND pu.user_id = auth.uid()
    )
  );

CREATE POLICY "Provider users can manage their occurrences" 
  ON event_occurrences FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM events e
      JOIN provider_users pu ON e.provider_id = pu.provider_id
      WHERE e.id = event_occurrences.event_id 
      AND pu.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all occurrences" 
  ON event_occurrences FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid()
    )
  );

-- 19. Function to create notification for admin approval
CREATE OR REPLACE FUNCTION create_admin_notification(
  notification_type TEXT,
  notification_title TEXT,
  notification_message TEXT,
  related_record_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO notifications (type, title, message, related_id)
  VALUES (notification_type, notification_title, notification_message, related_record_id)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 20. Insert your existing admin user (this will need to be updated with actual user ID)
-- This is a placeholder - you'll need to update with the actual UUID after creating the account
-- INSERT INTO admin_users (user_id, email, role) 
-- VALUES ('YOUR_USER_UUID_HERE', 'your-email@example.com', 'super_admin');

-- 21. Set existing scraped content as approved
UPDATE venues SET status = 'approved', approved_at = NOW() WHERE status IS NULL OR status = 'pending';
UPDATE events SET status = 'approved', approved_at = NOW() WHERE status IS NULL OR status = 'pending';
UPDATE trivia_providers SET auth_status = 'approved', approved_at = NOW() 
WHERE name IN ('Challenge Entertainment', 'NerdyTalk Trivia', 'BrainBlast Trivia');