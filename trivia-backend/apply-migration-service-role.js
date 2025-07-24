#!/usr/bin/env node

/**
 * Apply migration using service role key for elevated permissions
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY  // Use service role for schema changes
);

async function applyMigration() {
  console.log('🚀 Applying migration with service role permissions...');
  
  const queries = [
    {
      name: "Add auth fields to trivia_providers",
      sql: `
        ALTER TABLE trivia_providers 
        ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id),
        ADD COLUMN IF NOT EXISTS auth_status TEXT DEFAULT 'pending',
        ADD COLUMN IF NOT EXISTS approval_notes TEXT,
        ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
        ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
      `
    },
    {
      name: "Add auth_status constraint",
      sql: `
        ALTER TABLE trivia_providers 
        DROP CONSTRAINT IF EXISTS trivia_providers_auth_status_check,
        ADD CONSTRAINT trivia_providers_auth_status_check 
        CHECK (auth_status IN ('pending', 'approved', 'rejected'));
      `
    },
    {
      name: "Create admin_users table",
      sql: `
        CREATE TABLE IF NOT EXISTS admin_users (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          email TEXT NOT NULL,
          role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          last_login TIMESTAMPTZ
        );
      `
    },
    {
      name: "Create provider_users table",
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
      `
    },
    {
      name: "Update event_occurrences status",
      sql: `
        ALTER TABLE event_occurrences 
        DROP CONSTRAINT IF EXISTS event_occurrences_status_check,
        ADD CONSTRAINT event_occurrences_status_check 
          CHECK (status IN ('scheduled', 'confirmed', 'cancelled', 'completed'));
      `
    },
    {
      name: "Add fields to event_occurrences",
      sql: `
        ALTER TABLE event_occurrences
        ADD COLUMN IF NOT EXISTS is_themed BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS theme_name TEXT,
        ADD COLUMN IF NOT EXISTS theme_description TEXT,
        ADD COLUMN IF NOT EXISTS confirmed_by UUID REFERENCES auth.users(id),
        ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
      `
    },
    {
      name: "Add status to venues",
      sql: `
        ALTER TABLE venues 
        ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved',
        ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
        ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
        
        ALTER TABLE venues 
        DROP CONSTRAINT IF EXISTS venues_status_check,
        ADD CONSTRAINT venues_status_check 
        CHECK (status IN ('pending', 'approved', 'rejected'));
      `
    },
    {
      name: "Add status to events",
      sql: `
        ALTER TABLE events
        ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved',
        ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
        ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
        
        ALTER TABLE events
        DROP CONSTRAINT IF EXISTS events_status_check,
        ADD CONSTRAINT events_status_check 
        CHECK (status IN ('pending', 'approved', 'rejected'));
      `
    },
    {
      name: "Create indexes",
      sql: `
        CREATE INDEX IF NOT EXISTS idx_trivia_providers_auth_user_id ON trivia_providers(auth_user_id);
        CREATE INDEX IF NOT EXISTS idx_trivia_providers_auth_status ON trivia_providers(auth_status);
        CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);
        CREATE INDEX IF NOT EXISTS idx_provider_users_user_id ON provider_users(user_id);
        CREATE INDEX IF NOT EXISTS idx_provider_users_provider_id ON provider_users(provider_id);
      `
    },
    {
      name: "Enable RLS",
      sql: `
        ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
        ALTER TABLE provider_users ENABLE ROW LEVEL SECURITY;
      `
    },
    {
      name: "Update existing data",
      sql: `
        UPDATE venues SET status = 'approved', approved_at = NOW() 
        WHERE status IS NULL;
        
        UPDATE events SET status = 'approved', approved_at = NOW() 
        WHERE status IS NULL;
        
        UPDATE trivia_providers SET auth_status = 'approved', approved_at = NOW() 
        WHERE name IN ('Challenge Entertainment', 'NerdyTalk Trivia', 'BrainBlast Trivia')
        AND (auth_status IS NULL OR auth_status = 'pending');
      `
    }
  ];
  
  try {
    for (const query of queries) {
      console.log(`⏳ ${query.name}...`);
      
      const { error } = await supabase.rpc('exec_sql', { sql: query.sql });
      
      if (error) {
        console.error(`❌ Failed: ${query.name}`, error);
        // Continue with other queries
      } else {
        console.log(`✅ ${query.name}`);
      }
    }
    
    console.log('🎉 Migration completed!');
    
    // Verify
    const { data: providers } = await supabase
      .from('trivia_providers')
      .select('name, auth_status');
    
    console.log('✅ Providers:', providers);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

applyMigration();