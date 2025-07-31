#!/usr/bin/env node

/**
 * Generate Event Occurrences for Brain Blast Trivia
 * Temporary script to fill in missing Brain Blast events
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { format, addWeeks, addDays, startOfWeek } from 'date-fns'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const DAY_MAPPING = {
  'Sunday': 0,
  'Monday': 1,
  'Tuesday': 2,
  'Wednesday': 3,
  'Thursday': 4,
  'Friday': 5,
  'Saturday': 6
}

async function generateBrainBlastEvents() {
  console.log('🧠 Generating occurrences for Brain Blast Trivia...')
  
  try {
    // Get Brain Blast provider
    const { data: provider } = await supabase
      .from('trivia_providers')
      .select('id, name')
      .eq('name', 'Brain Blast Trivia')
      .single()
    
    if (!provider) {
      throw new Error('Brain Blast Trivia provider not found')
    }
    
    console.log(`📍 Found provider: ${provider.name}`)
    
    // Get all Brain Blast events
    const { data: events, error } = await supabase
      .from('events')
      .select(`
        id,
        event_type,
        day_of_week,
        start_time,
        end_time,
        venues(name_original, google_name)
      `)
      .eq('provider_id', provider.id)
      .eq('frequency', 'weekly')
      .eq('is_active', true)
    
    if (error) throw error
    
    console.log(`📅 Found ${events.length} Brain Blast events`)
    
    // Generate occurrences for next week
    const today = new Date()
    const startDate = addWeeks(startOfWeek(today), 1) // Next Sunday
    let generatedCount = 0
    
    for (const event of events) {
      const eventDayNumber = DAY_MAPPING[event.day_of_week]
      const occurrenceDate = addDays(startDate, eventDayNumber)
      
      // Check if occurrence already exists
      const { data: existing } = await supabase
        .from('event_occurrences')
        .select('id')
        .eq('event_id', event.id)
        .eq('occurrence_date', format(occurrenceDate, 'yyyy-MM-dd'))
        .single()

      if (!existing) {
        // Create new occurrence
        const { error: insertError } = await supabase
          .from('event_occurrences')
          .insert({
            event_id: event.id,
            occurrence_date: format(occurrenceDate, 'yyyy-MM-dd'),
            status: 'scheduled',
            actual_start_time: event.start_time,
            actual_end_time: event.end_time
          })

        if (insertError) {
          console.error(`❌ Error creating occurrence for event ${event.id}:`, insertError)
        } else {
          generatedCount++
          const venueName = event.venues?.google_name || event.venues?.name_original
          console.log(`✅ Created: ${event.event_type} at ${venueName} on ${format(occurrenceDate, 'yyyy-MM-dd')}`)
        }
      }
    }
    
    console.log(`\n🎉 Generated ${generatedCount} Brain Blast occurrences!`)
    
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

generateBrainBlastEvents()