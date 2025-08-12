#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function cleanupDuplicates() {
  console.log('🧹 Cleaning up duplicate event occurrences...')
  
  try {
    // Get all occurrences in batches
    let allOccurrences = []
    let from = 0
    const pageSize = 1000
    let hasMore = true

    while (hasMore) {
      const { data, error } = await supabase
        .from('event_occurrences')
        .select('id, event_id, occurrence_date, created_at')
        .order('created_at')
        .range(from, from + pageSize - 1)

      if (error) throw error
      
      if (data && data.length > 0) {
        allOccurrences.push(...data)
        from += pageSize
        hasMore = data.length === pageSize
      } else {
        hasMore = false
      }
    }
    
    console.log(`Found ${allOccurrences.length} total occurrences`)
    
    // Find duplicates by grouping
    const seen = new Map()
    const idsToDelete = []
    
    allOccurrences.forEach(occ => {
      const key = `${occ.event_id}|${occ.occurrence_date}`
      if (seen.has(key)) {
        // This is a duplicate, mark for deletion
        idsToDelete.push(occ.id)
      } else {
        // First occurrence, keep it
        seen.set(key, occ.id)
      }
    })
    
    if (idsToDelete.length === 0) {
      console.log('✅ No duplicates found')
      return
    }

    console.log(`Found ${idsToDelete.length} duplicate occurrences to delete`)
    const batchSize = 100
    
    for (let i = 0; i < idsToDelete.length; i += batchSize) {
      const batch = idsToDelete.slice(i, i + batchSize)
      const { error: deleteError } = await supabase
        .from('event_occurrences')
        .delete()
        .in('id', batch)

      if (deleteError) throw deleteError
      console.log(`  ✅ Deleted batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(idsToDelete.length/batchSize)}`)
    }

    console.log(`✅ Cleaned up ${idsToDelete.length} duplicate occurrences`)

  } catch (error) {
    console.error('❌ Cleanup failed:', error)
    process.exit(1)
  }
}

cleanupDuplicates()