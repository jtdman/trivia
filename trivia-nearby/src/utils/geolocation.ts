import { supabase } from '../lib/supabase'

// Haversine formula for calculating distance between two points
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = deg2rad(lat2 - lat1)
  const dLon = deg2rad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c
  return distance
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180)
}

// Extract coordinates from PostGIS data
export async function getVenueCoordinates(venueIds: string[]) {
  try {
    const { data, error } = await supabase
      .from('venues')
      .select('id, ST_X(google_location) as longitude, ST_Y(google_location) as latitude')
      .in('id', venueIds)
      .not('google_location', 'is', null)

    if (error) {
      console.error('Error fetching coordinates:', error)
      return null
    }

    return data
  } catch (err) {
    console.error('Error in getVenueCoordinates:', err)
    return null
  }
}

// Format distance for display
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m`
  } else if (distanceKm < 10) {
    return `${distanceKm.toFixed(1)}km`
  } else {
    return `${Math.round(distanceKm)}km`
  }
}