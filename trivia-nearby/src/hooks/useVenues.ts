import { useState, useEffect, useRef, useCallback } from 'react'
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
  const lastFetchedCoords = useRef<{lat: number, lng: number} | null>(null)

  const { latitude, longitude, radiusMiles = 30, limit = 50 } = options || {}

  const fetchVenues = useCallback(async () => {
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
            
            // PostGIS function doesn't return provider_id, so we need to merge with basic query
            console.log('PostGIS data missing provider_id, fetching complete event data...')
            
            // Get venue IDs from PostGIS results
            const venueIds = distanceData.map((venue: any) => venue.id)
            
            // Fetch complete event data including provider_id for these venues
            const { data: completeData, error: completeError } = await supabase
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
              .in('id', venueIds)
            
            if (completeError) {
              console.error('Error fetching complete event data:', completeError)
              // Fall through to basic query
            } else if (completeData) {
              // Merge distance data with complete event data
              const mergedVenues = completeData.map((venue: any) => {
                const distanceVenue = distanceData.find((dv: any) => dv.id === venue.id)
                return {
                  ...venue,
                  distance_miles: distanceVenue?.distance_miles,
                  longitude: distanceVenue?.longitude,
                  latitude: distanceVenue?.latitude
                }
              })
              
              // Sort by distance
              const sortedVenues = mergedVenues.sort((a: any, b: any) => {
                if (a.distance_miles && b.distance_miles) {
                  return a.distance_miles - b.distance_miles
                }
                return 0
              })
              
              console.log('Merged venues with complete data:', {
                count: sortedVenues.length,
                firstVenue: sortedVenues[0] ? {
                  name: sortedVenues[0].google_name || sortedVenues[0].name_original,
                  distance: sortedVenues[0].distance_miles?.toFixed(1) + ' mi',
                  events: sortedVenues[0].events?.length || 0
                } : null
              })
              
              setVenues(sortedVenues.slice(0, limit))
              return
            }
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
  }, [latitude, longitude, radiusMiles, limit])

  useEffect(() => {
    // Only fetch if coordinates have changed significantly (more than ~100m)
    if (latitude !== undefined && longitude !== undefined) {
      const current = { lat: latitude, lng: longitude }
      const last = lastFetchedCoords.current
      
      if (!last || 
          Math.abs(current.lat - last.lat) > 0.001 || 
          Math.abs(current.lng - last.lng) > 0.001) {
        lastFetchedCoords.current = current
        fetchVenues()
      }
    } else if (latitude === undefined && longitude === undefined) {
      // Fetch without coordinates
      fetchVenues()
    }
  }, [latitude, longitude, radiusMiles, limit, fetchVenues])

  return {
    venues,
    loading,
    error,
    refetch: fetchVenues
  }
}