import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
  console.log('🚀 Running provider authentication migration...');
  
  try {
    // Step 1: Add columns to trivia_providers
    console.log('📝 Adding authentication fields to trivia_providers...');
    const { error: providerFieldsError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE trivia_providers 
        ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id),
        ADD COLUMN IF NOT EXISTS auth_status TEXT DEFAULT 'pending',
        ADD COLUMN IF NOT EXISTS approval_notes TEXT,
        ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
        ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
        
        ALTER TABLE trivia_providers 
        DROP CONSTRAINT IF EXISTS trivia_providers_auth_status_check,
        ADD CONSTRAINT trivia_providers_auth_status_check 
        CHECK (auth_status IN ('pending', 'approved', 'rejected'));
      `
    });
    if (providerFieldsError) throw providerFieldsError;
    console.log('✅ Provider fields added');

    // Step 2: Create admin_users table
    console.log('📝 Creating admin_users table...');
    const { error: adminTableError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS admin_users (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          email TEXT NOT NULL,
          role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          last_login TIMESTAMPTZ
        );
        
        ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Admins can view admin users" ON admin_users;
        CREATE POLICY "Admins can view admin users" 
          ON admin_users FOR SELECT 
          USING (
            EXISTS (
              SELECT 1 FROM admin_users 
              WHERE user_id = auth.uid()
            )
          );
      `
    });
    if (adminTableError) throw adminTableError;
    console.log('✅ Admin users table created');

    // Step 3: Create provider_users table
    console.log('📝 Creating provider_users table...');
    const { error: providerUsersError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS provider_users (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          provider_id UUID NOT NULL REFERENCES trivia_providers(id) ON DELETE CASCADE,
          role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'editor')),
          granted_by UUID REFERENCES auth.users(id),
          granted_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(user_id, provider_id)
        );
        
        ALTER TABLE provider_users ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Users can view own provider associations" ON provider_users;
        CREATE POLICY "Users can view own provider associations" 
          ON provider_users FOR SELECT 
          USING (user_id = auth.uid());
      `
    });
    if (providerUsersError) throw providerUsersError;
    console.log('✅ Provider users table created');

    // Step 4: Update event_occurrences
    console.log('📝 Updating event_occurrences table...');
    const { error: occurrencesError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE event_occurrences 
        DROP CONSTRAINT IF EXISTS event_occurrences_status_check,
        ADD CONSTRAINT event_occurrences_status_check 
          CHECK (status IN ('scheduled', 'confirmed', 'cancelled', 'completed'));

        ALTER TABLE event_occurrences
        ADD COLUMN IF NOT EXISTS is_themed BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS theme_name TEXT,
        ADD COLUMN IF NOT EXISTS theme_description TEXT,
        ADD COLUMN IF NOT EXISTS confirmed_by UUID REFERENCES auth.users(id),
        ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
        
        ALTER TABLE event_occurrences ENABLE ROW LEVEL SECURITY;
      `
    });
    if (occurrencesError) throw occurrencesError;
    console.log('✅ Event occurrences updated');

    // Step 5: Add status fields to venues and events
    console.log('📝 Adding approval status to venues and events...');
    const { error: statusError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE venues 
        ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved',
        ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
        ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
        
        ALTER TABLE venues 
        DROP CONSTRAINT IF EXISTS venues_status_check,
        ADD CONSTRAINT venues_status_check 
        CHECK (status IN ('pending', 'approved', 'rejected'));

        ALTER TABLE events
        ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved',
        ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
        ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
        
        ALTER TABLE events
        DROP CONSTRAINT IF EXISTS events_status_check,
        ADD CONSTRAINT events_status_check 
        CHECK (status IN ('pending', 'approved', 'rejected'));
      `
    });
    if (statusError) throw statusError;
    console.log('✅ Status fields added');

    // Step 6: Update existing data
    console.log('📝 Updating existing data...');
    const { error: dataError } = await supabase.rpc('exec_sql', {
      sql: `
        UPDATE venues SET status = 'approved', approved_at = NOW() 
        WHERE status IS NULL;
        
        UPDATE events SET status = 'approved', approved_at = NOW() 
        WHERE status IS NULL;
        
        UPDATE trivia_providers SET auth_status = 'approved', approved_at = NOW() 
        WHERE name IN ('Challenge Entertainment', 'NerdyTalk Trivia', 'BrainBlast Trivia')
        AND auth_status = 'pending';
      `
    });
    if (dataError) throw dataError;
    console.log('✅ Existing data updated');

    console.log('🎉 Migration completed successfully!');
    
    // Verify
    const { data: providers } = await supabase
      .from('trivia_providers')
      .select('name, auth_status');
    console.log('✅ Providers:', providers);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();