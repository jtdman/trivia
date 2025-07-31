#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function setupSimpleAuth() {
  console.log('🔧 Setting up simple auth system as per PRD...');
  
  try {
    // 1. Create user_profiles table
    const { error: tableError } = await supabase.rpc('exec_sql', { 
      sql: `
        CREATE TABLE IF NOT EXISTS user_profiles (
          id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
          display_name TEXT,
          role TEXT CHECK (role IN ('trivia_host', 'venue_owner', 'admin')) DEFAULT 'venue_owner',
          provider_id UUID REFERENCES trivia_providers(id),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    });
    
    if (tableError && !tableError.message.includes('already exists')) {
      console.error('Error creating user_profiles table:', tableError);
    } else {
      console.log('✅ user_profiles table ready');
    }
    
    // 2. Create your admin profile
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', '8600177e-3e85-426a-b3b6-b760abaf983b')
      .single();
      
    if (!existingProfile) {
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: '8600177e-3e85-426a-b3b6-b760abaf983b',
          display_name: 'Jason (Admin)',
          role: 'admin'
        });
        
      if (profileError) {
        console.error('Error creating admin profile:', profileError);
      } else {
        console.log('✅ Admin profile created');
      }
    } else {
      console.log('✅ Admin profile already exists');
    }
    
    // 3. Set simple password for your account
    const { error: passwordError } = await supabase.auth.admin.updateUserById(
      '8600177e-3e85-426a-b3b6-b760abaf983b',
      { password: 'admin123' }
    );
    
    if (passwordError) {
      console.error('Error setting password:', passwordError);
    } else {
      console.log('✅ Simple password set');
      console.log('');
      console.log('🔑 LOGIN CREDENTIALS:');
      console.log('Email: jtdman+tfladmin@gmail.com');
      console.log('Password: admin123');
      console.log('URL: https://trivianearby.com/admin/login');
    }
    
  } catch (error) {
    console.error('Setup error:', error);
  }
}

setupSimpleAuth();