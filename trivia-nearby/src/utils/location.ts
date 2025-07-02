// Parse PostGIS POINT format: "POINT(lng lat)"
export function parsePostGISPoint(pointString: string | null | undefined): { latitude: number; longitude: number } | null {
  if (!pointString || typeof pointString !== 'string') return null
  
  const match = pointString.match(/POINT\(([^)]+)\)/)
  if (!match) return null
  
  const [lng, lat] = match[1].split(' ').map(Number)
  
  if (isNaN(lat) || isNaN(lng)) return null
  
  return { latitude: lat, longitude: lng }
}

// Format distance for display (input is already in miles)
export function formatDistance(miles: number): string {
  if (miles < 0.1) {
    return '< 0.1 mi'
  } else if (miles < 1) {
    return `${(miles).toFixed(1)} mi`
  } else {
    return `${Math.round(miles * 10) / 10} mi`
  }
}

// Format day of week for display
export function formatDayOfWeek(day: string): string {
  const days: Record<string, string> = {
    'Sunday': 'Sundays',
    'Monday': 'Mondays', 
    'Tuesday': 'Tuesdays',
    'Wednesday': 'Wednesdays',
    'Thursday': 'Thursdays',
    'Friday': 'Fridays',
    'Saturday': 'Saturdays'
  }
  
  return days[day] || day
}

// Format time for display (convert 24hr to 12hr)
export function formatTime(time24: string): string {
  if (!time24) return ''
  
  const [hours, minutes] = time24.split(':').map(Number)
  
  if (isNaN(hours) || isNaN(minutes)) return time24
  
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
  
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
}

// Format prize amount
export function formatPrize(amount?: number, description?: string): string {
  if (description) return description
  if (amount) return `$${amount}`
  return 'Prize TBD'
}

// Reverse geocoding - convert coordinates to city name
export function getLocationName(latitude: number, longitude: number): string {
  try {
    // Franklin, TN area (35.9, -86.87)
    if (latitude > 35.85 && latitude < 36.0 && longitude > -87.0 && longitude < -86.7) {
      return 'Franklin, TN'
    }
    
    // Nashville area
    if (latitude > 36.0 && latitude < 36.3 && longitude > -87.0 && longitude < -86.5) {
      return 'Nashville, TN'
    }
    
    // Murfreesboro area
    if (latitude > 35.8 && latitude < 36.0 && longitude > -86.5 && longitude < -86.3) {
      return 'Murfreesboro, TN'
    }
    
    // Hendersonville area
    if (latitude > 36.25 && latitude < 36.35 && longitude > -86.7 && longitude < -86.5) {
      return 'Hendersonville, TN'
    }
    
    // Default for other Tennessee locations
    if (latitude > 34.9 && latitude < 36.7 && longitude > -90.3 && longitude < -81.6) {
      return 'Tennessee'
    }
    
    // Fallback to coordinates if outside Tennessee
    return `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`
    
  } catch (error) {
    console.error('Error getting location name:', error)
    return `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`
  }
}