#!/usr/bin/env node

/**
 * Apply Provider Authentication Migration
 * Run this script to apply the provider authentication system to your Supabase database
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('🚀 Applying provider authentication migration...');
  
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, 'supabase/migrations/20250724_provider_auth_system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split into individual statements (basic approach - may need refinement)
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`📝 Executing ${statements.length} SQL statements...`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.length === 0) continue;
      
      console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
      
      const { error } = await supabase.rpc('exec_sql', { sql: statement });
      
      if (error) {
        console.error(`❌ Error in statement ${i + 1}:`, error);
        // Continue with other statements unless it's a critical error
        if (error.message.includes('already exists') || error.message.includes('does not exist')) {
          console.log('⚠️  Continuing (likely safe to ignore)...');
        } else {
          throw error;
        }
      } else {
        console.log(`✅ Statement ${i + 1} completed`);
      }
    }
    
    console.log('🎉 Migration completed successfully!');
    
    // Verify the migration worked
    console.log('🔍 Verifying migration...');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['provider_signups', 'admin_users', 'provider_users', 'notifications']);
    
    if (tablesError) {
      console.error('❌ Verification error:', tablesError);
    } else {
      console.log('✅ Verified tables created:', tables.map(t => t.table_name));
    }
    
    // Check if providers are marked as approved
    const { data: providers, error: providersError } = await supabase
      .from('trivia_providers')
      .select('name, auth_status')
      .in('name', ['Challenge Entertainment', 'NerdyTalk Trivia', 'BrainBlast Trivia']);
    
    if (!providersError) {
      console.log('✅ Provider status:', providers);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Alternative approach using direct SQL execution
async function applyMigrationDirect() {
  console.log('🚀 Applying migration using direct SQL execution...');
  
  try {
    const migrationPath = path.join(__dirname, 'supabase/migrations/20250724_provider_auth_system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the entire migration as one transaction
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }
    
    console.log('🎉 Migration applied successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const useDirect = args.includes('--direct');
  
  if (useDirect) {
    await applyMigrationDirect();
  } else {
    await applyMigration();
  }
}

// Main execution
main();