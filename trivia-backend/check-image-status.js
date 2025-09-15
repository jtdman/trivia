#!/usr/bin/env node

/**
 * Image Processing Status Checker
 * 
 * Quick script to check the status of venue image processing
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkImageStatus() {
  console.log('📊 Venue Image Processing Status Report')
  console.log('=' .repeat(50))
  
  try {
    // Get overall venue counts
    const { count: totalCount, error: totalError } = await supabase
      .from('venues')
      .select('*', { count: 'exact', head: true })

    if (totalError) throw totalError

    // Get venues with Google photos
    const { count: googleCount, error: googleError } = await supabase
      .from('venues')
      .select('*', { count: 'exact', head: true })
      .not('google_photo_reference', 'is', null)

    if (googleError) throw googleError

    // Get venues with processed thumbnails
    const { count: thumbnailCount, error: thumbnailError } = await supabase
      .from('venues')
      .select('*', { count: 'exact', head: true })
      .not('thumbnail_url', 'is', null)

    if (thumbnailError) throw thumbnailError

    // Get venues needing processing
    const { count: needCount, error: needError } = await supabase
      .from('venues')
      .select('*', { count: 'exact', head: true })
      .not('google_photo_reference', 'is', null)
      .is('thumbnail_url', null)

    if (needError) throw needError

    // Calculate percentages
    const processedPercentage = googleCount > 0 
      ? ((googleCount - needCount) / googleCount * 100).toFixed(1)
      : 0

    // Display results
    console.log(`📋 Total venues: ${totalCount || 0}`)
    console.log(`📸 With Google photos: ${googleCount || 0}`)
    console.log(`✅ Processed thumbnails: ${thumbnailCount || 0}`)
    console.log(`⏳ Need processing: ${needCount || 0}`)
    console.log(`📊 Processing completion: ${processedPercentage}%`)
    
    if (needCount > 0) {
      console.log(`\n💡 To process remaining images:`)
      console.log(`   node bulk-process-venue-images.js --dry-run  # Preview`)
      console.log(`   node bulk-process-venue-images.js            # Execute`)
    } else {
      console.log(`\n🎉 All venues with Google photos have been processed!`)
    }

    // Get breakdown by status
    const { data: statusBreakdown, error: statusError } = await supabase
      .from('venues')
      .select('status, verification_status')
      .not('google_photo_reference', 'is', null)
      .is('thumbnail_url', null)

    if (!statusError && statusBreakdown.length > 0) {
      console.log(`\n📋 Unprocessed venues by status:`)
      const breakdown = statusBreakdown.reduce((acc, venue) => {
        const key = `${venue.status}-${venue.verification_status}`
        acc[key] = (acc[key] || 0) + 1
        return acc
      }, {})
      
      Object.entries(breakdown).forEach(([status, count]) => {
        console.log(`   ${status}: ${count} venues`)
      })
    }

  } catch (error) {
    console.error('❌ Error checking image status:', error)
    process.exit(1)
  }
}

// Run the check
checkImageStatus()