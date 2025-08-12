// Supabase Edge Function to process venue images
// This function fetches images from Google Places API and stores them in Supabase Storage

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  console.log('Edge function started')
  
  try {
    // Get the Google Places API key from environment
    const GOOGLE_PLACES_API_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY')
    console.log('GOOGLE_PLACES_API_KEY exists:', !!GOOGLE_PLACES_API_KEY)
    
    if (!GOOGLE_PLACES_API_KEY) {
      throw new Error('GOOGLE_PLACES_API_KEY is not configured')
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    console.log('Supabase URL exists:', !!supabaseUrl)
    console.log('Service key exists:', !!supabaseServiceKey)
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request body
    let requestData
    try {
      requestData = await req.json()
      console.log('Request data:', requestData)
    } catch (e) {
      throw new Error('Invalid JSON in request body')
    }

    const { venue_id, google_photo_reference } = requestData

    if (!venue_id) {
      throw new Error('venue_id is required')
    }

    console.log(`Processing image for venue ${venue_id}`)

    // Get the venue's google_place_id so we can fetch a fresh photo reference
    console.log('Fetching venue details from database...')
    const { data: venue, error: venueError } = await supabase
      .from('venues')
      .select('google_place_id, google_name, name_original')
      .eq('id', venue_id)
      .single()

    if (venueError || !venue) {
      throw new Error(`Failed to fetch venue: ${venueError?.message || 'Venue not found'}`)
    }

    if (!venue.google_place_id) {
      throw new Error('Venue does not have a google_place_id - cannot fetch fresh photo reference')
    }

    console.log(`Getting fresh photo reference for venue: ${venue.google_name || venue.name_original}`)

    // 1. Get fresh venue details including photo reference from Google Places API
    const placeDetailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?` +
      `place_id=${venue.google_place_id}&` +
      `fields=photos&` +
      `key=${GOOGLE_PLACES_API_KEY}`

    console.log('Fetching fresh place details from Google...')
    const placeDetailsResponse = await fetch(placeDetailsUrl)
    
    if (!placeDetailsResponse.ok) {
      throw new Error(`Failed to fetch place details: ${placeDetailsResponse.status} ${placeDetailsResponse.statusText}`)
    }

    const placeDetailsData = await placeDetailsResponse.json()
    console.log('Place details response status:', placeDetailsData.status)

    if (placeDetailsData.status !== 'OK') {
      throw new Error(`Google Places API error: ${placeDetailsData.status}`)
    }

    const photos = placeDetailsData.result?.photos
    if (!photos || photos.length === 0) {
      throw new Error('No photos available for this venue')
    }

    const freshPhotoReference = photos[0].photo_reference
    console.log(`Got fresh photo reference: ${freshPhotoReference.substring(0, 20)}...`)

    // 2. Now fetch the actual image using the fresh photo reference
    const googlePhotoUrl = `https://maps.googleapis.com/maps/api/place/photo?` +
      `photo_reference=${encodeURIComponent(freshPhotoReference)}&` +
      `maxwidth=800&` +
      `maxheight=600&` +
      `key=${GOOGLE_PLACES_API_KEY}`

    console.log('Fetching image from Google Places API...')
    console.log('Full Google URL (without key):', googlePhotoUrl.replace(/key=[^&]*/, 'key=***'))
    const imageResponse = await fetch(googlePhotoUrl)
    
    if (!imageResponse.ok) {
      let errorText = 'Unknown error'
      try {
        errorText = await imageResponse.text()
        console.log('Google API error response:', errorText)
      } catch (e) {
        console.log('Could not parse error response')
      }
      throw new Error(`Failed to fetch image from Google Places: ${imageResponse.status} ${imageResponse.statusText} - ${errorText}`)
    }

    console.log('Image fetched successfully, content type:', imageResponse.headers.get('content-type'))

    // Get the actual image data
    const imageBlob = await imageResponse.blob()
    const imageArrayBuffer = await imageBlob.arrayBuffer()
    const imageUint8Array = new Uint8Array(imageArrayBuffer)

    console.log('Image size:', imageUint8Array.length, 'bytes')

    // 2. Upload to Supabase Storage
    const fileName = `${venue_id}.jpg`
    const bucketName = 'venue-thumbnails'

    console.log('Checking if bucket exists...')

    // Check if bucket exists, create if not
    const { data: buckets } = await supabase.storage.listBuckets()
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName)

    if (!bucketExists) {
      console.log('Creating bucket...')
      const { error: createBucketError } = await supabase.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
      })
      
      if (createBucketError) {
        console.error('Error creating bucket:', createBucketError)
        // Bucket might already exist, continue anyway
      } else {
        console.log('Bucket created successfully')
      }
    }

    console.log('Uploading image to storage...')

    // Upload the image
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, imageUint8Array, {
        contentType: 'image/jpeg',
        upsert: true // Replace if exists
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      throw new Error(`Failed to upload image to storage: ${uploadError.message}`)
    }

    console.log('Upload successful:', uploadData)

    // 3. Get the public URL for the uploaded image
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName)

    console.log(`Image uploaded successfully. Public URL: ${publicUrl}`)

    // 4. Update the venue record with the thumbnail_url
    const { error: updateError } = await supabase
      .from('venues')
      .update({ 
        thumbnail_url: publicUrl,
        image_processed_at: new Date().toISOString()
      })
      .eq('id', venue_id)

    if (updateError) {
      console.error('Update error:', updateError)
      throw new Error(`Failed to update venue record: ${updateError.message}`)
    }

    console.log(`Successfully processed image for venue ${venue_id}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        venue_id,
        thumbnail_url: publicUrl,
        message: 'Image processed successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error processing image:', error)
    
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