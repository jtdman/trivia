#!/usr/bin/env node

/**
 * Sunday Night Event Scheduler
 * 
 * This script runs every Sunday night to:
 * 1. Generate event occurrences for the upcoming week based on recurring event templates
 * 2. Send notifications to providers about events needing confirmation
 * 3. Clean up old, unconfirmed events
 * 
 * Usage: node sunday-night-scheduler.js
 * Cron: 0 22 * * SUN (10 PM every Sunday)
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role for admin operations
)

// Configuration
const WEEKS_TO_GENERATE = 4 // Generate 4 weeks ahead
const CLEANUP_WEEKS_OLD = 2 // Clean up events older than 2 weeks

/**
 * Get the start of the next week (Monday)
 */
function getNextWeekStart() {
  const now = new Date()
  const daysUntilMonday = (8 - now.getDay()) % 7 || 7 // Days until next Monday
  const nextMonday = new Date(now)
  nextMonday.setDate(now.getDate() + daysUntilMonday)
  nextMonday.setHours(0, 0, 0, 0)
  return nextMonday
}

/**
 * Convert day of week string to date
 */
function getDayOfWeekDate(weekStart, dayOfWeek) {
  const days = {
    'Monday': 0, 'Tuesday': 1, 'Wednesday': 2, 'Thursday': 3,
    'Friday': 4, 'Saturday': 5, 'Sunday': 6
  }
  
  const date = new Date(weekStart)
  date.setDate(weekStart.getDate() + days[dayOfWeek])
  return date
}

/**
 * Generate event occurrences for the upcoming weeks
 */
async function generateEventOccurrences() {
  console.log('🗓️  Generating event occurrences for the next', WEEKS_TO_GENERATE, 'weeks...')
  
  try {
    // Get all active recurring events
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select(`
        id,
        venue_id,
        provider_id,
        event_type,
        day_of_week,
        start_time,
        end_time,
        frequency,
        prize_amount,
        prize_description,
        max_teams,
        start_date,
        end_date,
        trivia_providers (
          name,
          contact_info
        ),
        venues (
          google_name,
          name_original
        )
      `)
      .eq('is_active', true)
      .eq('frequency', 'weekly') // Only weekly recurring events

    if (eventsError) throw eventsError

    console.log(`📋 Found ${events.length} active recurring events`)

    const nextWeekStart = getNextWeekStart()
    const occurrencesToCreate = []

    // Generate occurrences for each week
    for (let week = 0; week < WEEKS_TO_GENERATE; week++) {
      const weekStart = new Date(nextWeekStart)
      weekStart.setDate(nextWeekStart.getDate() + (week * 7))
      
      console.log(`📅 Processing week starting ${weekStart.toISOString().split('T')[0]}`)

      for (const event of events) {
        // Skip if event has an end date and we're past it
        if (event.end_date && new Date(event.end_date) < weekStart) {
          continue
        }

        // Skip if event has a start date and we're before it
        if (event.start_date && new Date(event.start_date) > weekStart) {
          continue
        }

        const occurrenceDate = getDayOfWeekDate(weekStart, event.day_of_week)
        const occurrenceDateStr = occurrenceDate.toISOString().split('T')[0]

        // Check if occurrence already exists
        const { data: existing } = await supabase
          .from('event_occurrences')
          .select('id')
          .eq('event_id', event.id)
          .eq('occurrence_date', occurrenceDateStr)
          .single()

        if (!existing) {
          occurrencesToCreate.push({
            event_id: event.id,
            occurrence_date: occurrenceDateStr,
            status: 'scheduled',
            notes: null,
            created_by: 'system',
            created_by_user_id: null
          })
        }
      }
    }

    // Bulk insert new occurrences
    if (occurrencesToCreate.length > 0) {
      const { error: insertError } = await supabase
        .from('event_occurrences')
        .insert(occurrencesToCreate)

      if (insertError) throw insertError
      console.log(`✅ Created ${occurrencesToCreate.length} new event occurrences`)
    } else {
      console.log('ℹ️  No new occurrences to create')
    }

    return {
      eventsProcessed: events.length,
      occurrencesCreated: occurrencesToCreate.length
    }

  } catch (error) {
    console.error('❌ Error generating event occurrences:', error)
    throw error
  }
}

/**
 * Clean up old, unconfirmed event occurrences
 */
async function cleanupOldOccurrences() {
  console.log('🧹 Cleaning up old occurrences...')
  
  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - (CLEANUP_WEEKS_OLD * 7))
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0]

    const { data: deleted, error } = await supabase
      .from('event_occurrences')
      .delete()
      .lt('occurrence_date', cutoffDateStr)
      .in('status', ['scheduled', 'cancelled'])
      .select('id')

    if (error) throw error

    console.log(`🗑️  Cleaned up ${deleted?.length || 0} old occurrences`)
    return deleted?.length || 0

  } catch (error) {
    console.error('❌ Error cleaning up old occurrences:', error)
    throw error
  }
}

/**
 * Send notification emails to providers about upcoming events needing confirmation
 */
