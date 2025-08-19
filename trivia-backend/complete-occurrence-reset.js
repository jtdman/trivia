#!/usr/bin/env node

/**
 * Complete reset of all event occurrences
 * Deletes ALL scheduled occurrences and regenerates them with correct day mapping
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Correct day mapping (Sunday=0, Monday=1, etc.)
const correctDayMap = {
  'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
  'Thursday': 4, 'Friday': 5, 'Saturday': 6
}

function getCurrentWeekStart() {
  const now = new Date()
  // Start from Monday of current week
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const dayOfWeek = today.getDay()
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // If Sunday (0), subtract 6; otherwise subtract (dayOfWeek - 1)
  today.setDate(today.getDate() - daysToSubtract)
  return today
}

function getDayOfWeekDate(weekStart, dayOfWeek) {
  const targetDay = correctDayMap[dayOfWeek]
  const date = new Date(weekStart)
  date.setDate(weekStart.getDate() + targetDay)
  return date
}

async function completeOccurrenceReset(dryRun = true) {
  const mode = dryRun ? 'DRY RUN' : 'EXECUTE'
  console.log(`🔄 ${mode}: Complete occurrence reset starting...`)
  
  try {
    // 1. Get count of all scheduled occurrences
    const { count, error: countError } = await supabase
      .from('event_occurrences')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'scheduled')

    if (countError) throw countError
    console.log(`📊 Found ${count} scheduled occurrences to delete`)

    if (!dryRun && count > 0) {
      // 2. Delete ALL scheduled occurrences
      console.log('🗑️  Deleting all scheduled occurrences...')
      const { error: deleteError } = await supabase
        .from('event_occurrences')
        .delete()
        .eq('status', 'scheduled')

      if (deleteError) throw deleteError
      console.log(`✅ Deleted all ${count} scheduled occurrences`)
    }

    // 3. Get all active weekly events
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, venue_id, provider_id, event_type, day_of_week, start_time, end_time, frequency, prize_amount, prize_description, max_teams, start_date, end_date')
      .eq('is_active', true)
      .eq('frequency', 'weekly')

    if (eventsError) throw eventsError
    console.log(`📋 Found ${events.length} active weekly events`)

    // 4. Generate occurrences for 6 weeks (current week + 5 weeks ahead)
    const currentWeekStart = getCurrentWeekStart()
    const occurrencesToCreate = []
    
    for (let week = 0; week < 6; week++) {
      const weekStart = new Date(currentWeekStart)
      weekStart.setDate(currentWeekStart.getDate() + (week * 7))
      
      console.log(`📅 Processing week ${week + 1}/6: ${weekStart.toISOString().split('T')[0]}`)

      for (const event of events) {
        // Skip if event has date restrictions
        if (event.end_date && new Date(event.end_date) < weekStart) continue
        if (event.start_date && new Date(event.start_date) > weekStart) continue

        const occurrenceDate = getDayOfWeekDate(weekStart, event.day_of_week)
        const occurrenceDateStr = occurrenceDate.toISOString().split('T')[0]

        occurrencesToCreate.push({
          event_id: event.id,
          occurrence_date: occurrenceDateStr,
          status: 'scheduled',
          notes: null
        })
      }
    }

    console.log(`💾 Would create ${occurrencesToCreate.length} new occurrences`)

    if (!dryRun && occurrencesToCreate.length > 0) {
      // 5. Bulk insert new occurrences
      console.log('💾 Creating new occurrences with correct day mapping...')
      
      const batchSize = 100
      for (let i = 0; i < occurrencesToCreate.length; i += batchSize) {
        const batch = occurrencesToCreate.slice(i, i + batchSize)
        const { error: insertError } = await supabase
          .from('event_occurrences')
          .insert(batch)

        if (insertError) throw insertError
        console.log(`  ✅ Inserted batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(occurrencesToCreate.length/batchSize)}`)
      }
      
      console.log(`✅ Created ${occurrencesToCreate.length} event occurrences with correct day mapping`)
    }

    return {
      deleted: count,
      created: occurrencesToCreate.length
    }

  } catch (error) {
    console.error('❌ Reset failed:', error)
    throw error
  }
}

// Run the reset
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2)
  const dryRun = !args.includes('--execute')
  
  if (dryRun) {
    console.log('🧪 DRY RUN MODE: Use --execute flag to actually reset the database')
  }
  
  completeOccurrenceReset(dryRun)
    .then((result) => {
      if (dryRun) {
        console.log(`\n💡 To execute this reset, run: node complete-occurrence-reset.js --execute`)
      } else {
        console.log(`\n🎉 Complete reset finished! Deleted ${result.deleted}, created ${result.created}`)
      }
    })
    .catch((error) => {
      console.error('💥 Reset failed:', error)
      process.exit(1)
    })
}

export { completeOccurrenceReset }