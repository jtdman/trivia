#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const migrationsDir = path.join(__dirname, 'supabase/migrations')

async function applyMigrations() {
  console.log('🚀 Applying database migrations...\n')
  
  // Get list of migration files
  const files = await fs.readdir(migrationsDir)
  const sqlFiles = files.filter(f => f.endsWith('.sql')).sort()
  
  // Get already applied migrations
  const { data: appliedMigrations, error: listError } = await supabase
    .from('schema_migrations')
    .select('version')
  
  if (listError && listError.code !== 'PGRST116') { // Table doesn't exist is ok
    console.error('Error checking migrations:', listError)
    return
  }
  
  const appliedVersions = new Set(appliedMigrations?.map(m => m.version) || [])
  
  // Apply each migration
  for (const file of sqlFiles) {
    const version = file.replace('.sql', '')
    
    if (appliedVersions.has(version)) {
      console.log(`✅ ${file} (already applied)`)
      continue
    }
    
    console.log(`📝 Applying ${file}...`)
    
    try {
      const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8')
      
      // Execute the migration
      const { error } = await supabase.rpc('exec_sql', { sql_query: sql })
      
      if (error) {
        console.error(`❌ Failed to apply ${file}:`, error)
        process.exit(1)
      }
      
      // Record the migration
      const { error: recordError } = await supabase
        .from('schema_migrations')
        .insert({ version, name: file })
      
      if (recordError && recordError.code !== 'PGRST116') {
        console.error(`❌ Failed to record migration ${file}:`, recordError)
      }
      
      console.log(`✅ ${file} applied successfully`)
    } catch (err) {
      console.error(`❌ Error applying ${file}:`, err)
      process.exit(1)
    }
  }
  
  console.log('\n✨ All migrations applied successfully!')
}

// Create schema_migrations table if it doesn't exist
async function createMigrationsTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      name TEXT,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    );
  `
  
  const { error } = await supabase.rpc('exec_sql', { sql_query: sql })
  if (error) {
    console.error('Failed to create migrations table:', error)
  }
}

// Main
async function main() {
  await createMigrationsTable()
  await applyMigrations()
}

main().catch(console.error)