async function sendProviderNotifications() {
  console.log('📧 Sending provider notifications...')
  
  try {
    // Get upcoming unconfirmed events (next 7 days)
    const nextWeek = new Date()
    nextWeek.setDate(nextWeek.getDate() + 7)
    const nextWeekStr = nextWeek.toISOString().split('T')[0]

    const { data: unconfirmedEvents, error } = await supabase
      .from('event_occurrences')
      .select(`
        id,
        occurrence_date,
        status,
        events (
          event_type,
          start_time,
          provider_id,
          trivia_providers (
            id,
            name,
            contact_info
          ),
          venues (
            google_name,
            name_original,
            google_formatted_address
          )
        )
      `)
      .eq('status', 'scheduled')
      .gte('occurrence_date', new Date().toISOString().split('T')[0])
      .lte('occurrence_date', nextWeekStr)

    if (error) throw error

    // Group by provider
    const providerEvents = {}
    for (const occurrence of unconfirmedEvents) {
      const providerId = occurrence.events.provider_id
      if (!providerEvents[providerId]) {
        providerEvents[providerId] = {
          provider: occurrence.events.trivia_providers,
          events: []
        }
      }
      providerEvents[providerId].events.push(occurrence)
    }

    // Create notifications for each provider
    const notifications = []
    for (const [providerId, data] of Object.entries(providerEvents)) {
      const eventCount = data.events.length
      
      notifications.push({
        type: 'weekly_confirmation',
        title: 'Weekly Event Confirmation Needed',
        message: `You have ${eventCount} event${eventCount === 1 ? '' : 's'} scheduled for this week that need confirmation. Please review and confirm your upcoming trivia events.`,
        related_id: providerId,
        related_table: 'trivia_providers',
        created_by: 'system',
        metadata: {
          event_count: eventCount,
          week_start: nextWeek.toISOString().split('T')[0]
        }
      })
    }

    if (notifications.length > 0) {
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notifications)

      if (notificationError) throw notificationError
      console.log(`📬 Sent ${notifications.length} provider notifications`)
    }

    return {
      providersNotified: Object.keys(providerEvents).length,
      eventsNeedingConfirmation: unconfirmedEvents.length
    }

  } catch (error) {
    console.error('❌ Error sending provider notifications:', error)
    throw error
  }
}

/**
 * Generate summary stats
 */
async function generateSummaryStats() {
  try {
    const { data: stats, error } = await supabase.rpc('get_system_stats')
    
    if (error) {
      // Fallback if RPC doesn't exist
      const [totalEvents, totalOccurrences, activeProviders] = await Promise.all([
        supabase.from('events').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('event_occurrences').select('id', { count: 'exact', head: true }),
        supabase.from('trivia_providers').select('id', { count: 'exact', head: true }).eq('is_active', true)
      ])

      return {
        totalEvents: totalEvents.count || 0,
        totalOccurrences: totalOccurrences.count || 0,
        activeProviders: activeProviders.count || 0
      }
    }

    return stats

  } catch (error) {
    console.error('❌ Error generating summary stats:', error)
    return null
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('🌙 Starting Sunday Night Event Scheduler...')
  console.log('⏰ Started at:', new Date().toISOString())
  
  try {
    // Generate event occurrences
    const generationResults = await generateEventOccurrences()
    
    // Send notifications
    const notificationResults = await sendProviderNotifications()
    
    // Clean up old data
    const cleanupCount = await cleanupOldOccurrences()
    
    // Generate summary
    const stats = await generateSummaryStats()
    
    // Final summary
    console.log('\n🎉 Sunday Night Scheduler completed successfully!')
    console.log('📊 Summary:')
    console.log(`   • Events processed: ${generationResults.eventsProcessed}`)
    console.log(`   • New occurrences created: ${generationResults.occurrencesCreated}`)
    console.log(`   • Providers notified: ${notificationResults.providersNotified}`)
    console.log(`   • Events needing confirmation: ${notificationResults.eventsNeedingConfirmation}`)
    console.log(`   • Old occurrences cleaned up: ${cleanupCount}`)
    
    if (stats) {
      console.log(`   • Total active events: ${stats.totalEvents}`)
      console.log(`   • Total scheduled occurrences: ${stats.totalOccurrences}`)
      console.log(`   • Active providers: ${stats.activeProviders}`)
    }
    
    console.log('⏰ Completed at:', new Date().toISOString())
    
    // Log to database for audit trail
    await supabase.from('system_logs').insert({
      type: 'sunday_scheduler',
      message: 'Sunday night scheduler completed successfully',
      metadata: {
        ...generationResults,
        ...notificationResults,
        cleanupCount,
        stats
      }
    })

  } catch (error) {
    console.error('💥 Sunday Night Scheduler failed:', error)
    
    // Log error to database
    await supabase.from('system_logs').insert({
      type: 'sunday_scheduler_error',
      message: 'Sunday night scheduler failed',
      metadata: { error: error.message, stack: error.stack }
    })
    
    process.exit(1)
  }
}

// Run the scheduler
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export { main, generateEventOccurrences, sendProviderNotifications, cleanupOldOccurrences }