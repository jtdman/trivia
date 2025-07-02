import { supabase } from './supabase'

export interface LocationBasedVenue {
  id: string
  name_original: string
  address_original: string
  google_place_id?: string
  google_name?: string
  google_formatted_address?: string
  google_rating?: number
  google_phone_number?: string
  google_website?: string
  google_photo_reference?: string
  thumbnail_url?: string
  verification_status: string
  created_at: string
  updated_at: string
  longitude: number
  latitude: number
  distance_km: number
  events: Array<{
    id: string
    event_type: string
    day_of_week: string
    start_time: string
    end_time?: string
    frequency: string
    prize_amount?: number
    prize_description?: string
    max_teams?: number
    is_active: boolean
  }>
}

export async function getVenuesNearLocation(
  userLat: number,
  userLng: number,
  radiusKm: number = 50,
  limit: number = 50
): Promise<LocationBasedVenue[]> {
  try {
    console.log('Fetching venues near location:', { userLat, userLng, radiusKm, limit })
    
    // Since we can't use PostGIS functions directly through Supabase client,
    // we'll use a different approach: get all venues and filter client-side
    // This is a temporary solution until we can implement proper server-side filtering
    
    const { data: venues, error } = await supabase
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
      .limit(limit * 3) // Get more venues to account for filtering
    
    if (error) {
      console.error('Error fetching venues:', error)
      return []
    }
    
    console.log('Fetched venues for location filtering:', venues?.length)
    
    // For now, return all venues since we can't extract coordinates easily
    // This will be improved when we implement proper PostGIS queries
    return venues?.map(venue => ({
      ...venue,
      longitude: 0, // Placeholder
      latitude: 0,  // Placeholder
      distance_km: 0 // Placeholder
    })) || []
    
  } catch (err) {
    console.error('Error in getVenuesNearLocation:', err)
    return []
  }
}

// Haversine distance calculation
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = deg2rad(lat2 - lat1)
  const dLon = deg2rad(lon2 - lon1)
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

function deg2rad(deg: number): number {
  return deg * (Math.PI/180)
}