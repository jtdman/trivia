/**
 * Event Deduplication Utilities
 * 
 * Helper functions to prevent duplicate event creation during imports
 */

import { supabase } from '../lib/supabase.js'

/**
 * Check if an event already exists
 */
export async function checkEventExists(venueId, eventType, dayOfWeek, startTime, providerId) {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('id')
      .eq('venue_id', venueId)
      .eq('event_type', eventType)
      .eq('day_of_week', dayOfWeek)
      .eq('start_time', startTime)
      .eq('provider_id', providerId)
      .eq('is_active', true)
      .maybeSingle()

    if (error) throw error
    
    return !!data // Returns true if event exists
  } catch (error) {
    console.error('Error checking event existence:', error)
    return false
  }
}

/**
 * Insert events with duplicate checking
 */
export async function insertEventsWithDeduplication(events, options = {}) {
  const { skipDuplicates = true, logDuplicates = true } = options
  
  const eventsToInsert = []
  const duplicatesSkipped = []
  
  for (const event of events) {
    const exists = await checkEventExists(
      event.venue_id,
      event.event_type,
      event.day_of_week,
      event.start_time,
      event.provider_id
    )
    
    if (exists && skipDuplicates) {
      duplicatesSkipped.push(event)
      if (logDuplicates) {
        console.log(`⚠️  Skipping duplicate: ${event.event_type} at ${event.start_time} on ${event.day_of_week}`)
      }
    } else {
      eventsToInsert.push(event)
    }
  }
  
  let insertedCount = 0
  if (eventsToInsert.length > 0) {
    const { data, error } = await supabase
      .from('events')
      .insert(eventsToInsert)
      .select('id')
    
    if (error) {
      console.error('Error inserting events:', error)
      throw error
    }
    
    insertedCount = data?.length || 0
  }
  
  return {
    inserted: insertedCount,
    skipped: duplicatesSkipped.length,
    total: events.length,
    duplicatesSkipped
  }
}

/**
 * Smart event replacement - only replaces if events have actually changed
 */
export async function replaceVenueEvents(venueId, providerId, newEvents, options = {}) {
  const { forceReplace = false, logChanges = true } = options
  
  try {
    // Get existing events for this venue/provider
    const { data: existingEvents, error: fetchError } = await supabase
      .from('events')
      .select('*')
      .eq('venue_id', venueId)
      .eq('provider_id', providerId)
      .eq('is_active', true)
    
    if (fetchError) throw fetchError
    
    // Create comparison keys for existing events
    const existingKeys = new Set(
      existingEvents.map(e => `${e.event_type}|${e.day_of_week}|${e.start_time}`)
    )
    
    // Create comparison keys for new events  
    const newKeys = new Set(
      newEvents.map(e => `${e.event_type}|${e.day_of_week}|${e.start_time}`)
    )
    
    // Check if there are any differences
    const hasChanges = !setsEqual(existingKeys, newKeys)
    
    if (!hasChanges && !forceReplace) {
      if (logChanges) {
        console.log(`ℹ️  No changes detected for venue events, skipping update`)
      }
      return {
        replaced: false,
        reason: 'no_changes',
        existing: existingEvents.length,
        new: newEvents.length
      }
    }
    
    if (logChanges) {
      console.log(`🔄 Updating venue events (${existingEvents.length} → ${newEvents.length})`)
    }
    
    // Delete existing events
    const { error: deleteError } = await supabase
      .from('events')
      .delete()
      .eq('venue_id', venueId)
      .eq('provider_id', providerId)
    
    if (deleteError) throw deleteError
    
    // Insert new events with deduplication
    const result = await insertEventsWithDeduplication(newEvents, options)
    
    return {
      replaced: true,
      reason: 'events_changed',
      deleted: existingEvents.length,
      ...result
    }
    
  } catch (error) {
    console.error('Error replacing venue events:', error)
    throw error
  }
}

/**
 * Helper function to compare sets
 */
function setsEqual(setA, setB) {
  if (setA.size !== setB.size) return false
  
  for (const item of setA) {
    if (!setB.has(item)) return false
  }
  
  return true
}

/**
 * Batch event insertion with progress tracking
 */
export async function batchInsertEvents(venues, providerId, options = {}) {
  const { 
    batchSize = 10,
    logProgress = true,
    skipDuplicates = true 
  } = options
  
  let totalInserted = 0
  let totalSkipped = 0
  let totalProcessed = 0
  
  for (let i = 0; i < venues.length; i += batchSize) {
    const batch = venues.slice(i, i + batchSize)
    
    if (logProgress) {
      console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(venues.length / batchSize)} (${batch.length} venues)`)
    }
    
    for (const venue of batch) {
      try {
        const eventsWithDefaults = venue.events.map(event => ({
          ...event,
          venue_id: venue.id,
          provider_id: providerId,
          frequency: 'weekly',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }))
        
        const result = await insertEventsWithDeduplication(eventsWithDefaults, {
          skipDuplicates,
          logDuplicates: false // Reduce log noise in batch mode
        })
        
        totalInserted += result.inserted
        totalSkipped += result.skipped
        totalProcessed += result.total
        
      } catch (error) {
        console.error(`Error processing venue ${venue.name}:`, error)
      }
    }
    
    // Rate limiting pause between batches
    if (i + batchSize < venues.length) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }
  
  if (logProgress) {
    console.log(`✅ Batch processing complete:`)
    console.log(`   • Total events processed: ${totalProcessed}`)
    console.log(`   • Events inserted: ${totalInserted}`)
    console.log(`   • Duplicates skipped: ${totalSkipped}`)
    console.log(`   • Success rate: ${((totalInserted / totalProcessed) * 100).toFixed(1)}%`)
  }
  
  return {
    processed: totalProcessed,
    inserted: totalInserted,
    skipped: totalSkipped,
    venues: venues.length
  }
}