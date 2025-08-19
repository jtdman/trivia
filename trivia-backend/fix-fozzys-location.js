#!/usr/bin/env node

/**
 * Fix Fozzy's missing google_location coordinates
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function fixFozzysLocation() {
  const venueId = '6c5ccea2-24e8-424d-b428-0910d2d73f00'
  const address = '150 Stephen P Yokich Pkwy Suite B, Spring Hill, TN 37174, USA'
  
  try {
    console.log('🔍 Geocoding Fozzy\'s address...')
    
    // Use Google Geocoding API to get coordinates
    const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${process.env.GOOGLE_PLACES_API_KEY}`)
    const data = await response.json()
    
    if (data.status !== 'OK' || !data.results[0]) {
      throw new Error(`Geocoding failed: ${data.status}`)
    }
    
    const location = data.results[0].geometry.location
    console.log('📍 Found coordinates:', location)
    
    // Update venue with PostGIS POINT
    const { error } = await supabase
      .from('venues')
      .update({
        google_location: `POINT(${location.lng} ${location.lat})`
      })
      .eq('id', venueId)
    
    if (error) throw error
    
    console.log('✅ Updated Fozzy\'s location successfully!')
    console.log(`Coordinates: ${location.lat}, ${location.lng}`)
    
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

fixFozzysLocation()