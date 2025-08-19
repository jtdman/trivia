import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase, type VenueWithEvents } from '../lib/supabase'

interface UseVenuesOptions {
  latitude?: number
  longitude?: number
  radiusMiles?: number
  limit?: number
  dateFilter?: 'today' | 'tomorrow' | 'this-week'
}

interface UseVenuesResult {
  venues: VenueWithEvents[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useVenues(options?: UseVenuesOptions): UseVenuesResult {
  const [venues, setVenues] = useState<VenueWithEvents[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const lastFetchedCoords = useRef<{lat: number, lng: number} | null>(null)

  const { latitude, longitude, radiusMiles = 30, limit = 50, dateFilter = 'today' } = options || {}

  const fetchVenues = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('🔍 useVenues fetchVenues called with options:', { latitude, longitude, radiusMiles, limit, dateFilter })

      // Calculate date range based on filter
      const today = new Date()
      const todayStr = today.toISOString().split('T')[0]
      
      let startDate: string
      let endDate: string
      
      switch (dateFilter) {
        case 'today':
          startDate = todayStr
          endDate = todayStr
          console.log('📅 TODAY filter: Using date', todayStr)
          break
        case 'tomorrow':
          const tomorrow = new Date(today)
          tomorrow.setDate(today.getDate() + 1)
          const tomorrowStr = tomorrow.toISOString().split('T')[0]
          startDate = tomorrowStr
          endDate = tomorrowStr
          console.log('📅 TOMORROW filter: Using date', tomorrowStr)
          break
        case 'this-week':
        default:
          startDate = todayStr
          const weekOut = new Date(today)
          weekOut.setDate(today.getDate() + 6) // Today + 6 more days = 7 days total
          endDate = weekOut.toISOString().split('T')[0]
          console.log('📅 THIS-WEEK filter: Using date range', startDate, 'to', endDate)
          break
      }
      
      console.log('📊 Final date filter params:', { dateFilter, startDate, endDate })

      // If we have user location, use the working PostGIS distance function approach
      if (latitude && longitude) {
        console.log('Using PostGIS distance function...')
        
        try {
          const { data: distanceData, error: distanceError } = await supabase.rpc('get_venues_with_distance', {
            user_lat: latitude,
            user_lng: longitude,
            radius_miles: radiusMiles,
            venue_limit: limit * 2
          })
          
          if (!distanceError && distanceData) {
            console.log('PostGIS distance query successful:', {
              count: distanceData.length,
              firstVenue: distanceData[0] ? {
                name: distanceData[0].google_name || distanceData[0].name_original,
                distance: distanceData[0].distance_miles?.toFixed(1) + ' mi'
              } : null
            })
            
            // Get venue IDs from PostGIS results (sorted by distance)
            const venueIds = distanceData.map((venue: any) => venue.id)
            
            // Now get event_occurrences for these nearby venues
            const { data: eventOccurrences, error: occurrencesError } = await supabase
              .from('event_occurrences')
              .select(`
                id,
                occurrence_date,
                status,
                events!inner (
                  id,
                  venue_id,
                  provider_id,
                  event_type,
                  day_of_week,
                  start_time,
                  end_time,
                  frequency,
                  prize_amount,
                  prize_description,
                  max_teams,
                  is_active,
                  trivia_providers:provider_id (
                    id,
                    name
                  )
                )
              `)
              .eq('events.is_active', true)
              .in('status', ['scheduled', 'confirmed'])
              .gte('occurrence_date', startDate)
              .lte('occurrence_date', endDate)
              .in('events.venue_id', venueIds)
            
            if (occurrencesError) {
              console.error('Error fetching event occurrences:', occurrencesError)
              // Fall through to fallback query
            } else if (eventOccurrences) {
              console.log('Found', eventOccurrences.length, 'event occurrences for nearby venues')
              
              // Create venue lookup with distance info (maintain distance-based order)
              const venueMap = new Map()
              distanceData.forEach((venue: any, index: number) => {
                venueMap.set(venue.id, {
                  ...venue,
                  distanceOrder: index // Preserve PostGIS distance order
                })
              })
              
              // Group occurrences by venue but preserve distance order
              const venueOccurrenceMap = new Map()
              
              eventOccurrences.forEach((occurrence: any) => {
                const venueId = occurrence.events.venue_id
                const venue = venueMap.get(venueId)
                
                if (!venue) return
                
                const event = {
                  id: occurrence.events.id,
                  provider_id: occurrence.events.provider_id,
                  event_type: occurrence.events.event_type,
                  day_of_week: occurrence.events.day_of_week,
                  start_time: occurrence.events.start_time,
                  end_time: occurrence.events.end_time,
                  frequency: occurrence.events.frequency,
                  prize_amount: occurrence.events.prize_amount,
                  prize_description: occurrence.events.prize_description,
                  max_teams: occurrence.events.max_teams,
                  is_active: occurrence.events.is_active,
                  trivia_providers: occurrence.events.trivia_providers,
                  occurrence_id: occurrence.id,
                  occurrence_date: occurrence.occurrence_date,
                  status: occurrence.status
                }
                
                if (venueOccurrenceMap.has(venueId)) {
                  venueOccurrenceMap.get(venueId).events.push(event)
                } else {
                  venueOccurrenceMap.set(venueId, {
                    ...venue,
                    events: [event]
                  })
                }
              })
              
              // Convert to array and sort by distance order
              const venueItems = Array.from(venueOccurrenceMap.values())
                .sort((a: any, b: any) => a.distanceOrder - b.distanceOrder)
              
              console.log('Sorted event occurrences by distance:', {
                count: venueItems.length,
                firstVenue: venueItems[0] ? {
                  name: venueItems[0].google_name || venueItems[0].name_original,
                  distance: venueItems[0].distance_miles?.toFixed(1) + ' mi'
                } : null
              })
              
              setVenues(venueItems.slice(0, limit))
              return
            }
          } else {
            console.warn('PostGIS distance query failed:', distanceError)
            // Fall through to fallback query
          }
        } catch (err) {
          console.error('Error calling distance function:', err)
          // Fall through to fallback query
        }
      }
      
      // Fallback: basic event_occurrences query without distance sorting
      console.log('Using fallback event_occurrences query without distance sorting')
      const { data: eventOccurrences, error } = await supabase
        .from('event_occurrences')
        .select(`
          id,
          occurrence_date,
          status,
          events!inner (
            id,
            venue_id,
            provider_id,
            event_type,
            day_of_week,
            start_time,
            end_time,
            frequency,
            prize_amount,
            prize_description,
            max_teams,
            is_active,
            venues!inner (
              id,
              name_original,
              address_original,
              google_place_id,
              google_name,
              google_formatted_address,
              google_rating,
              google_phone_number,
              google_website,
              google_photo_reference,
              thumbnail_url,
              verification_status,
              created_at,
              updated_at,
              google_location
            ),
            trivia_providers:provider_id (
              id,
              name
            )
          )
        `)
        .eq('events.is_active', true)
        .in('status', ['scheduled', 'confirmed'])
        .gte('occurrence_date', startDate)
        .lte('occurrence_date', endDate)
        .not('events.venues.google_location', 'is', null)
        .order('occurrence_date')
        .limit(limit)
      
      if (error) throw error
      
      // Transform each occurrence into a venue format
      const venueItems = (eventOccurrences || []).map((occurrence: any) => {
        const venue = occurrence.events.venues
        return {
          ...venue,
          events: [{
            id: occurrence.events.id,
            provider_id: occurrence.events.provider_id,
            event_type: occurrence.events.event_type,
            day_of_week: occurrence.events.day_of_week,
            start_time: occurrence.events.start_time,
            end_time: occurrence.events.end_time,
            frequency: occurrence.events.frequency,
            prize_amount: occurrence.events.prize_amount,
            prize_description: occurrence.events.prize_description,
            max_teams: occurrence.events.max_teams,
            is_active: occurrence.events.is_active,
            trivia_providers: occurrence.events.trivia_providers,
            occurrence_id: occurrence.id,
            occurrence_date: occurrence.occurrence_date,
            status: occurrence.status
          }]
        }
      })
      
      setVenues(venueItems)
    } catch (err) {
      console.error('Error fetching venues:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch venues')
    } finally {
      setLoading(false)
    }
  }, [latitude, longitude, radiusMiles, limit, dateFilter])

  useEffect(() => {
    console.log('🔄 useVenues useEffect triggered with deps:', { latitude, longitude, radiusMiles, limit, dateFilter })
    
    // Only fetch if coordinates have changed significantly (more than ~100m)
    if (latitude !== undefined && longitude !== undefined) {
      const current = { lat: latitude, lng: longitude }
      const last = lastFetchedCoords.current
      
      if (!last || 
          Math.abs(current.lat - last.lat) > 0.001 || 
          Math.abs(current.lng - last.lng) > 0.001) {
        console.log('🌍 Coordinates changed significantly, fetching venues')
        lastFetchedCoords.current = current
        fetchVenues()
      } else {
        console.log('🌍 Coordinates unchanged, but dateFilter or other params changed, fetching venues')
        fetchVenues()
      }
    } else if (latitude === undefined && longitude === undefined) {
      console.log('🌍 No coordinates provided, fetching venues without location')
      fetchVenues()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latitude, longitude, radiusMiles, limit, dateFilter])

  return {
    venues,
    loading,
    error,
    refetch: fetchVenues
  }
}