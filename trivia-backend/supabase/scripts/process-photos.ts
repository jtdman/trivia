import { supabase, GOOGLE_PLACES_API_KEY, RATE_LIMITS } from '../config/supabase.js'

interface PhotoProcessingOptions {
  limit?: number
  maxWidth?: number
  maxHeight?: number
  dryRun?: boolean
}

class PhotoProcessor {
  private apiCallsToday = 0

  async checkDailyLimit(): Promise<boolean> {
    const { data } = await supabase.rpc('check_daily_api_limit', { service: 'google_places' })
    this.apiCallsToday = data || 0
    
    if (this.apiCallsToday >= RATE_LIMITS.GOOGLE_PLACES.MAX_DAILY_REQUESTS) {
      console.error(`Daily API limit reached: ${this.apiCallsToday}/${RATE_LIMITS.GOOGLE_PLACES.MAX_DAILY_REQUESTS}`)
      return false
    }
    
    // API limit checked
    return true
  }

  async getVenuesWithPhotos(limit?: number) {
    let query = supabase
      .from('venues')
      .select('id, name_original, google_place_id, google_photo_reference, thumbnail_url')
      .not('google_photo_reference', 'is', null)
      .is('thumbnail_url', null) // Only venues without processed thumbnails

    if (limit) {
      query = query.limit(limit)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Error fetching venues with photos: ${error.message}`)
    }

    return data || []
  }

  async downloadGooglePhoto(photoReference: string, maxWidth = 400, maxHeight = 400): Promise<Buffer> {
    if (!GOOGLE_PLACES_API_KEY) {
      throw new Error('Google Places API key not configured')
    }

    const url = new URL('https://maps.googleapis.com/maps/api/place/photo')
    url.searchParams.set('photo_reference', photoReference)
    url.searchParams.set('maxwidth', maxWidth.toString())
    url.searchParams.set('maxheight', maxHeight.toString())
    url.searchParams.set('key', GOOGLE_PLACES_API_KEY)

    // Downloading photo

    const response = await fetch(url.toString())

    // Log API usage
    await supabase.rpc('log_api_usage', {
      p_service_name: 'google_places',
      p_endpoint: 'photo',
      p_response_status: response.status,
      p_error_message: !response.ok ? `HTTP ${response.status}` : null
    })

    this.apiCallsToday++

    if (!response.ok) {
      throw new Error(`Failed to download photo: HTTP ${response.status}`)
    }

    return Buffer.from(await response.arrayBuffer())
  }

  async uploadToSupabase(imageBuffer: Buffer, fileName: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from('venue-thumbnails')
      .upload(fileName, imageBuffer, {
        contentType: 'image/jpeg',
        upsert: true
      })

    if (error) {
      throw new Error(`Failed to upload to Supabase Storage: ${error.message}`)
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('venue-thumbnails')
      .getPublicUrl(fileName)

    return publicUrl
  }

  async processVenuePhoto(venue: any, options: PhotoProcessingOptions = {}): Promise<boolean> {
    console.log(`Processing photo for: ${venue.name_original}`)

    if (this.apiCallsToday >= RATE_LIMITS.GOOGLE_PLACES.MAX_DAILY_REQUESTS) {
      console.warn('Daily API limit reached, stopping photo processing')
      return false
    }

    try {
      // Download photo from Google Places
      const imageBuffer = await this.downloadGooglePhoto(
        venue.google_photo_reference,
        options.maxWidth || 400,
        options.maxHeight || 400
      )

      // Rate limiting delay
      await new Promise(resolve => setTimeout(resolve, RATE_LIMITS.GOOGLE_PLACES.DELAY_BETWEEN_REQUESTS))

      if (options.dryRun) {
        // Photo downloaded (DRY RUN)
        return true
      }

      // Generate filename
      const fileName = `${venue.id}.jpg`

      // Upload to Supabase Storage
      const thumbnailUrl = await this.uploadToSupabase(imageBuffer, fileName)

      // Update venue record with thumbnail URL
      const { error } = await supabase
        .from('venues')
        .update({ thumbnail_url: thumbnailUrl })
        .eq('id', venue.id)

      if (error) {
        console.error(`Error updating venue with thumbnail URL: ${error.message}`)
        return false
      }

      // Photo processed and uploaded
      return true

    } catch (error) {
      console.error(`❌ Error processing photo: ${error}`)
      return false
    }
  }

  async processPhotos(options: PhotoProcessingOptions = {}) {
    console.log('Starting photo processing...')
    
    // Check daily API limit
    const canProceed = await this.checkDailyLimit()
    if (!canProceed) {
      console.error('Cannot proceed: Daily API limit reached')
      return
    }

    // Check if storage bucket exists
    if (!options.dryRun) {
      const { data: buckets } = await supabase.storage.listBuckets()
      const venueThumbailsBucket = buckets?.find(b => b.name === 'venue-thumbnails')
      
      if (!venueThumbailsBucket) {
        // Creating storage bucket
        const { error } = await supabase.storage.createBucket('venue-thumbnails', {
          public: true
        })
        
        if (error) {
          console.error('Failed to create storage bucket:', error.message)
          return
        }
        
        // Storage bucket created
      }
    }

    const venues = await this.getVenuesWithPhotos(options.limit)
    console.log(`Found ${venues.length} venues with photos to process`)

    if (options.dryRun) {
      console.log('\n🔍 DRY RUN MODE - No changes will be made')
    }

    let processed = 0
    let successful = 0
    let failed = 0

    for (const venue of venues) {
      processed++
      
      const success = await this.processVenuePhoto(venue, options)
      if (success) {
        successful++
      } else {
        failed++
      }

      // Check if we've hit the daily limit
      if (this.apiCallsToday >= RATE_LIMITS.GOOGLE_PLACES.MAX_DAILY_REQUESTS) {
        console.warn(`\nStopping photo processing: Daily API limit reached after ${processed} venues`)
        break
      }

      // Progress update
      if (processed % 5 === 0) {
        console.log(`Progress: ${processed}/${venues.length} photos (${this.apiCallsToday} API calls)`)
      }
    }

    console.log('\n' + '-'.repeat(50))
    console.log('Photo processing completed!')
    console.log(`Processed: ${processed}/${venues.length}`)
    console.log(`Successful: ${successful}`)
    console.log(`Failed: ${failed}`)
    console.log(`API calls used: ${this.apiCallsToday}/${RATE_LIMITS.GOOGLE_PLACES.MAX_DAILY_REQUESTS}`)
  }

  async showPhotoStats() {
    const { data } = await supabase
      .from('venues')
      .select('google_photo_reference, thumbnail_url')

    if (!data) {
      console.log('No venue data found')
      return
    }

    const withPhotoReference = data.filter(v => v.google_photo_reference).length
    const withThumbnail = data.filter(v => v.thumbnail_url).length
    const needsProcessing = data.filter(v => v.google_photo_reference && !v.thumbnail_url).length

    console.log('\n📸 Photo Processing Status:')
    console.log(`   Venues with Google photo reference: ${withPhotoReference}`)
    console.log(`   Venues with processed thumbnails: ${withThumbnail}`)
    console.log(`   Venues needing photo processing: ${needsProcessing}`)
    console.log(`   Total venues: ${data.length}`)

    // Show API usage for today
    const { data: apiUsage } = await supabase.rpc('check_daily_api_limit', { service: 'google_places' })
    console.log(`\n🔌 API Usage Today: ${apiUsage || 0}/${RATE_LIMITS.GOOGLE_PLACES.MAX_DAILY_REQUESTS}`)
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2]
  const processor = new PhotoProcessor()

  switch (command) {
    case 'stats':
      processor.showPhotoStats()
        .then(() => process.exit(0))
        .catch(error => {
          console.error('Error:', error)
          process.exit(1)
        })
      break

    case 'process':
      const options: PhotoProcessingOptions = {}
      
      // Parse command line options
      if (process.argv.includes('--dry-run')) options.dryRun = true
      
      const limitIndex = process.argv.indexOf('--limit')
      if (limitIndex !== -1 && process.argv[limitIndex + 1]) {
        options.limit = parseInt(process.argv[limitIndex + 1])
      }

      const widthIndex = process.argv.indexOf('--width')
      if (widthIndex !== -1 && process.argv[widthIndex + 1]) {
        options.maxWidth = parseInt(process.argv[widthIndex + 1])
      }

      const heightIndex = process.argv.indexOf('--height')
      if (heightIndex !== -1 && process.argv[heightIndex + 1]) {
        options.maxHeight = parseInt(process.argv[heightIndex + 1])
      }

      processor.processPhotos(options)
        .then(() => process.exit(0))
        .catch(error => {
          console.error('Photo processing failed:', error)
          process.exit(1)
        })
      break

    default:
      console.log('Usage:')
      console.log('  npm run process-photos stats                     # Show photo processing statistics')
      console.log('  npm run process-photos process [options]         # Process venue photos')
      console.log('')
      console.log('Processing options:')
      console.log('  --dry-run                                        # Preview downloads without uploading')
      console.log('  --limit N                                        # Limit to N venues')
      console.log('  --width N                                        # Max thumbnail width (default: 400)')
      console.log('  --height N                                       # Max thumbnail height (default: 400)')
      console.log('')
      console.log('Examples:')
      console.log('  npm run process-photos process --dry-run --limit 5')
      console.log('  npm run process-photos process --limit 20 --width 300 --height 300')
      process.exit(1)
  }
}