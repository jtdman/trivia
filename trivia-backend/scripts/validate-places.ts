import { supabase, GOOGLE_PLACES_API_KEY, RATE_LIMITS } from '../lib/supabase.js'
import sharp from 'sharp'

interface ValidationOptions {
  status?: 'pending' | 'failed' | 'needs_review'
  limit?: number
  dryRun?: boolean
}

export class PlacesValidator {
  private apiCallsToday = 0

  async checkDailyLimit(): Promise<boolean> {
    const { data } = await supabase.rpc('check_daily_api_limit', { service: 'google_places' })
    this.apiCallsToday = data || 0
    
    if (this.apiCallsToday >= RATE_LIMITS.GOOGLE_PLACES.MAX_DAILY_REQUESTS) {
      console.error(`Daily API limit reached: ${this.apiCallsToday}/${RATE_LIMITS.GOOGLE_PLACES.MAX_DAILY_REQUESTS}`)
      return false
    }
    
    // API limit logged at start of validation
    return true
  }

  async getVenuesToValidate(options: ValidationOptions = {}) {
    let query = supabase
      .from('venues')
      .select('id, name_original, address_original, google_place_id, verification_status, last_places_api_call')

    // Filter by verification status
    if (options.status) {
      query = query.eq('verification_status', options.status)
    } else {
      // Default: get venues that need validation
      query = query.in('verification_status', ['pending', 'failed', 'needs_review'])
    }

    // Limit results
    if (options.limit) {
      query = query.limit(options.limit)
    }

    // Order by last validation attempt (oldest first)
    query = query.order('last_places_api_call', { ascending: true, nullsFirst: true })

    const { data, error } = await query

    if (error) {
      throw new Error(`Error fetching venues: ${error.message}`)
    }

    return data || []
  }

  async searchGooglePlaces(venueName: string, address: string) {
    if (!GOOGLE_PLACES_API_KEY) {
      throw new Error('Google Places API key not configured')
    }

    // API key configured

    const query = `${venueName} ${address}`
    const url = new URL('https://maps.googleapis.com/maps/api/place/findplacefromtext/json')
    
    url.searchParams.set('input', query)
    url.searchParams.set('inputtype', 'textquery')
    url.searchParams.set('fields', [
      'place_id',
      'name', 
      'formatted_address',
      'geometry',
      'rating',
      'user_ratings_total',
      'price_level',
      'business_status',
      'types',
      'photos'
    ].join(','))
    url.searchParams.set('key', GOOGLE_PLACES_API_KEY)

    // Making API request

    const response = await fetch(url.toString())
    const data = await response.json()
    
    if (data.error_message) {
      console.error(`❌ API Error: ${data.error_message}`)
    }

    // Log API usage
    await supabase.rpc('log_api_usage', {
      p_service_name: 'google_places',
      p_endpoint: 'findplacefromtext',
      p_response_status: response.status,
      p_error_message: data.status !== 'OK' ? data.status : null
    })

    this.apiCallsToday++

    return data
  }

  async getPlaceDetails(placeId: string) {
    if (!GOOGLE_PLACES_API_KEY) {
      throw new Error('Google Places API key not configured')
    }

    const url = new URL('https://maps.googleapis.com/maps/api/place/details/json')
    
    url.searchParams.set('place_id', placeId)
    url.searchParams.set('fields', [
      'formatted_phone_number',
      'website'
    ].join(','))
    url.searchParams.set('key', GOOGLE_PLACES_API_KEY)

    // Getting place details

    const response = await fetch(url.toString())
    const data = await response.json()
    
    // Log API usage for details call
    await supabase.rpc('log_api_usage', {
      p_service_name: 'google_places',
      p_endpoint: 'details',
      p_response_status: response.status,
      p_error_message: data.status !== 'OK' ? data.status : null
    })

    this.apiCallsToday++

    return data
  }

