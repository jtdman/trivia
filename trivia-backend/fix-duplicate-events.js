#!/usr/bin/env node

/**
 * Fix Duplicate Events - Data Cleanup Script
 * 
 * This script fixes the duplicate event issue by:
 * 1. Identifying duplicate events (same venue + type + day + time + provider)
 * 2. Keeping the oldest event from each duplicate group
 * 3. Deleting all event_occurrences (will be regenerated)
 * 4. Deleting duplicate events
 * 5. Adding constraint to prevent future duplicates
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * Analyze duplicate events
 */
async function analyzeDuplicates() {
  console.log('🔍 Analyzing duplicate events...')
  
  const { data: analysis, error } = await supabase.rpc('analyze_duplicate_events')
  
  if (error) {
    // Fallback query if RPC doesn't exist
    const { data: duplicates, error: queryError } = await supabase
      .from('events')
      .select(`
        id,
        venue_id,
        event_type,
        day_of_week,
        start_time,
        provider_id,
        created_at,
        venues (google_name, name_original),
        trivia_providers (name)
      `)
      .eq('is_active', true)
      .order('venue_id')
      .order('event_type')
      .order('day_of_week')
      .order('start_time')
      .order('created_at')

    if (queryError) throw queryError

    // Group by unique combination
    const groups = {}
    for (const event of duplicates) {
      const key = `${event.venue_id}|${event.event_type}|${event.day_of_week}|${event.start_time}|${event.provider_id}`
      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(event)
    }

    // Find duplicates
    const duplicateGroups = Object.values(groups).filter(group => group.length > 1)
    const totalDuplicates = duplicateGroups.reduce((sum, group) => sum + group.length - 1, 0)

    console.log(`📊 Analysis Results:`)
    console.log(`   • Total events: ${duplicates.length}`)
    console.log(`   • Unique combinations: ${Object.keys(groups).length}`)
    console.log(`   • Duplicate groups: ${duplicateGroups.length}`)
    console.log(`   • Total duplicates to remove: ${totalDuplicates}`)

    return { duplicateGroups, totalDuplicates }
  }

  return analysis
}

/**
 * Clean duplicate events
 */
async function cleanDuplicateEvents(dryRun = false) {
  const mode = dryRun ? '(DRY RUN)' : ''
  console.log(`🧹 Cleaning duplicate events... ${mode}`)

  const { duplicateGroups, totalDuplicates } = await analyzeDuplicates()

  if (totalDuplicates === 0) {
    console.log('✅ No duplicates found!')
    return { cleaned: 0 }
  }

  const eventsToDelete = []

  // For each duplicate group, keep the oldest (first created) and mark others for deletion
  for (const group of duplicateGroups) {
    // Sort by created_at to keep the oldest
    group.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    
    const [keep, ...toDelete] = group
    
    console.log(`📋 Group: ${keep.venues?.google_name || keep.venues?.name_original} - ${keep.event_type} - ${keep.day_of_week} ${keep.start_time}`)
    console.log(`   ✅ Keeping: ${keep.id} (created ${keep.created_at})`)
    
    for (const duplicate of toDelete) {
      console.log(`   ❌ Deleting: ${duplicate.id} (created ${duplicate.created_at})`)
      eventsToDelete.push(duplicate.id)
    }
  }

  if (!dryRun && eventsToDelete.length > 0) {
    // Delete duplicate events in batches to avoid request size limits
    const batchSize = 100
    let totalDeleted = 0
    
    for (let i = 0; i < eventsToDelete.length; i += batchSize) {
      const batch = eventsToDelete.slice(i, i + batchSize)
      console.log(`🗑️  Deleting batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(eventsToDelete.length / batchSize)} (${batch.length} events)`)
      
      const { error: deleteError } = await supabase
        .from('events')
        .delete()
        .in('id', batch)

      if (deleteError) throw deleteError
      totalDeleted += batch.length
      
      // Small delay between batches
      if (i + batchSize < eventsToDelete.length) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }
    
    console.log(`✅ Deleted ${totalDeleted} duplicate events`)
  } else if (dryRun) {
    console.log(`🧪 DRY RUN: Would delete ${eventsToDelete.length} duplicate events`)
  }

  return { cleaned: eventsToDelete.length }
}

/**
 * Delete all event occurrences
 */
async function deleteAllOccurrences(dryRun = false) {
  const mode = dryRun ? '(DRY RUN)' : ''
  console.log(`🗑️  Deleting all event occurrences... ${mode}`)

  if (!dryRun) {
    const { data: deleted, error } = await supabase
      .from('event_occurrences')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all
      .select('id')

    if (error) throw error
    console.log(`✅ Deleted ${deleted?.length || 0} event occurrences`)
    return deleted?.length || 0
  } else {
    const { count } = await supabase
      .from('event_occurrences')
      .select('id', { count: 'exact', head: true })

    console.log(`🧪 DRY RUN: Would delete ${count} event occurrences`)
    return count
  }
}

/**
 * Add constraint to prevent future duplicates
 */
