#!/usr/bin/env node

/**
 * Create Event Occurrence for Single Event
 * Usage: node create-single-event-occurrence.js <event_id>
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function createOccurrenceForEvent(eventId) {
  try {
    console.log(`Creating occurrence for event: ${eventId}`)
    
    // Get event details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single()
    
    if (eventError) throw eventError
    if (!event) throw new Error('Event not found')
    
    console.log('Event details:', {
      type: event.event_type,
      day: event.day_of_week,
      frequency: event.frequency,
      time: event.start_time
    })
    
    // Calculate next occurrence date based on day_of_week
    const today = new Date()
    const dayMap = {
      'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
      'Thursday': 4, 'Friday': 5, 'Saturday': 6
    }
    
    const targetDay = dayMap[event.day_of_week]
    const currentDay = today.getDay()
    
    // Calculate days until next occurrence of this day
    let daysUntil = targetDay - currentDay
    if (daysUntil < 0) daysUntil += 7 // Next week
    
    const occurrenceDate = new Date(today)
    occurrenceDate.setDate(today.getDate() + daysUntil)
    const occurrenceDateStr = occurrenceDate.toISOString().split('T')[0]
    
    console.log(`Next ${event.day_of_week} is: ${occurrenceDateStr}`)
    
    // Check if occurrence already exists
    const { data: existing } = await supabase
      .from('event_occurrences')
      .select('id')
      .eq('event_id', eventId)
      .eq('occurrence_date', occurrenceDateStr)
      .single()
    
    if (existing) {
      console.log('✅ Occurrence already exists!')
      return
    }
    
    // Create the occurrence
    const { data: newOccurrence, error: insertError } = await supabase
      .from('event_occurrences')
      .insert([{
        event_id: eventId,
        occurrence_date: occurrenceDateStr,
        status: 'scheduled'
      }])
      .select()
      .single()
    
    if (insertError) throw insertError
    
    console.log('✅ Created event occurrence:', newOccurrence)
    
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

// Get event ID from command line
const eventId = process.argv[2]
if (!eventId) {
  console.error('Usage: node create-single-event-occurrence.js <event_id>')
  process.exit(1)
}

createOccurrenceForEvent(eventId)