  async downloadGooglePhoto(photoReference: string, maxWidth = 400, maxHeight = 400): Promise<Buffer> {
    if (!GOOGLE_PLACES_API_KEY) {
      throw new Error('Google Places API key not configured')
    }

    const params = new URLSearchParams({
      photo_reference: photoReference,
      maxwidth: maxWidth.toString(),
      maxheight: maxHeight.toString(),
      key: GOOGLE_PLACES_API_KEY
    })

    const url = `https://maps.googleapis.com/maps/api/place/photo?${params.toString()}`
    // Downloading photo

    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`Failed to download photo: ${response.status} ${response.statusText}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  }

  async ensureStorageBucketExists(): Promise<void> {
    try {
      // Check if bucket exists
      const { data: buckets } = await supabase.storage.listBuckets()
      const bucketExists = buckets?.some(bucket => bucket.name === 'venue-thumbnails')
      
      if (!bucketExists) {
        // Creating storage bucket
        const { error } = await supabase.storage.createBucket('venue-thumbnails', {
          public: true,
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
        })
        
        if (error) {
          console.error('Error creating storage bucket:', error.message)
        } else {
          // Storage bucket created
        }
      }
    } catch (error) {
      console.warn('Could not verify storage bucket:', error)
    }
  }

  async uploadPhotoToSupabase(venueId: string, imageBuffer: Buffer): Promise<string | null> {
    try {
      // Ensure bucket exists
      await this.ensureStorageBucketExists()
      
      // Resize and optimize the image
      const processedImageBuffer = await sharp(imageBuffer)
        .resize(400, 400, { fit: 'cover' })
        .jpeg({ quality: 85 })
        .toBuffer()

      const fileName = `${venueId}.jpg`
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('venue-thumbnails')
        .upload(fileName, processedImageBuffer, {
          contentType: 'image/jpeg',
          upsert: true // Overwrite if exists
        })

      if (error) {
        console.error(`Error uploading photo for venue ${venueId}:`, error.message)
        return null
      }

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('venue-thumbnails')
        .getPublicUrl(fileName)

      // Photo uploaded successfully
      return urlData.publicUrl

    } catch (error) {
      console.error(`Error processing photo for venue ${venueId}:`, error)
      return null
    }
  }

  async validateVenue(venue: any, dryRun = false) {
    console.log(`\nValidating: ${venue.name_original}`)
    console.log(`Address: ${venue.address_original}`)
    console.log(`Current status: ${venue.verification_status}`)

    if (this.apiCallsToday >= RATE_LIMITS.GOOGLE_PLACES.MAX_DAILY_REQUESTS) {
      console.warn('Daily API limit reached, stopping validation')
      return false
    }

    try {
      const placesData = await this.searchGooglePlaces(venue.name_original, venue.address_original)
      
      // Rate limiting delay
      await new Promise(resolve => setTimeout(resolve, RATE_LIMITS.GOOGLE_PLACES.DELAY_BETWEEN_REQUESTS))

      if (placesData.status === 'OK' && placesData.candidates.length > 0) {
        const place = placesData.candidates[0]
        
        console.log(`✅ Found: ${place.name}`)

        // Get additional details (phone, website)
        let phoneNumber = null
        let website = null
        
        if (!dryRun) {
          try {
            const detailsData = await this.getPlaceDetails(place.place_id)
            if (detailsData.status === 'OK' && detailsData.result) {
              phoneNumber = detailsData.result.formatted_phone_number
              website = detailsData.result.website
              // Additional details retrieved
            }
            
            // Rate limiting delay after details call
            await new Promise(resolve => setTimeout(resolve, RATE_LIMITS.GOOGLE_PLACES.DELAY_BETWEEN_REQUESTS))
          } catch (detailsError) {
            console.warn(`⚠️  Could not get place details: ${detailsError}`)
          }
        }

        if (!dryRun) {
          // Download and upload photo if available
          let thumbnailUrl = null
          const photoReference = place.photos?.[0]?.photo_reference
          
          if (photoReference) {
            try {
              // Processing photo
              const imageBuffer = await this.downloadGooglePhoto(photoReference)
              
              // Rate limiting delay after photo download
              await new Promise(resolve => setTimeout(resolve, RATE_LIMITS.GOOGLE_PLACES.DELAY_BETWEEN_REQUESTS))
              
              thumbnailUrl = await this.uploadPhotoToSupabase(venue.id, imageBuffer)
            } catch (photoError) {
              console.warn(`⚠️  Failed to process photo: ${photoError}`)
              // Continue with venue update even if photo fails
            }
          }

          // Update venue with Google Places data
          const updateData: any = {
            google_place_id: place.place_id,
            google_name: place.name,
            google_formatted_address: place.formatted_address,
            google_location: `POINT(${place.geometry.location.lng} ${place.geometry.location.lat})`,
            google_rating: place.rating,
            google_user_ratings_total: place.user_ratings_total,
            google_price_level: place.price_level,
            google_business_status: place.business_status,
            google_types: place.types,
            google_photo_reference: photoReference,
            google_phone_number: phoneNumber,
            google_website: website,
            thumbnail_url: thumbnailUrl,
            verification_status: 'verified',
            last_verified_at: new Date().toISOString(),
            last_places_api_call: new Date().toISOString()
          }

          const { error } = await supabase
            .from('venues')
            .update(updateData)
            .eq('id', venue.id)

          if (error) {
            console.error(`Error updating venue: ${error.message}`)
            return false
          }

          // Venue updated
        }

        return true
      } else {
        console.log(`❌ No places found (status: ${placesData.status})`)
        
        if (!dryRun) {
          // Mark as failed
          const { error } = await supabase
            .from('venues')
            .update({
              verification_status: 'failed',
              verification_notes: `Google Places search failed: ${placesData.status}`,
              last_places_api_call: new Date().toISOString()
            })
            .eq('id', venue.id)

          if (error) {
            console.error(`Error updating venue status: ${error.message}`)
          }
        }

        return false
      }
    } catch (error) {
      console.error(`Error validating venue: ${error}`)
      
      if (!dryRun) {
        // Mark as failed with error
        await supabase
          .from('venues')
          .update({
            verification_status: 'failed',
            verification_notes: error instanceof Error ? error.message : 'Unknown error',
            last_places_api_call: new Date().toISOString()
          })
          .eq('id', venue.id)
      }

      return false
    }
  }

  async validateVenues(options: ValidationOptions = {}) {
    console.log('Starting venue validation...')
    
    // Check daily API limit
    const canProceed = await this.checkDailyLimit()
    if (!canProceed) {
      console.error('Cannot proceed: Daily API limit reached')
      return
    }

    const venues = await this.getVenuesToValidate(options)
    console.log(`Found ${venues.length} venues to validate`)

    if (options.dryRun) {
      console.log('\n🔍 DRY RUN MODE - No changes will be made')
    }

    let processed = 0
    let successful = 0
    let failed = 0

    for (const venue of venues) {
      processed++
      
      const success = await this.validateVenue(venue, options.dryRun)
      if (success) {
        successful++
      } else {
        failed++
      }

      // Check if we've hit the daily limit
      if (this.apiCallsToday >= RATE_LIMITS.GOOGLE_PLACES.MAX_DAILY_REQUESTS) {
        console.warn(`\nStopping validation: Daily API limit reached after ${processed} venues`)
        break
      }

      // Progress update
      if (processed % 5 === 0) {
        console.log(`Progress: ${processed}/${venues.length} venues (${this.apiCallsToday} API calls)`)
      }
    }

    console.log('\n' + '-'.repeat(50))
    console.log('Validation completed!')
    console.log(`Processed: ${processed}/${venues.length}`)
    console.log(`Successful: ${successful}`)
    console.log(`Failed: ${failed}`)
    console.log(`API calls used: ${this.apiCallsToday}/${RATE_LIMITS.GOOGLE_PLACES.MAX_DAILY_REQUESTS}`)
  }

  async showValidationStats() {
    const { data } = await supabase
      .from('venues')
      .select('verification_status')

    if (!data) {
      console.log('No venue data found')
      return
    }

    const stats = data.reduce((acc, venue) => {
      acc[venue.verification_status] = (acc[venue.verification_status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    console.log('\n📊 Venue Validation Status:')
    console.log(`   Verified: ${stats.verified || 0}`)
    console.log(`   Pending: ${stats.pending || 0}`)
    console.log(`   Needs Review: ${stats.needs_review || 0}`)
    console.log(`   Failed: ${stats.failed || 0}`)
    console.log(`   Total: ${data.length}`)

    // Show API usage for today
    const { data: apiUsage } = await supabase.rpc('check_daily_api_limit', { service: 'google_places' })
    console.log(`\n🔌 API Usage Today: ${apiUsage || 0}/${RATE_LIMITS.GOOGLE_PLACES.MAX_DAILY_REQUESTS}`)
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2]
  const validator = new PlacesValidator()

  switch (command) {
    case 'stats':
      validator.showValidationStats()
        .then(() => process.exit(0))
        .catch(error => {
          console.error('Error:', error)
          process.exit(1)
        })
      break

    case 'validate':
      const options: ValidationOptions = {}
      
      // Parse command line options
      if (process.argv.includes('--dry-run')) options.dryRun = true
      if (process.argv.includes('--pending')) options.status = 'pending'
      if (process.argv.includes('--failed')) options.status = 'failed'
      if (process.argv.includes('--needs-review')) options.status = 'needs_review'
      
      const limitIndex = process.argv.indexOf('--limit')
      if (limitIndex !== -1 && process.argv[limitIndex + 1]) {
        options.limit = parseInt(process.argv[limitIndex + 1])
      }

      validator.validateVenues(options)
        .then(() => process.exit(0))
        .catch(error => {
          console.error('Validation failed:', error)
          process.exit(1)
        })
      break

    default:
      console.log('Usage:')
      console.log('  npm run validate-places stats                    # Show validation statistics')
      console.log('  npm run validate-places validate [options]      # Validate venues')
      console.log('')
      console.log('Validation options:')
      console.log('  --dry-run                                        # Preview changes without updating')
      console.log('  --pending                                        # Only validate pending venues')
      console.log('  --failed                                         # Only validate failed venues') 
      console.log('  --needs-review                                   # Only validate venues needing review')
      console.log('  --limit N                                        # Limit to N venues')
      console.log('')
      console.log('Examples:')
      console.log('  npm run validate-places validate --dry-run --limit 10')
      console.log('  npm run validate-places validate --failed --limit 50')
      process.exit(1)
  }
}