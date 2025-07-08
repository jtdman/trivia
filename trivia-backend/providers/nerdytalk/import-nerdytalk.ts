import { supabase, GOOGLE_PLACES_API_KEY, RATE_LIMITS } from '../../supabase/config/supabase.js'
import fs from 'fs/promises'

interface NerdyTalkVenue {
  venue_name: string
  address: string
  events: Array<{
    day_of_week: string
    start_time: string
    event_type: string
    host: string
    prize_info: string
  }>
  provider: string
  scraped_at: string
}

interface NerdyTalkData {
  provider: string
  scraped_at: string
  total_venues: number
  venues: NerdyTalkVenue[]
  google_places_format: Array<{
    name_original: string
    address_original: string
    provider: string
    events: any[]
  }>
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
    }
    rating?: number
    user_ratings_total?: number
    price_level?: number
    business_status?: string
    types?: string[]
    photos?: Array<{
      photo_reference: string
    }>
  }>
  status: string
}

class NerdyTalkImporter {
  private apiCallsToday = 0
  private nerdyTalkProviderId: string | null = null

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

  async getNerdyTalkProviderId(): Promise<string> {
    if (this.nerdyTalkProviderId) return this.nerdyTalkProviderId

    // First try to find existing provider
    const { data: existingProvider } = await supabase
      .from('trivia_providers')
      .select('id')
      .eq('name', 'NerdyTalk Trivia')
      .single()

    if (existingProvider) {
      this.nerdyTalkProviderId = existingProvider.id
      return existingProvider.id
    }

    // Create provider if it doesn't exist
    const { data: newProvider, error } = await supabase
      .from('trivia_providers')
      .insert({
        name: 'NerdyTalk Trivia',
        website: 'http://nerdytalktrivia.com'
      })
      .select('id')
      .single()

    if (error) {
      throw new Error(`Failed to create NerdyTalk provider: ${error.message}`)
    }

    this.nerdyTalkProviderId = newProvider.id
    return newProvider.id
  }

