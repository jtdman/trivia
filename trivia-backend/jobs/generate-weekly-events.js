#!/usr/bin/env node

/**
 * Sunday Job: Generate Weekly Event Occurrences
 * 
 * This job runs every Sunday to:
 * 1. Generate event_occurrences records for the next 4 weeks
 * 2. Send email notifications to providers
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { format, addWeeks, addDays, startOfWeek, getDay } from 'date-fns'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Day of week mapping
const DAY_MAPPING = {
  'Sunday': 0,
  'Monday': 1,
  'Tuesday': 2,
  'Wednesday': 3,
  'Thursday': 4,
  'Friday': 5,
  'Saturday': 6
}

async function generateWeeklyEvents() {
  console.log('🚀 Starting weekly event generation...')
  
  try {
    // Get all active weekly events
    const { data: weeklyEvents, error: eventsError } = await supabase
      .from('events')
      .select(`
        id,
        event_type,
        day_of_week,
        start_time,
        end_time,
        provider_id,
        venue_id,
        trivia_providers(name, contact_info)
      `)
      .eq('frequency', 'weekly')
      .eq('is_active', true)
      // Only get approved events (status column may not exist on all events)
      // .eq('status', 'approved')

    if (eventsError) {
      throw eventsError
    }

    console.log(`📅 Found ${weeklyEvents.length} weekly events`)

    // Generate occurrences for the next 4 weeks
    const generatedCount = await generateOccurrences(weeklyEvents)
    
    console.log(`✅ Generated ${generatedCount} event occurrences`)

    // Send email notifications to providers
    await sendProviderNotifications()

    console.log('🎉 Weekly event generation completed successfully!')

  } catch (error) {
    console.error('❌ Error generating weekly events:', error)
    process.exit(1)
  }
}

async function generateOccurrences(events) {
  let generatedCount = 0
  const startDate = startOfWeek(new Date()) // This Sunday
  
  for (const event of events) {
    const eventDayNumber = DAY_MAPPING[event.day_of_week]
    
    // Generate occurrences for the next 4 weeks
    for (let week = 0; week < 4; week++) {
      const weekStart = addWeeks(startDate, week)
      const occurrenceDate = addDays(weekStart, eventDayNumber)
      
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
          console.log(`✅ Created occurrence: ${event.event_type} on ${format(occurrenceDate, 'yyyy-MM-dd')}`)
        }
      }
    }
  }
  
  return generatedCount
}

async function sendProviderNotifications() {
  console.log('📧 Sending notifications to admin only...')
  
  try {
    // ONLY send notifications to admin (you)
    const adminEmail = 'jtdman+tfadmin@gmail.com'
    
    // Get all providers for summary report
    const { data: providers, error: providersError } = await supabase
      .from('trivia_providers')
      .select('id, name, contact_info')

    if (providersError) {
      throw providersError
    }

    console.log(`📋 Found ${providers.length} providers to summarize`)

    // Create a summary report for admin instead of individual emails
    const providerSummaries = []

    for (const provider of providers) {

      // Get upcoming events for this provider
      const startDate = startOfWeek(new Date())
      const endDate = addWeeks(startDate, 1) // Next week
      
      const { data: upcomingEvents } = await supabase
        .from('event_occurrences')
        .select(`
          occurrence_date,
          status,
          events (
            event_type,
            start_time,
            venues (
              google_name,
              name_original,
              google_formatted_address
            )
          )
        `)
        .eq('events.provider_id', provider.id)
        .gte('occurrence_date', format(startDate, 'yyyy-MM-dd'))
        .lte('occurrence_date', format(endDate, 'yyyy-MM-dd'))
        .order('occurrence_date')

      if (upcomingEvents && upcomingEvents.length > 0) {
        providerSummaries.push({
          provider: provider.name,
          events: upcomingEvents,
          eventCount: upcomingEvents.length
        })
      }
    }

    // Send single summary email to admin only
    if (providerSummaries.length > 0) {
      console.log(`📧 Would send ADMIN SUMMARY email to ${adminEmail}`)
      logAdminSummaryEmail(providerSummaries)
    } else {
      console.log('📧 No events to report this week')
    }

  } catch (error) {
    console.error('❌ Error creating notifications:', error)
  }
}

function logAdminSummaryEmail(providerSummaries) {
  console.log(`\n📧 ADMIN SUMMARY EMAIL:`)
  console.log('To: jtdman+tfadmin@gmail.com')
  console.log('Subject: Weekly Trivia Events Summary - Admin Review Required')
  console.log('\nHi Jason,')
  console.log('\nThis week\'s trivia events are ready for provider review. Here\'s the summary:')
  
  let totalEvents = 0
  providerSummaries.forEach(summary => {
    totalEvents += summary.eventCount
    console.log(`\n🏢 ${summary.provider}: ${summary.eventCount} events`)
    
    summary.events.slice(0, 3).forEach(event => { // Show first 3 events per provider
      const venue = event.events.venues
      const venueName = venue.google_name || venue.name_original
      console.log(`  • ${event.events.event_type} at ${venueName}`)
      console.log(`    📅 ${format(new Date(event.occurrence_date), 'EEEE, MMM d')} at ${event.events.start_time} (${event.status})`)
    })
    
    if (summary.eventCount > 3) {
      console.log(`  ... and ${summary.eventCount - 3} more events`)
    }
  })
  
  console.log(`\n📊 TOTAL: ${totalEvents} events across ${providerSummaries.length} providers`)
  console.log('\nAdmin Dashboard: http://localhost:3001/')
  console.log('Live Site: https://trivianearby.com')
  console.log('\nNote: Providers will NOT receive individual emails. Only you get this summary.')
  console.log('─'.repeat(70))
}

// Manual trigger function for testing
async function testRun() {
  console.log('🧪 Running test event generation...')
  await generateWeeklyEvents()
}

// Main execution
if (process.argv.includes('--test')) {
  testRun()
} else {
  generateWeeklyEvents()
}

export { generateWeeklyEvents, testRun }