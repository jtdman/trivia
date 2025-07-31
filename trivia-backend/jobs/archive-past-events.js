#!/usr/bin/env node

/**
 * Archive Past Event Occurrences
 * 
 * This job:
 * 1. Exports all event_occurrences before today to JSON file
 * 2. Saves to trivia-backend/archives/ directory
 * 3. Deletes archived records from database
 * 4. Logs summary of archived data
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { format } from 'date-fns'
import fs from 'fs/promises'
import path from 'path'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function archivePastEvents(dryRun = false) {
  console.log(dryRun ? '🧪 Starting DRY RUN archival...' : '📦 Starting event occurrences archival...')
  
  try {
    const today = format(new Date(), 'yyyy-MM-dd')
    console.log(`📅 ${dryRun ? 'Would archive' : 'Archiving'} all occurrences before ${today}`)
    
    // Get all past event occurrences with full data
    const { data: pastOccurrences, error: queryError } = await supabase
      .from('event_occurrences')
      .select(`
        id,
        event_id,
        occurrence_date,
        status,
        notes,
        actual_start_time,
        actual_end_time,
        created_at,
        events (
          event_type,
          day_of_week,
          start_time,
          end_time,
          prize_amount,
          prize_description,
          provider_id,
          venues (
            id,
            name_original,
            google_name,
            google_formatted_address,
            address_original
          ),
          trivia_providers (
            id,
            name,
            website,
            contact_info
          )
        )
      `)
      .lt('occurrence_date', today)
      .order('occurrence_date', { ascending: true })

    if (queryError) {
      throw queryError
    }

    if (!pastOccurrences || pastOccurrences.length === 0) {
      console.log('✅ No past occurrences to archive')
      return
    }

    console.log(`📊 Found ${pastOccurrences.length} past occurrences to archive`)

    // Create archive data structure
    const archiveData = {
      archived_date: today,
      total_records: pastOccurrences.length,
      date_range: {
        start: pastOccurrences[0].occurrence_date,
        end: pastOccurrences[pastOccurrences.length - 1].occurrence_date
      },
      summary: {
        by_status: {},
        by_provider: {},
        by_month: {}
      },
      occurrences: pastOccurrences
    }

    // Calculate summary statistics
    pastOccurrences.forEach(occurrence => {
      // By status
      const status = occurrence.status || 'unknown'
      archiveData.summary.by_status[status] = (archiveData.summary.by_status[status] || 0) + 1
      
      // By provider
      const provider = occurrence.events?.trivia_providers?.name || 'unknown'
      archiveData.summary.by_provider[provider] = (archiveData.summary.by_provider[provider] || 0) + 1
      
      // By month
      const month = occurrence.occurrence_date.substring(0, 7) // YYYY-MM
      archiveData.summary.by_month[month] = (archiveData.summary.by_month[month] || 0) + 1
    })

    // Create filename and save to archives directory
    const filename = `event_occurrences_archive_${today}.json`
    const archivePath = path.join(process.cwd(), 'archives', filename)
    
    if (!dryRun) {
      await fs.writeFile(
        archivePath, 
        JSON.stringify(archiveData, null, 2),
        'utf8'
      )
      console.log(`💾 Archive saved to: ${archivePath}`)
    } else {
      console.log(`💾 DRY RUN: Would save archive to: ${archivePath}`)
    }

    console.log(`📈 Summary:`)
    console.log(`   Date range: ${archiveData.date_range.start} to ${archiveData.date_range.end}`)
    console.log(`   Total records: ${archiveData.total_records}`)
    console.log(`   By status:`, archiveData.summary.by_status)
    console.log(`   By provider:`, archiveData.summary.by_provider)

    if (!dryRun) {
      // Delete archived records from database
      console.log('🗑️  Deleting archived records from database...')
      const { error: deleteError } = await supabase
        .from('event_occurrences')
        .delete()
        .lt('occurrence_date', today)

      if (deleteError) {
        throw deleteError
      }

      console.log('✅ Successfully deleted archived records from database')
      console.log(`🎉 Archival completed! ${pastOccurrences.length} records archived and deleted`)
    } else {
      console.log('🗑️  DRY RUN: Would delete archived records from database')
      console.log(`🎉 DRY RUN completed! Would archive and delete ${pastOccurrences.length} records`)
    }

  } catch (error) {
    console.error('❌ Error during archival:', error)
    process.exit(1)
  }
}

// Manual trigger function for testing
async function testRun() {
  console.log('🧪 Running test archival (dry run)...')
  
  try {
    const today = format(new Date(), 'yyyy-MM-dd')
    
    const { data: pastOccurrences, error } = await supabase
      .from('event_occurrences')
      .select('id, occurrence_date, status')
      .lt('occurrence_date', today)

    if (error) throw error

    console.log(`📊 Would archive ${pastOccurrences?.length || 0} past occurrences`)
    
    if (pastOccurrences && pastOccurrences.length > 0) {
      console.log(`📅 Date range: ${pastOccurrences[0].occurrence_date} to ${pastOccurrences[pastOccurrences.length - 1].occurrence_date}`)
    }
    
    console.log('🧪 Test completed - no actual archival performed')
  } catch (error) {
    console.error('❌ Test error:', error)
  }
}

// Main execution
if (process.argv.includes('--test')) {
  testRun()
} else if (process.argv.includes('--dry-run')) {
  archivePastEvents(true)
} else {
  archivePastEvents()
}

export { archivePastEvents, testRun }