  async searchGooglePlaces(venueName: string, address: string): Promise<GooglePlacesResponse | null> {
    if (!GOOGLE_PLACES_API_KEY) {
      console.warn('Google Places API key not configured')
      return null
    }

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
      'photos'
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
      
      await supabase.rpc('log_api_usage', {
        p_service_name: 'google_places',
        p_endpoint: 'findplacefromtext',
        p_error_message: error instanceof Error ? error.message : 'Unknown error'
      })

      return null
    }
  }

  parseTime(timeStr: string): string {
    // Handle various time formats from NerdyTalk data
    const cleanTime = timeStr.replace(/[^\d:AMP\s]/g, '').trim()
    
    // Try to match HH:MM AM/PM format
    let timeMatch = cleanTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i)
    
    // Try to match H:MM AM/PM format
    if (!timeMatch) {
      timeMatch = cleanTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i)
    }
    
    // Try to match HMM PM format (like "630 PM")
    if (!timeMatch) {
      timeMatch = cleanTime.match(/(\d{1,2})(\d{2})\s*(AM|PM)/i)
    }
    
    // Try to match H PM format (like "7 PM")
    if (!timeMatch) {
      timeMatch = cleanTime.match(/(\d{1,2})\s*(AM|PM)/i)
      if (timeMatch) {
        timeMatch = [timeMatch[0], timeMatch[1], '00', timeMatch[2]]
      }
    }

    if (!timeMatch) {
      console.warn(`Unable to parse time: ${timeStr}, using default 19:00:00`)
      return '19:00:00'
    }

    let hours = parseInt(timeMatch[1])
    const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0
    const period = timeMatch[3] ? timeMatch[3].toUpperCase() : 'PM'

    if (period === 'PM' && hours !== 12) hours += 12
    if (period === 'AM' && hours === 12) hours = 0

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`
  }

  async importVenue(venue: NerdyTalkVenue): Promise<void> {
    try {
      // Check if venue already exists
      const { data: existingVenue } = await supabase
        .from('venues')
        .select('id, google_place_id, last_places_api_call, verification_status')
        .eq('name_original', venue.venue_name)
        .eq('address_original', venue.address)
        .single()

      let venueId: string
      let placesData: GooglePlacesResponse | null = null
      let shouldUpdateVenue = false

      if (existingVenue) {
        venueId = existingVenue.id
        console.log(`Venue already exists: ${venue.venue_name}`)
        
        const oneYearAgo = new Date()
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
        
        const lastApiCall = existingVenue.last_places_api_call ? new Date(existingVenue.last_places_api_call) : null
        const isDataStale = !lastApiCall || lastApiCall < oneYearAgo
        const missingPlacesData = !existingVenue.google_place_id
        
        if (isDataStale || missingPlacesData) {
          console.log(`Venue data is ${isDataStale ? 'stale' : 'missing Google Places data'}, updating...`)
          placesData = await this.searchGooglePlaces(venue.venue_name, venue.address)
          shouldUpdateVenue = true
          
          await new Promise(resolve => setTimeout(resolve, RATE_LIMITS.GOOGLE_PLACES.DELAY_BETWEEN_REQUESTS))
        }
      } else {
        // Search Google Places for new venue
        placesData = await this.searchGooglePlaces(venue.venue_name, venue.address)
        
        await new Promise(resolve => setTimeout(resolve, RATE_LIMITS.GOOGLE_PLACES.DELAY_BETWEEN_REQUESTS))

        // Create venue record
        const venueRecord: any = {
          name_original: venue.venue_name,
          address_original: venue.address,
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
        }

        const { data: newVenue, error: venueError } = await supabase
          .from('venues')
          .insert(venueRecord)
          .select('id')
          .single()

        if (venueError) throw venueError
        venueId = newVenue.id
        console.log(`Created venue: ${venue.venue_name}`)
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
          last_places_api_call: new Date().toISOString(),
          verification_status: 'needs_review'
        }
        
        await supabase
          .from('venues')
          .update(updateRecord)
          .eq('id', venueId)
          
        console.log(`Updated venue with fresh Google Places data: ${venue.venue_name}`)
      }

      // Replace events for this venue
      const providerId = await this.getNerdyTalkProviderId()
      
      // Delete existing events for this venue from this provider
      const { error: deleteError } = await supabase
        .from('events')
        .delete()
        .eq('venue_id', venueId)
        .eq('provider_id', providerId)
        
      if (deleteError) {
        console.error(`Error deleting existing events for ${venue.venue_name}:`, deleteError)
      }
      
      // Insert new events
      const newEvents = []
      for (const event of venue.events) {
        try {
          const timeString = this.parseTime(event.start_time)

          const eventRecord = {
            venue_id: venueId,
            provider_id: providerId,
            event_type: event.event_type,
            day_of_week: event.day_of_week,
            start_time: timeString,
            prize_description: event.prize_info,
            original_time_text: event.start_time,
            scraped_at: venue.scraped_at
          }
          
          newEvents.push(eventRecord)
        } catch (parseError) {
          console.error(`Error parsing event data for ${venue.venue_name}:`, parseError)
        }
      }
      
      if (newEvents.length > 0) {
        const { error: insertError } = await supabase
          .from('events')
          .insert(newEvents)
          
        if (insertError) {
          console.error(`Error inserting new events for ${venue.venue_name}:`, insertError)
        } else {
          console.log(`Inserted ${newEvents.length} new events for venue: ${venue.venue_name}`)
        }
      }

    } catch (error) {
      console.error(`Error importing venue ${venue.venue_name}:`, error)
    }
  }

  async importFromFile(filePath: string): Promise<void> {
    console.log('Starting NerdyTalk venue import...')
    
    const canProceed = await this.checkDailyLimit()
    if (!canProceed) {
      console.error('Cannot proceed: Daily API limit reached')
      return
    }

    try {
      const fileContent = await fs.readFile(filePath, 'utf-8')
      const data: NerdyTalkData = JSON.parse(fileContent)

      console.log(`Found ${data.total_venues} NerdyTalk venues to import`)

      let processed = 0
      let successful = 0
      let failed = 0

      for (const venue of data.venues) {
        processed++
        
        try {
          await this.importVenue(venue)
          successful++
          
          if (this.apiCallsToday >= RATE_LIMITS.GOOGLE_PLACES.MAX_DAILY_REQUESTS) {
            console.warn(`Stopping import: Daily API limit reached after ${processed} venues`)
            break
          }
          
          if (processed % 5 === 0) {
            console.log(`Progress: ${processed}/${data.total_venues} venues processed`)
            console.log(`API calls used: ${this.apiCallsToday}/${RATE_LIMITS.GOOGLE_PLACES.MAX_DAILY_REQUESTS}`)
          }
        } catch (error) {
          failed++
          console.error(`Failed to import venue ${venue.venue_name}:`, error)
        }
      }

      console.log('\nNerdyTalk import completed!')
      console.log(`Processed: ${processed}/${data.total_venues}`)
      console.log(`Successful: ${successful}`)
      console.log(`Failed: ${failed}`)
      console.log(`API calls used: ${this.apiCallsToday}/${RATE_LIMITS.GOOGLE_PLACES.MAX_DAILY_REQUESTS}`)

    } catch (error) {
      console.error('Error reading or parsing NerdyTalk venue file:', error)
    }
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const filePath = process.argv[2] || '/home/jason/code/trivia/trivia-backend/providers/nerdytalk/nerdytalk-comprehensive-cleaned.json'
  
  const importer = new NerdyTalkImporter()
  importer.importFromFile(filePath)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('NerdyTalk import failed:', error)
      process.exit(1)
    })
}