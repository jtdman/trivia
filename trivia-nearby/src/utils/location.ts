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

// Helper function to convert state names to abbreviations
const getStateAbbreviation = (stateName: string): string => {
  const stateMap: Record<string, string> = {
    'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
    'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
    'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
    'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
    'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
    'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
    'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
    'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
    'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
    'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY',
    'District of Columbia': 'DC'
  }
  
  return stateMap[stateName] || stateName
}

// Format event title based on provider and event type
export function formatEventTitle(eventType: string, providerName?: string): string {
  if (!providerName) {
    return eventType
  }
  
  // Format as "Event Type by Provider Name"
  return `${eventType} by ${providerName}`
}

// Helper function to make CORS-enabled requests to Nominatim
const fetchWithCors = async (url: string) => {
  // Use allorigins as a CORS proxy
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
  const response = await fetch(proxyUrl)
  const data = await response.json()
  return {
    ok: response.ok,
    status: response.status,
    json: () => Promise.resolve(JSON.parse(data.contents))
  }
}

// Reverse geocoding - convert coordinates to city name
export async function getLocationName(latitude: number, longitude: number): Promise<string> {
  try {
    // Use Nominatim API for reverse geocoding with CORS proxy
    const response = await fetchWithCors(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1&accept-language=en`
    )
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (data.error) {
      throw new Error(data.error)
    }
    
    // Extract city and state from the response
    const address = data.address
    if (!address) {
      throw new Error('No address found')
    }
    
    // Try to get city name from various possible fields
    const city = address.city || 
                address.town || 
                address.village || 
                address.hamlet || 
                address.suburb ||
                address.neighbourhood
    
    // Get state abbreviation - use state_code if available, otherwise abbreviate the full state name
    let stateAbbr = address.state_code
    if (!stateAbbr && address.state) {
      stateAbbr = getStateAbbreviation(address.state)
    }
    
    if (city && stateAbbr) {
      return `${city}, ${stateAbbr.toUpperCase()}`
    } else if (city) {
      return city
    } else if (address.county) {
      return `${address.county}, ${stateAbbr?.toUpperCase() || 'USA'}`
    }
    
    // Fallback to a generic location name instead of coordinates
    return 'Your Location'
    
  } catch (error) {
    console.error('Error getting location name:', error)
    // Fallback to a generic location name instead of coordinates
    return 'Your Location'
  }
}