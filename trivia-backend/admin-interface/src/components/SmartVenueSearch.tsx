import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { MapPin, Search, Plus } from 'lucide-react'

interface Venue {
  id: string
  name_original: string
  google_name: string | null
  google_formatted_address: string | null
  google_phone_number: string | null
  google_rating: number | null
}

interface SmartVenueSearchProps {
  onVenueSelect: (venue: Venue) => void
  onAddNew: (searchTerm: string) => void
}

export function SmartVenueSearch({ onVenueSelect, onAddNew }: SmartVenueSearchProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [venues, setVenues] = useState<Venue[]>([])
  const [loading, setLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)

  useEffect(() => {
    if (searchTerm.length >= 2) {
      searchVenues()
    } else {
      setVenues([])
      setShowResults(false)
    }
  }, [searchTerm])

  const searchVenues = async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('venues')
        .select('id, name_original, google_name, google_formatted_address, google_phone_number, google_rating')
        .or(`name_original.ilike.%${searchTerm}%,google_name.ilike.%${searchTerm}%`)
        .eq('status', 'approved')
        .limit(10)

      setVenues(data || [])
      setShowResults(true)
    } catch (error) {
      console.error('Error searching venues:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleVenueSelect = (venue: Venue) => {
    onVenueSelect(venue)
    setSearchTerm(venue.google_name || venue.name_original)
    setShowResults(false)
  }

  const handleAddNew = () => {
    onAddNew(searchTerm)
    setShowResults(false)
  }

  return (
    <div className="relative">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
          placeholder="Search for venue..."
        />
        {loading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500"></div>
          </div>
        )}
      </div>

      {/* Search Results */}
      {showResults && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-300 max-h-60 overflow-auto">
          {venues.length > 0 ? (
            <>
              {venues.map((venue) => (
                <button
                  key={venue.id}
                  onClick={() => handleVenueSelect(venue)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-start space-x-3 border-b border-gray-100 last:border-b-0"
                >
                  <MapPin className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {venue.google_name || venue.name_original}
                    </div>
                    {venue.google_formatted_address && (
                      <div className="text-sm text-gray-500 truncate">
                        {venue.google_formatted_address}
                      </div>
                    )}
                    {venue.google_rating && (
                      <div className="text-xs text-gray-400">
                        ⭐ {venue.google_rating} rating
                      </div>
                    )}
                  </div>
                </button>
              ))}
              <button
                onClick={handleAddNew}
                className="w-full text-left px-4 py-3 hover:bg-blue-50 flex items-center space-x-3 border-t border-gray-200 text-blue-600"
              >
                <Plus className="h-5 w-5" />
                <span className="font-medium">Add "{searchTerm}" as new venue</span>
              </button>
            </>
          ) : (
            <button
              onClick={handleAddNew}
              className="w-full text-left px-4 py-3 hover:bg-blue-50 flex items-center space-x-3 text-blue-600"
            >
              <Plus className="h-5 w-5" />
              <span className="font-medium">Add "{searchTerm}" as new venue</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}