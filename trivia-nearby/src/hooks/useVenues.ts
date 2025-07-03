import { useState, useEffect } from 'react'
import { supabase, type VenueWithEvents } from '../lib/supabase'

interface UseVenuesOptions {
  latitude?: number
  longitude?: number
  radiusMiles?: number
  limit?: number
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

  const { latitude, longitude, radiusMiles = 30, limit = 50 } = options || {}

  const fetchVenues = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('Fetching venues with options:', { latitude, longitude, radiusMiles, limit })

      // For now, let's use the basic query and calculate distances on the client
      // We'll improve this with PostGIS later
      console.log('Using basic query with client-side distance calculation')

      const { data, error: queryError } = await supabase
        .from('venues')
        .select(`
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
          events!inner (
            id,
            event_type,
            day_of_week,
            start_time,
            end_time,
            frequency,
            prize_amount,
            prize_description,
            max_teams,
            is_active
          )
        `)
        .eq('events.is_active', true)
        .not('google_location', 'is', null)
        .limit(limit)

      if (queryError) throw queryError

      console.log('Fetched venues:', { 
        count: data?.length, 
        firstVenue: data?.[0]?.google_formatted_address || data?.[0]?.address_original 
      })

      // If we have user location, use the PostGIS distance function
      if (latitude && longitude) {
        console.log('Using PostGIS distance function...')
        
        try {
          
          // Get today's day of the week for filtering
          const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
          console.log('Filtering for today:', today)
          
          const { data: distanceData, error: distanceError } = await supabase.rpc('get_venues_with_distance', {
            user_lat: latitude,
            user_lng: longitude,
            radius_miles: radiusMiles,
            venue_limit: limit * 2 // Get more venues since we'll filter for today
          })
          
          if (!distanceError && distanceData) {
            console.log('PostGIS distance query successful:', {
              count: distanceData.length,
              firstVenue: distanceData[0] ? {
                name: distanceData[0].google_name || distanceData[0].name_original,
                distance: distanceData[0].distance_miles?.toFixed(1) + ' mi'
              } : null
            })
            
            // Filter venues to only show those with events today
            const venuesWithTodayEvents = distanceData.filter((venue: any) => {
              const events = Array.isArray(venue.events) ? venue.events : []
              return events.some((event: any) => 
                event.is_active && event.day_of_week?.toLowerCase() === today
              )
            })
            
            console.log('Venues with events today:', {
              total: distanceData.length,
              withTodayEvents: venuesWithTodayEvents.length,
              today: today
            })
            
            // Transform the data to match our interface
            const venuesWithDistance = venuesWithTodayEvents.map((venue: any) => ({
              ...venue,
              distance_miles: venue.distance_miles,
              events: Array.isArray(venue.events) ? venue.events.filter((event: any) => 
                event.is_active && event.day_of_week?.toLowerCase() === today
              ) : []
            }))
            
            setVenues(venuesWithDistance.slice(0, limit)) // Limit final results
            return
          } else {
            console.warn('PostGIS distance query failed:', distanceError)
            // Fall through to basic query
          }
        } catch (err) {
          console.error('Error calling distance function:', err)
          // Fall through to basic query
        }
      }
      
      // Fallback to basic query without distance sorting
      setVenues(data || [])
    } catch (err) {
      console.error('Error fetching venues:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch venues')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVenues()
  }, [latitude, longitude, radiusMiles, limit])

  return {
    venues,
    loading,
    error,
    refetch: fetchVenues
  }
}