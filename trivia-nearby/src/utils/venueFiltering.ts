import { VenueWithEvents } from '../lib/supabase'
import { calculateDistance } from './geolocation'

export interface VenueWithDistance extends VenueWithEvents {
  distance_km?: number
  longitude?: number
  latitude?: number
}

// Hard-coded venue coordinates for Tennessee venues (temporary solution)
// This is a fallback until we can implement proper PostGIS queries
const VENUE_COORDINATES: Record<string, { latitude: number; longitude: number }> = {
  '7f271894-d495-4169-9079-3588afab9f7b': { latitude: 36.2175936, longitude: -86.6953991 }, // Opry Backstage Grill
  '6b0e49f7-6ee2-48c7-82d9-47bdc215d2c3': { latitude: 36.2858272, longitude: -86.6085002 }, // TailGate Brewery Hendersonville
  '10154c79-fdcc-4b48-9ce3-7186323c2f46': { latitude: 36.1863685, longitude: -86.7470702 }, // TailGate Brewery East Nashville
  'c2d46b68-cece-445d-ac63-20addb9b8309': { latitude: 36.0340402, longitude: -86.6466959 }, // TailGate Brewery South Nashville
  '35adc8fd-d90e-4ffe-9ebb-71498bf72352': { latitude: 36.3032443, longitude: -86.646146 }, // Main Street Pub & Eatery
  '40a1e018-3c77-4b4b-bc06-5fdd8a6012a6': { latitude: 36.113943, longitude: -86.7664427 }, // Big Machine Distillery & Tavern
  '8fbd6946-307b-49ea-8a41-aa8b36e84b0b': { latitude: 36.1600155, longitude: -86.7772394 }, // Hilton Nashville Downtown
  'b9716ec9-f345-4d6a-a0ab-d8824bf23339': { latitude: 36.1642022, longitude: -86.7789669 }, // Stateside Kitchen
  'aa2dc0d5-d37d-45e9-b6b5-cd1388ad0c53': { latitude: 36.1646922, longitude: -86.779065 }, // Bobby Hotel Rooftop Lounge
  '8a566623-5848-4d6f-a5d2-6a7594b9f833': { latitude: 36.1503817, longitude: -86.7794728 }, // Marble Fox Brewing Company
}

export function filterVenuesByLocation(
  venues: VenueWithEvents[],
  userLatitude: number,
  userLongitude: number,
  radiusKm: number = 50
): VenueWithDistance[] {
  if (!userLatitude || !userLongitude) {
    return venues.map(venue => ({ ...venue }))
  }

  console.log('Filtering venues by location:', { userLatitude, userLongitude, radiusKm })

  const venuesWithDistance: VenueWithDistance[] = venues
    .map(venue => {
      const coords = VENUE_COORDINATES[venue.id]
      if (!coords) {
        // No coordinates available for this venue, exclude it
        return null
      }

      const distance_km = calculateDistance(
        userLatitude,
        userLongitude,
        coords.latitude,
        coords.longitude
      )

      return {
        ...venue,
        longitude: coords.longitude,
        latitude: coords.latitude,
        distance_km
      }
    })
    .filter((venue): venue is VenueWithDistance => venue !== null)
    .filter(venue => venue.distance_km! <= radiusKm)
    .sort((a, b) => a.distance_km! - b.distance_km!)

  console.log('Filtered venues:', {
    original: venues.length,
    withCoordinates: venuesWithDistance.length,
    first3: venuesWithDistance.slice(0, 3).map(v => ({
      name: v.google_name || v.name_original,
      distance: v.distance_km?.toFixed(1) + 'km'
    }))
  })

  return venuesWithDistance
}

export function isLocationInTennessee(latitude: number, longitude: number): boolean {
  // Rough bounding box for Tennessee
  const TN_BOUNDS = {
    north: 36.678,
    south: 34.982,
    east: -81.647,
    west: -90.310
  }

  return (
    latitude >= TN_BOUNDS.south &&
    latitude <= TN_BOUNDS.north &&
    longitude >= TN_BOUNDS.east &&
    longitude <= TN_BOUNDS.west
  )
}