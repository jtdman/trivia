import { supabase, GOOGLE_PLACES_API_KEY, RATE_LIMITS } from '../lib/supabase.js'
import fs from 'fs/promises'

interface VenueData {
  venueInfo: {
    venueTitle: string
    venueAddress: string
    venueLinks: {
      website: string | null
      social: string[]
    }
    shows: Array<{
      date: string
      time: string
      game: string
    }>
    scrapedAt: string
  }
  fileName: string
}

interface GooglePlacesResponse {
  candidates: Array<{
    place_id: string
    name: string
    formatted_address: string
    geometry: {
      location: {
        lat: number
        lng: number
      }
      viewport: {
        northeast: { lat: number; lng: number }
        southwest: { lat: number; lng: number }
      }
    }
    rating?: number
    user_ratings_total?: number
    price_level?: number
    business_status?: string
    types?: string[]
    photos?: Array<{
      photo_reference: string
      height: number
      width: number
    }>
  }>
  status: string
}

class VenueImporter {
  private apiCallsToday = 0
  private challengeEntertainmentId: string | null = null

  async checkDailyLimit(): Promise<boolean> {
    const { data } = await supabase.rpc('check_daily_api_limit', { service: 'google_places' })
    this.apiCallsToday = data || 0
    
    if (this.apiCallsToday >= RATE_LIMITS.GOOGLE_PLACES.MAX_DAILY_REQUESTS) {
      console.error(`Daily API limit reached: ${this.apiCallsToday}/${RATE_LIMITS.GOOGLE_PLACES.MAX_DAILY_REQUESTS}`)
      return false
    }
    
    console.log(`API calls used today: ${this.apiCallsToday}/${RATE_LIMITS.GOOGLE_PLACES.MAX_DAILY_REQUESTS}`)
    return true
  }

  async getChallengeEntertainmentId(): Promise<string> {
    if (this.challengeEntertainmentId) return this.challengeEntertainmentId

    const { data, error } = await supabase
      .from('trivia_providers')
      .select('id')
      .eq('name', 'Challenge Entertainment')
      .single()

    if (error || !data) {
      throw new Error('Challenge Entertainment provider not found in database')
    }

    this.challengeEntertainmentId = data.id
    return data.id
  }

