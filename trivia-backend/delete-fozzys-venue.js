#!/usr/bin/env node

/**
 * Delete Fozzy's Spring Hill venue and all associated data
 * Keeps the provider intact for testing
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function deleteFozzysVenue() {
  const venueId = '73f9fb79-3e5b-41b5-b9dc-ebcddfd559aa'
  const eventId = '4b21606c-000a-476f-8c1e-b453bb7615f6'
  const occurrenceId = '75cc630c-f05f-4dbf-b8c0-70fee5bb65ea'
  
  try {
    console.log('🗑️  Deleting Fozzy\'s venue and associated data...')
    
    // 1. Delete event occurrence first
    console.log('1. Deleting event occurrence...')
    const { error: occurrenceError } = await supabase
      .from('event_occurrences')
      .delete()
      .eq('id', occurrenceId)
    
    if (occurrenceError) throw occurrenceError
    console.log('✅ Event occurrence deleted')
    
    // 2. Delete event
    console.log('2. Deleting event...')
    const { error: eventError } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId)
    
    if (eventError) throw eventError
    console.log('✅ Event deleted')
    
    // 3. Delete any user_venues relationships
    console.log('3. Deleting user-venue relationships...')
    const { error: userVenueError } = await supabase
      .from('user_venues')
      .delete()
      .eq('venue_id', venueId)
    
    if (userVenueError) throw userVenueError
    console.log('✅ User-venue relationships deleted')
    
    // 4. Delete venue
    console.log('4. Deleting venue...')
    const { error: venueError } = await supabase
      .from('venues')
      .delete()
      .eq('id', venueId)
    
    if (venueError) throw venueError
    console.log('✅ Venue deleted')
    
    console.log('🎉 Successfully deleted Fozzy\'s venue and all associated data!')
    console.log('Provider "Fozzy\'s Trivia" remains intact for testing.')
    
  } catch (error) {
    console.error('❌ Error during deletion:', error)
    process.exit(1)
  }
}

deleteFozzysVenue()