async function addDuplicateConstraint(dryRun = false) {
  const mode = dryRun ? '(DRY RUN)' : ''
  console.log(`🔒 Adding constraint to prevent duplicate events... ${mode}`)

  const constraintSQL = `
    -- Add unique constraint to prevent duplicate events
    ALTER TABLE events 
    ADD CONSTRAINT unique_event_combination 
    UNIQUE (venue_id, event_type, day_of_week, start_time, provider_id)
    WHERE is_active = true;
  `

  if (!dryRun) {
    try {
      // Check if constraint already exists
      const { data: existingConstraints } = await supabase
        .from('information_schema.table_constraints')
        .select('constraint_name')
        .eq('table_name', 'events')
        .eq('constraint_name', 'unique_event_combination')

      if (existingConstraints && existingConstraints.length > 0) {
        console.log('ℹ️  Constraint already exists')
        return
      }

      // Add constraint using RPC or direct SQL
      const { error } = await supabase.rpc('execute_sql', { sql: constraintSQL })
      
      if (error) {
        console.log('⚠️  Could not add constraint via RPC, manual SQL needed:')
        console.log(constraintSQL)
      } else {
        console.log('✅ Added unique constraint to prevent future duplicates')
      }
    } catch (error) {
      console.log('⚠️  Could not add constraint, manual SQL needed:')
      console.log(constraintSQL)
    }
  } else {
    console.log('🧪 DRY RUN: Would add unique constraint')
    console.log('SQL:', constraintSQL)
  }
}

/**
 * Generate new event occurrences
 */
async function regenerateOccurrences(dryRun = false) {
  const mode = dryRun ? '(DRY RUN)' : ''
  console.log(`🗓️  Regenerating event occurrences... ${mode}`)

  if (!dryRun) {
    // Import and run the scheduler
    const { generateEventOccurrences } = await import('./sunday-night-scheduler.js')
    const result = await generateEventOccurrences(false)
    console.log(`✅ Generated ${result.occurrencesCreated} new occurrences from ${result.eventsProcessed} events`)
    return result
  } else {
    console.log('🧪 DRY RUN: Would regenerate occurrences using scheduler')
    const { count: eventCount } = await supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .eq('frequency', 'weekly')

    console.log(`🧪 Would process ${eventCount} events`)
    return { eventsProcessed: eventCount, occurrencesCreated: 'estimated: ' + (eventCount * 4) }
  }
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const skipConstraint = args.includes('--skip-constraint')

  if (args.includes('--help')) {
    console.log(`
Fix Duplicate Events Script

Usage:
  node fix-duplicate-events.js [options]

Options:
  --dry-run          Show what would be done without making changes
  --skip-constraint  Skip adding the unique constraint
  --help            Show this help message

Examples:
  node fix-duplicate-events.js --dry-run    # Test run
  node fix-duplicate-events.js              # Execute cleanup
`)
    return
  }

  const mode = dryRun ? 'DRY RUN' : 'PRODUCTION'
  console.log(`🚀 Starting duplicate event cleanup (${mode})...`)
  console.log('⏰ Started at:', new Date().toISOString())
  
  if (dryRun) {
    console.log('🧪 DRY RUN MODE: No changes will be made to the database')
    console.log('Run without --dry-run to execute the cleanup')
  }

  try {
    // Step 1: Clean duplicate events
    const cleanupResult = await cleanDuplicateEvents(dryRun)
    
    // Step 2: Delete all occurrences
    const deletedOccurrences = await deleteAllOccurrences(dryRun)
    
    // Step 3: Add constraint (optional)
    if (!skipConstraint) {
      await addDuplicateConstraint(dryRun)
    }
    
    // Step 4: Regenerate occurrences
    const regenerateResult = await regenerateOccurrences(dryRun)
    
    // Summary
    console.log(`\n🎉 Duplicate event cleanup ${mode} completed!`)
    console.log('📊 Summary:')
    console.log(`   • Duplicate events ${dryRun ? 'would be' : ''} removed: ${cleanupResult.cleaned}`)
    console.log(`   • Event occurrences ${dryRun ? 'would be' : ''} deleted: ${deletedOccurrences}`)
    console.log(`   • Events ${dryRun ? 'would be' : ''} processed: ${regenerateResult.eventsProcessed}`)
    console.log(`   • New occurrences ${dryRun ? 'would be' : ''} created: ${regenerateResult.occurrencesCreated}`)
    console.log('⏰ Completed at:', new Date().toISOString())

    if (!dryRun) {
      // Log to audit trail
      await supabase.from('system_logs').insert({
        type: 'duplicate_cleanup',
        message: 'Duplicate event cleanup completed successfully',
        metadata: {
          duplicatesRemoved: cleanupResult.cleaned,
          occurrencesDeleted: deletedOccurrences,
          eventsProcessed: regenerateResult.eventsProcessed,
          newOccurrences: regenerateResult.occurrencesCreated
        }
      })
    }

  } catch (error) {
    console.error(`💥 Duplicate event cleanup ${mode} failed:`, error)
    
    if (!dryRun) {
      await supabase.from('system_logs').insert({
        type: 'duplicate_cleanup_error',
        message: 'Duplicate event cleanup failed',
        metadata: { error: error.message, stack: error.stack }
      })
    }
    
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export { main, cleanDuplicateEvents, deleteAllOccurrences, regenerateOccurrences }