  async searchGooglePlaces(venueName: string, address: string): Promise<GooglePlacesResponse | null> {
    if (!GOOGLE_PLACES_API_KEY) {
      console.warn('Google Places API key not configured')
      return null
    }

    // Check if we've hit our daily limit
    if (this.apiCallsToday >= RATE_LIMITS.GOOGLE_PLACES.MAX_DAILY_REQUESTS) {
      console.warn('Daily API limit reached, skipping Google Places lookup')
      return null
    }

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
      'photos',
      'formatted_phone_number',
      'website'
    ].join(','))
    url.searchParams.set('key', GOOGLE_PLACES_API_KEY)

    try {
      console.log(`Searching Google Places for: ${query}`)
      
      const response = await fetch(url.toString())
      const data: GooglePlacesResponse = await response.json()

      // Log API usage
      await supabase.rpc('log_api_usage', {
        p_service_name: 'google_places',
        p_endpoint: 'findplacefromtext',
        p_response_status: response.status,
        p_error_message: data.status !== 'OK' ? data.status : null
      })

      this.apiCallsToday++

      if (data.status === 'OK' && data.candidates.length > 0) {
        return data
      } else {
        console.warn(`No places found for: ${query} (status: ${data.status})`)
        return null
      }
    } catch (error) {
      console.error(`Error searching Google Places for ${query}:`, error)
      
      // Log the error
      await supabase.rpc('log_api_usage', {
        p_service_name: 'google_places',
        p_endpoint: 'findplacefromtext',
        p_error_message: error instanceof Error ? error.message : 'Unknown error'
      })

      return null
    }
  }

  parseDateAndTime(dateStr: string, timeStr: string) {
    // Parse day of week from date string like "Tuesday, July 1, 2025"
    const dayOfWeek = dateStr.split(',')[0].trim()
    
    // Parse time from string like "7:00 PM"
    const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i)
    if (!timeMatch) {
      throw new Error(`Unable to parse time: ${timeStr}`)
    }

    let hours = parseInt(timeMatch[1])
    const minutes = parseInt(timeMatch[2])
    const period = timeMatch[3].toUpperCase()

    if (period === 'PM' && hours !== 12) hours += 12
    if (period === 'AM' && hours === 12) hours = 0

    const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`

    return { dayOfWeek, timeString }
  }

  async importVenue(venueData: VenueData): Promise<void> {
    const { venueInfo } = venueData
    
    try {
      // Check if venue already exists
      const { data: existingVenue } = await supabase
        .from('venues')
        .select('id, google_place_id, last_places_api_call, verification_status')
        .eq('name_original', venueInfo.venueTitle)
        .eq('address_original', venueInfo.venueAddress)
        .single()

      let venueId: string
      let placesData: GooglePlacesResponse | null = null
      let shouldUpdateVenue = false

      if (existingVenue) {
        venueId = existingVenue.id
        console.log(`Venue already exists: ${venueInfo.venueTitle}`)
        
        // Check if venue data is stale (older than 1 year) or missing Google Places data
        const oneYearAgo = new Date()
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
        
        const lastApiCall = existingVenue.last_places_api_call ? new Date(existingVenue.last_places_api_call) : null
        const isDataStale = !lastApiCall || lastApiCall < oneYearAgo
        const missingPlacesData = !existingVenue.google_place_id
        
        if (isDataStale || missingPlacesData) {
          console.log(`Venue data is ${isDataStale ? 'stale' : 'missing Google Places data'}, updating...`)
          placesData = await this.searchGooglePlaces(venueInfo.venueTitle, venueInfo.venueAddress)
          shouldUpdateVenue = true
          
          // Rate limiting delay
          await new Promise(resolve => setTimeout(resolve, RATE_LIMITS.GOOGLE_PLACES.DELAY_BETWEEN_REQUESTS))
        } else {
          console.log(`Venue data is fresh (< 1 year), skipping Google Places API call`)
        }
      } else {
        // Search Google Places for new venue
        placesData = await this.searchGooglePlaces(venueInfo.venueTitle, venueInfo.venueAddress)
        
        // Rate limiting delay
        await new Promise(resolve => setTimeout(resolve, RATE_LIMITS.GOOGLE_PLACES.DELAY_BETWEEN_REQUESTS))

        // Create venue record
        const venueRecord: any = {
          name_original: venueInfo.venueTitle,
          address_original: venueInfo.venueAddress,
          verification_status: placesData ? 'needs_review' : 'failed',
          last_places_api_call: new Date().toISOString()
        }

        // Add Google Places data if found
        if (placesData && placesData.candidates.length > 0) {
          const place = placesData.candidates[0]
          venueRecord.google_place_id = place.place_id
          venueRecord.google_name = place.name
          venueRecord.google_formatted_address = place.formatted_address
          venueRecord.google_location = `POINT(${place.geometry.location.lng} ${place.geometry.location.lat})`
          venueRecord.google_rating = place.rating
          venueRecord.google_user_ratings_total = place.user_ratings_total
          venueRecord.google_price_level = place.price_level
          venueRecord.google_business_status = place.business_status
          venueRecord.google_types = place.types
          venueRecord.google_photo_reference = place.photos?.[0]?.photo_reference
          venueRecord.google_phone_number = place.formatted_phone_number
          venueRecord.google_website = place.website
        }

        const { data: newVenue, error: venueError } = await supabase
          .from('venues')
          .insert(venueRecord)
          .select('id')
          .single()

        if (venueError) throw venueError
        venueId = newVenue.id
        console.log(`Created venue: ${venueInfo.venueTitle}`)
      }
      
      // Update existing venue with fresh Google Places data if needed
      if (shouldUpdateVenue && placesData && placesData.candidates.length > 0) {
        const place = placesData.candidates[0]
        const updateRecord: any = {
          google_place_id: place.place_id,
          google_name: place.name,
          google_formatted_address: place.formatted_address,
          google_location: `POINT(${place.geometry.location.lng} ${place.geometry.location.lat})`,
          google_rating: place.rating,
          google_user_ratings_total: place.user_ratings_total,
          google_price_level: place.price_level,
          google_business_status: place.business_status,
          google_types: place.types,
          google_photo_reference: place.photos?.[0]?.photo_reference,
          google_phone_number: place.formatted_phone_number,
          google_website: place.website,
          last_places_api_call: new Date().toISOString(),
          verification_status: 'needs_review'
        }
        
        await supabase
          .from('venues')
          .update(updateRecord)
          .eq('id', venueId)
          
        console.log(`Updated venue with fresh Google Places data: ${venueInfo.venueTitle}`)
      }

      // Replace events for this venue (delete old, insert new)
      const providerId = await this.getChallengeEntertainmentId()
      
      // First, delete all existing events for this venue
      const { error: deleteError } = await supabase
        .from('events')
        .delete()
        .eq('venue_id', venueId)
        
      if (deleteError) {
        console.error(`Error deleting existing events for ${venueInfo.venueTitle}:`, deleteError)
      } else {
        console.log(`Deleted existing events for venue: ${venueInfo.venueTitle}`)
      }
      
      // Insert new events from the JSON data
      const newEvents = []
      for (const show of venueInfo.shows) {
        try {
          const { dayOfWeek, timeString } = this.parseDateAndTime(show.date, show.time)

          const eventRecord = {
            venue_id: venueId,
            provider_id: providerId,
            event_type: show.game,
            day_of_week: dayOfWeek,
            start_time: timeString,
            original_date_text: show.date,
            original_time_text: show.time,
            scraped_at: venueInfo.scrapedAt
          }
          
          newEvents.push(eventRecord)
        } catch (parseError) {
          console.error(`Error parsing event data for ${venueInfo.venueTitle}:`, parseError)
        }
      }
      
      // Bulk insert new events
      if (newEvents.length > 0) {
        const { error: insertError } = await supabase
          .from('events')
          .insert(newEvents)
          
        if (insertError) {
          console.error(`Error inserting new events for ${venueInfo.venueTitle}:`, insertError)
        } else {
          console.log(`Inserted ${newEvents.length} new events for venue: ${venueInfo.venueTitle}`)
        }
      } else {
        console.log(`No valid events to insert for venue: ${venueInfo.venueTitle}`)
      }

    } catch (error) {
      console.error(`Error importing venue ${venueInfo.venueTitle}:`, error)
    }
  }

  async importFromFile(filePath: string): Promise<void> {
    console.log('Starting venue import...')
    
    // Check daily API limit
    const canProceed = await this.checkDailyLimit()
    if (!canProceed) {
      console.error('Cannot proceed: Daily API limit reached')
      return
    }

    try {
      const fileContent = await fs.readFile(filePath, 'utf-8')
      const venueData: VenueData[] = JSON.parse(fileContent)

      console.log(`Found ${venueData.length} venues to import`)

      let processed = 0
      let successful = 0
      let failed = 0

      for (const venue of venueData) {
        processed++
        
        try {
          await this.importVenue(venue)
          successful++
          
          // Check if we've hit the daily limit
          if (this.apiCallsToday >= RATE_LIMITS.GOOGLE_PLACES.MAX_DAILY_REQUESTS) {
            console.warn(`Stopping import: Daily API limit reached after ${processed} venues`)
            break
          }
          
          // Progress update
          if (processed % 10 === 0) {
            console.log(`Progress: ${processed}/${venueData.length} venues processed`)
          }
        } catch (error) {
          failed++
          console.error(`Failed to import venue ${venue.venueInfo.venueTitle}:`, error)
        }
      }

      console.log('\nImport completed!')
      console.log(`Processed: ${processed}/${venueData.length}`)
      console.log(`Successful: ${successful}`)
      console.log(`Failed: ${failed}`)
      console.log(`API calls used: ${this.apiCallsToday}/${RATE_LIMITS.GOOGLE_PLACES.MAX_DAILY_REQUESTS}`)

    } catch (error) {
      console.error('Error reading or parsing venue file:', error)
    }
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const filePath = process.argv[2]
  
  if (!filePath) {
    console.error('Usage: npm run import-venues <path-to-venues-json>')
    process.exit(1)
  }

  const importer = new VenueImporter()
  importer.importFromFile(filePath)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Import failed:', error)
      process.exit(1)
    })
}