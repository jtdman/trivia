import React, { useState, useEffect, useRef } from 'react'
import { MapPin } from 'lucide-react'

interface LocationSuggestion {
  place_id: string
  display_name: string
  lat: string
  lon: string
}

interface LocationAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onSelect: (location: string, coords: {lat: number, lng: number}) => void
  placeholder?: string
  className?: string
}

const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  value,
  onChange,
  onSelect,
  placeholder = "City or ZIP code",
  className = ""
}) => {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Debounced search for location suggestions
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    if (value.length < 2) {
      setSuggestions([])
      setIsOpen(false)
      return
    }

    timeoutRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}&limit=5&countrycodes=us&addressdetails=1`
        // Use CORS proxy for Nominatim
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(nominatimUrl)}`
        const response = await fetch(proxyUrl)
        const proxyData = await response.json()
        
        // Check if proxy returned valid data
        if (!proxyData.contents || proxyData.contents === 'undefined') {
          throw new Error('Proxy returned no data')
        }
        
        const data = JSON.parse(proxyData.contents)
        
        // Filter and format suggestions
        const formatted = data.map((item: any) => ({
          place_id: item.place_id,
          display_name: formatDisplayName(item),
          lat: item.lat,
          lon: item.lon
        }))
        
        setSuggestions(formatted)
        setIsOpen(formatted.length > 0)
      } catch (error) {
        console.error('Autocomplete search failed:', error)
        setSuggestions([])
        setIsOpen(false)
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [value])

  // Format display name to show city, ST (2-letter state abbreviation)
  const formatDisplayName = (item: any) => {
    const address = item.address || {}
    const city = address.city || address.town || address.village || address.hamlet
    const state = address.state
    
    if (city && state) {
      const stateAbbr = getStateAbbreviation(state)
      return `${city}, ${stateAbbr}`
    }
    
    // Fallback to first part of display_name
    return item.display_name.split(',').slice(0, 2).join(',')
  }

  // Convert full state names to abbreviations
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
  }

  const handleSuggestionClick = (suggestion: LocationSuggestion) => {
    onChange(suggestion.display_name)
    onSelect(suggestion.display_name, {
      lat: parseFloat(suggestion.lat),
      lng: parseFloat(suggestion.lon)
    })
    setIsOpen(false)
    setSuggestions([])
  }

  const handleInputBlur = () => {
    // Delay closing to allow suggestion clicks
    setTimeout(() => setIsOpen(false), 200)
  }

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className={`w-full px-4 py-3 pl-10 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 ${className}`}
        />
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        {loading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500"></div>
          </div>
        )}
      </div>

      {/* Suggestions dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.place_id}
              type="button"
              onClick={() => handleSuggestionClick(suggestion)}
              className="w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0"
            >
              <MapPin className="w-4 h-4 text-purple-500 flex-shrink-0" />
              <span className="text-black dark:text-white">{suggestion.display_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default LocationAutocomplete