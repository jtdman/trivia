#!/usr/bin/env node

/**
 * Fast Event Scheduler - Optimized for bulk operations
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function getCurrentWeekStart() {
  const now = new Date()
  // Start from today, not next Monday
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  return today
}

function getDayOfWeekDate(weekStart, dayOfWeek) {
  const days = {
    'Monday': 0, 'Tuesday': 1, 'Wednesday': 2, 'Thursday': 3,
    'Friday': 4, 'Saturday': 5, 'Sunday': 6
  }
  
  const date = new Date(weekStart)
  date.setDate(weekStart.getDate() + days[dayOfWeek])
  return date
}

async function runFastScheduler() {
  console.log('🚀 Fast Event Scheduler starting...')
  
  try {
    // Get all active events
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, venue_id, provider_id, event_type, day_of_week, start_time, end_time, frequency, prize_amount, prize_description, max_teams, start_date, end_date')
      .eq('is_active', true)
      .eq('frequency', 'weekly')

    if (eventsError) throw eventsError
    console.log(`📋 Found ${events.length} active events`)

    // Get all existing occurrences in date range with pagination
    const currentWeekStart = getCurrentWeekStart()
    const endDate = new Date(currentWeekStart)
    endDate.setDate(currentWeekStart.getDate() + (4 * 7)) // 4 weeks from today
    
    let existingOccurrences = []
    let from = 0
    const pageSize = 1000
    let hasMore = true

    while (hasMore) {
      const { data, error } = await supabase
        .from('event_occurrences')
        .select('event_id, occurrence_date')
        .gte('occurrence_date', currentWeekStart.toISOString().split('T')[0])
        .lte('occurrence_date', endDate.toISOString().split('T')[0])
        .range(from, from + pageSize - 1)

      if (error) throw error
      
      if (data && data.length > 0) {
        existingOccurrences.push(...data)
        from += pageSize
        hasMore = data.length === pageSize
      } else {
        hasMore = false
      }
    }

    console.log(`📅 Found ${existingOccurrences.length} existing occurrences`)

    // Create a Set for fast lookup
    const existingSet = new Set()
    existingOccurrences?.forEach(occ => {
      existingSet.add(`${occ.event_id}|${occ.occurrence_date}`)
    })

    // Generate all needed occurrences
    const occurrencesToCreate = []
    
    for (let week = 0; week < 4; week++) {
      const weekStart = new Date(currentWeekStart)
      weekStart.setDate(currentWeekStart.getDate() + (week * 7))
      
      console.log(`📅 Processing week ${week + 1}/4: ${weekStart.toISOString().split('T')[0]}`)

      for (const event of events) {
        // Skip if event has date restrictions
        if (event.end_date && new Date(event.end_date) < weekStart) continue
        if (event.start_date && new Date(event.start_date) > weekStart) continue

        const occurrenceDate = getDayOfWeekDate(weekStart, event.day_of_week)
        const occurrenceDateStr = occurrenceDate.toISOString().split('T')[0]
        const key = `${event.id}|${occurrenceDateStr}`

        if (!existingSet.has(key)) {
          occurrencesToCreate.push({
            event_id: event.id,
            occurrence_date: occurrenceDateStr,
            status: 'scheduled',
            notes: null
          })
        }
      }
    }

    // Bulk insert
    if (occurrencesToCreate.length > 0) {
      console.log(`💾 Creating ${occurrencesToCreate.length} new occurrences...`)
      
      // Insert in batches of 100
      const batchSize = 100
      for (let i = 0; i < occurrencesToCreate.length; i += batchSize) {
        const batch = occurrencesToCreate.slice(i, i + batchSize)
        const { error: insertError } = await supabase
          .from('event_occurrences')
          .insert(batch)

        if (insertError) throw insertError
        console.log(`  ✅ Inserted batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(occurrencesToCreate.length/batchSize)}`)
      }
      
      console.log(`✅ Created ${occurrencesToCreate.length} event occurrences`)
    } else {
      console.log('ℹ️  No new occurrences needed')
    }

  } catch (error) {
    console.error('❌ Scheduler failed:', error)
    process.exit(1)
  }
}

runFastScheduler()