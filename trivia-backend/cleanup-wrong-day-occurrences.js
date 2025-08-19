#!/usr/bin/env node

/**
 * Clean up event occurrences that were scheduled on the wrong day
 * due to the scheduler day-of-week mapping bug
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

// Incorrect day mapping that was causing the bug (Monday=0, Tuesday=1, etc.)
const incorrectDayMap = {
  'Monday': 0, 'Tuesday': 1, 'Wednesday': 2, 'Thursday': 3,
  'Friday': 4, 'Saturday': 5, 'Sunday': 6
}

async function analyzeWrongOccurrences(dryRun = true) {
  const mode = dryRun ? 'ANALYSIS' : 'CLEANUP'
  console.log(`🔍 ${mode}: Checking for incorrectly scheduled occurrences...`)
  
  try {
    // Get all event occurrences with their event details (no limit)
    let allOccurrences = []
    let from = 0
    const pageSize = 1000
    let hasMore = true

    while (hasMore) {
      const { data: batch, error } = await supabase
        .from('event_occurrences')
        .select(`
          id,
          occurrence_date,
          events (
            id,
            day_of_week,
            event_type,
            venues (
              google_name,
              name_original
            )
          )
        `)
        .eq('status', 'scheduled')
        .order('occurrence_date', { ascending: true })
        .range(from, from + pageSize - 1)

      if (error) throw error
      
      if (batch && batch.length > 0) {
        allOccurrences.push(...batch)
        from += pageSize
        hasMore = batch.length === pageSize
      } else {
        hasMore = false
      }
    }
    
    const occurrences = allOccurrences

    console.log(`📊 Found ${occurrences.length} scheduled occurrences to analyze`)

    const wrongOccurrences = []
    const correctOccurrences = []

    for (const occ of occurrences) {
      const occurrenceDate = new Date(occ.occurrence_date)
      const actualDayOfWeek = occurrenceDate.getDay() // 0=Sunday, 1=Monday, etc.
      const eventDayOfWeek = occ.events.day_of_week
      const expectedDayOfWeek = correctDayMap[eventDayOfWeek]

      if (actualDayOfWeek !== expectedDayOfWeek) {
        // This occurrence is on the wrong day
        wrongOccurrences.push({
          ...occ,
          actualDayOfWeek,
          expectedDayOfWeek,
          actualDayName: Object.keys(correctDayMap)[actualDayOfWeek],
          expectedDayName: eventDayOfWeek
        })
      } else {
        correctOccurrences.push(occ)
      }
    }

    console.log(`✅ Correctly scheduled: ${correctOccurrences.length}`)
    console.log(`❌ Wrongly scheduled: ${wrongOccurrences.length}`)

    if (wrongOccurrences.length > 0) {
      console.log('\n📋 Wrong occurrences by day:')
      const wrongByDay = {}
      wrongOccurrences.forEach(occ => {
        const key = `${occ.expectedDayName} → ${occ.actualDayName}`
        wrongByDay[key] = (wrongByDay[key] || 0) + 1
      })
      
      Object.entries(wrongByDay).forEach(([key, count]) => {
        console.log(`   ${key}: ${count} occurrences`)
      })

      if (!dryRun) {
        console.log('\n🗑️  Deleting wrong occurrences...')
        const wrongIds = wrongOccurrences.map(occ => occ.id)
        
        // Delete in batches of 100
        const batchSize = 100
        let deleted = 0
        
        for (let i = 0; i < wrongIds.length; i += batchSize) {
          const batch = wrongIds.slice(i, i + batchSize)
          const { error: deleteError } = await supabase
            .from('event_occurrences')
            .delete()
            .in('id', batch)
          
          if (deleteError) throw deleteError
          deleted += batch.length
          console.log(`  ✅ Deleted batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(wrongIds.length/batchSize)} (${batch.length} occurrences)`)
        }
        
        console.log(`🎉 Deleted ${deleted} incorrectly scheduled occurrences`)
        
        // Now run the fixed scheduler to recreate correct occurrences
        console.log('\n🔄 Running fast scheduler to recreate correct occurrences...')
        const { spawn } = await import('child_process')
        const schedulerProcess = spawn('node', ['fast-scheduler.js'], { stdio: 'inherit' })
        
        schedulerProcess.on('close', (code) => {
          if (code === 0) {
            console.log('✅ Fast scheduler completed successfully')
          } else {
            console.error(`❌ Fast scheduler exited with code ${code}`)
          }
        })
      }
    } else {
      console.log('🎉 All occurrences are correctly scheduled!')
    }

    return {
      total: occurrences.length,
      correct: correctOccurrences.length,
      wrong: wrongOccurrences.length,
      wrongOccurrences
    }

  } catch (error) {
    console.error('❌ Analysis failed:', error)
    throw error
  }
}

// Run the analysis
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2)
  const dryRun = !args.includes('--execute')
  
  if (dryRun) {
    console.log('🧪 DRY RUN MODE: Use --execute flag to actually clean up the database')
  }
  
  analyzeWrongOccurrences(dryRun)
    .then((result) => {
      if (dryRun && result.wrong > 0) {
        console.log(`\n💡 To fix these issues, run: node cleanup-wrong-day-occurrences.js --execute`)
      }
    })
    .catch((error) => {
      console.error('💥 Cleanup failed:', error)
      process.exit(1)
    })
}

export { analyzeWrongOccurrences }