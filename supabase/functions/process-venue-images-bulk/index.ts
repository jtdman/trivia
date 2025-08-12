// Supabase Edge Function to bulk process venue images
// This function processes multiple venues that have google_photo_reference but no thumbnail_url

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function processVenueImage(
  venue_id: string,
  google_place_id: string,
  googleApiKey: string,
  supabase: any
): Promise<{ success: boolean; venue_id: string; thumbnail_url?: string; error?: string }> {
  try {
    console.log(`Processing image for venue ${venue_id}`)

    if (!google_place_id) {
      throw new Error('No google_place_id available for fresh photo reference')
    }

    // 1. Get fresh photo reference from Google Places API
    const placeDetailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?` +
      `place_id=${google_place_id}&` +
      `fields=photos&` +
      `key=${googleApiKey}`

    const placeDetailsResponse = await fetch(placeDetailsUrl)
    
    if (!placeDetailsResponse.ok) {
      throw new Error(`Failed to fetch place details: ${placeDetailsResponse.status}`)
    }

    const placeDetailsData = await placeDetailsResponse.json()
    if (placeDetailsData.status !== 'OK') {
      throw new Error(`Google Places API error: ${placeDetailsData.status}`)
    }

    const photos = placeDetailsData.result?.photos
    if (!photos || photos.length === 0) {
      throw new Error('No photos available for this venue')
    }

    const freshPhotoReference = photos[0].photo_reference

    // 2. Now fetch the actual image using the fresh photo reference
    const googlePhotoUrl = `https://maps.googleapis.com/maps/api/place/photo?` +
      `photo_reference=${encodeURIComponent(freshPhotoReference)}&` +
      `maxwidth=800&` +
      `maxheight=600&` +
      `key=${googleApiKey}`

    const imageResponse = await fetch(googlePhotoUrl)
    
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image from Google Places: ${imageResponse.status}`)
    }

    // Get the actual image data
    const imageBlob = await imageResponse.blob()
    const imageArrayBuffer = await imageBlob.arrayBuffer()
    const imageUint8Array = new Uint8Array(imageArrayBuffer)

    // 2. Upload to Supabase Storage
    const fileName = `${venue_id}.jpg`
    const bucketName = 'venue-thumbnails'

    // Upload the image
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, imageUint8Array, {
        contentType: 'image/jpeg',
        upsert: true // Replace if exists
      })

    if (uploadError) {
      throw new Error(`Failed to upload image: ${uploadError.message}`)
    }

    // 3. Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName)

    // 4. Update the venue record
    const { error: updateError } = await supabase
      .from('venues')
      .update({ 
        thumbnail_url: publicUrl,
        image_processed_at: new Date().toISOString()
      })
      .eq('id', venue_id)

    if (updateError) {
      throw new Error(`Failed to update venue: ${updateError.message}`)
    }

    return { success: true, venue_id, thumbnail_url: publicUrl }
  } catch (error) {
    console.error(`Error processing venue ${venue_id}:`, error)
    return { success: false, venue_id, error: error.message }
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the Google Places API key from environment
    const GOOGLE_PLACES_API_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY')
    if (!GOOGLE_PLACES_API_KEY) {
      throw new Error('GOOGLE_PLACES_API_KEY is not configured')
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request body (optional limit parameter)
    const { limit = 10 } = await req.json().catch(() => ({ limit: 10 }))

    // Ensure bucket exists
    const bucketName = 'venue-thumbnails'
    const { data: buckets } = await supabase.storage.listBuckets()
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName)

    if (!bucketExists) {
      const { error: createBucketError } = await supabase.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
      })
      
      if (createBucketError && !createBucketError.message.includes('already exists')) {
        console.error('Error creating bucket:', createBucketError)
      }
    }

    // Get venues that need processing
    const { data: venues, error: fetchError } = await supabase
      .from('venues')
      .select('id, google_place_id, google_photo_reference')
      .not('google_photo_reference', 'is', null)
      .not('google_place_id', 'is', null)
      .is('thumbnail_url', null)
      .limit(limit)

    if (fetchError) {
      throw new Error(`Failed to fetch venues: ${fetchError.message}`)
    }

    if (!venues || venues.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No venues need processing',
          processed: 0,
          results: []
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    console.log(`Processing ${venues.length} venues...`)

    // Process venues in parallel (but limit concurrency to avoid rate limits)
    const batchSize = 3 // Process 3 at a time
    const results = []
    
    for (let i = 0; i < venues.length; i += batchSize) {
      const batch = venues.slice(i, i + batchSize)
      const batchPromises = batch.map(venue => 
        processVenueImage(
          venue.id,
          venue.google_place_id,
          GOOGLE_PLACES_API_KEY,
          supabase
        )
      )
      
      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)
      
      // Small delay between batches to avoid rate limiting
      if (i + batchSize < venues.length) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    const successCount = results.filter(r => r.success).length
    const failureCount = results.filter(r => !r.success).length

    console.log(`Processed ${successCount} successfully, ${failureCount} failed`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processed ${successCount} venues successfully, ${failureCount} failed`,
        processed: successCount,
        failed: failureCount,
        results
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error in bulk processing:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})