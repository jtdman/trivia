#!/usr/bin/env node

/**
 * Bulk Venue Image Processor
 * 
 * Processes all venues that have google_photo_reference but no thumbnail_url
 * Run this periodically (e.g., annually) to ensure all venues have processed images
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Configuration
const BATCH_SIZE = 10 // Process 10 venues at a time to avoid rate limits
const DELAY_BETWEEN_BATCHES = 2000 // 2 second delay between batches
const DELAY_BETWEEN_IMAGES = 500 // 500ms delay between individual image calls

async function getUnprocessedVenues() {
  console.log('🔍 Finding venues that need image processing...')
  
  try {
    const { data: venues, error } = await supabase
      .from('venues')
      .select('id, google_name, name_original, google_photo_reference, verification_status, status')
      .not('google_photo_reference', 'is', null)
      .is('thumbnail_url', null)
      .order('created_at', { ascending: true })

    if (error) throw error

    console.log(`📊 Found ${venues.length} venues needing image processing`)
    
    // Group by status for reporting
    const statusBreakdown = venues.reduce((acc, venue) => {
      const key = `${venue.status}-${venue.verification_status}`
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})
    
    console.log('📋 Breakdown by status:')
    Object.entries(statusBreakdown).forEach(([status, count]) => {
      console.log(`   ${status}: ${count} venues`)
    })

    return venues
  } catch (error) {
    console.error('❌ Error fetching unprocessed venues:', error)
    throw error
  }
}

async function processVenueImage(venue) {
  console.log(`📸 Processing: ${venue.google_name || venue.name_original}`)
  
  try {
    const { data, error } = await supabase.functions.invoke('process-venue-images', {
      body: { 
        venue_id: venue.id,
        google_photo_reference: venue.google_photo_reference
      }
    })

    if (error) {
      console.error(`   ❌ Failed: ${error.message}`)
      return { success: false, error: error.message, venue_id: venue.id }
    }

    if (data?.success) {
      console.log(`   ✅ Success: Image processed`)
      return { success: true, venue_id: venue.id }
    } else {
      console.log(`   ⚠️  Warning: Function returned non-success result`)
      return { success: false, error: 'Function returned non-success', venue_id: venue.id }
    }
  } catch (error) {
    console.error(`   ❌ Exception: ${error.message}`)
    return { success: false, error: error.message, venue_id: venue.id }
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function bulkProcessImages(dryRun = false) {
  const mode = dryRun ? 'DRY RUN' : 'EXECUTE'
  console.log(`🚀 Bulk Image Processor starting (${mode})...`)
  console.log('⏰ Started at:', new Date().toISOString())
  
  try {
    const venues = await getUnprocessedVenues()
    
    if (venues.length === 0) {
      console.log('🎉 No venues need image processing!')
      return { processed: 0, successful: 0, failed: 0 }
    }

    if (dryRun) {
      console.log(`🧪 DRY RUN: Would process ${venues.length} venues`)
      console.log('📝 Sample venues that would be processed:')
      venues.slice(0, 5).forEach(venue => {
        console.log(`   • ${venue.google_name || venue.name_original} (${venue.status}-${venue.verification_status})`)
      })
      return { processed: 0, successful: 0, failed: 0 }
    }

    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: []
    }

    // Process in batches
    const totalBatches = Math.ceil(venues.length / BATCH_SIZE)
    
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const batchStart = batchIndex * BATCH_SIZE
      const batchEnd = Math.min(batchStart + BATCH_SIZE, venues.length)
      const batch = venues.slice(batchStart, batchEnd)
      
      console.log(`\n📦 Processing batch ${batchIndex + 1}/${totalBatches} (${batch.length} venues)`)
      
      // Process venues in batch sequentially to avoid overwhelming the API
      for (const venue of batch) {
        const result = await processVenueImage(venue)
        results.processed++
        
        if (result.success) {
          results.successful++
        } else {
          results.failed++
          results.errors.push({
            venue_id: result.venue_id,
            venue_name: venue.google_name || venue.name_original,
            error: result.error
          })
        }
        
        // Small delay between individual images
        if (results.processed < venues.length) {
          await sleep(DELAY_BETWEEN_IMAGES)
        }
      }
      
      // Delay between batches (except for the last batch)
      if (batchIndex < totalBatches - 1) {
        console.log(`⏸️  Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`)
        await sleep(DELAY_BETWEEN_BATCHES)
      }
    }

    // Final summary
    console.log(`\n🎉 Bulk processing completed!`)
    console.log('📊 Results:')
    console.log(`   • Total processed: ${results.processed}`)
    console.log(`   • Successful: ${results.successful}`)
    console.log(`   • Failed: ${results.failed}`)
    console.log(`   • Success rate: ${((results.successful / results.processed) * 100).toFixed(1)}%`)
    
    if (results.errors.length > 0) {
      console.log(`\n❌ Failed venues (${results.errors.length}):`)
      results.errors.forEach(error => {
        console.log(`   • ${error.venue_name}: ${error.error}`)
      })
    }
    
    console.log('⏰ Completed at:', new Date().toISOString())
    
    // Log to database for audit trail
    await supabase.from('system_logs').insert({
      type: 'bulk_image_processing',
      message: `Bulk image processing completed: ${results.successful}/${results.processed} successful`,
      metadata: {
        processed: results.processed,
        successful: results.successful,
        failed: results.failed,
        success_rate: (results.successful / results.processed) * 100,
        errors: results.errors.slice(0, 10) // Log first 10 errors only
      }
    }).catch(err => console.warn('Failed to log to database:', err))

    return results

  } catch (error) {
    console.error('💥 Bulk processing failed:', error)
    
    // Log error to database
    await supabase.from('system_logs').insert({
      type: 'bulk_image_processing_error',
      message: 'Bulk image processing failed',
      metadata: { error: error.message, stack: error.stack }
    }).catch(err => console.warn('Failed to log error to database:', err))
    
    throw error
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2)
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Bulk Venue Image Processor

Usage:
  node bulk-process-venue-images.js [options]

Options:
  --help, -h        Show this help message
  --dry-run         Show what would be processed without actually doing it
  --batch-size N    Process N venues per batch (default: ${BATCH_SIZE})
  --delay N         Delay between batches in ms (default: ${DELAY_BETWEEN_BATCHES})

Examples:
  node bulk-process-venue-images.js                     # Process all unprocessed images
  node bulk-process-venue-images.js --dry-run           # See what would be processed
  node bulk-process-venue-images.js --batch-size 5      # Process in smaller batches
`)
    process.exit(0)
  }
  
  const dryRun = args.includes('--dry-run')
  
  // Override batch size if specified
  const batchSizeIndex = args.indexOf('--batch-size')
  if (batchSizeIndex !== -1 && args[batchSizeIndex + 1]) {
    const customBatchSize = parseInt(args[batchSizeIndex + 1])
    if (customBatchSize > 0) {
      console.log(`📦 Using custom batch size: ${customBatchSize}`)
    }
  }
  
  bulkProcessImages(dryRun)
    .then((results) => {
      if (results.failed > 0) {
        process.exit(1) // Exit with error code if some processing failed
      }
    })
    .catch((error) => {
      console.error('💥 Script failed:', error)
      process.exit(1)
    })
}

export { bulkProcessImages, getUnprocessedVenues }