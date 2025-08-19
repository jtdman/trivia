import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, MapPin, Globe, Phone, Star, Plus, ArrowLeft, Loader2, Database } from 'lucide-react'
import { supabase, type Venue } from '../lib/supabase'
import { useAuth } from '../context/auth_context'

interface GooglePlaceResult {
  place_id: string
  name: string
  formatted_address: string
  geometry: {
    location: {
      lat: number
      lng: number
    }
  }
  rating?: number
  user_ratings_total?: number
  formatted_phone_number?: string
  website?: string
  photos?: Array<{
    photo_reference: string
    width: number
    height: number
  }>
  types: string[]
}

interface HybridSearchResult {
  id: string
  type: 'database' | 'google'
  name: string
  address: string
  venue?: Venue
  place?: GooglePlaceResult
  rating?: number
  user_ratings_total?: number
  phone?: string
  website?: string
  verified?: boolean
}

const VenueSearchPage: React.FC = () => {
  const navigate = useNavigate()
  const { user, provider, isProviderAdmin } = useAuth()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [databaseResults, setDatabaseResults] = useState<Venue[]>([])
  const [googleResults, setGoogleResults] = useState<GooglePlaceResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [sessionToken] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)

  // Search existing venues in database
  const searchDatabase = async (query: string): Promise<Venue[]> => {
    if (!query.trim()) return []

    try {
      const { data, error } = await supabase
        .from('venues')
        .select('*')
        .or(`name_original.ilike.%${query}%,google_name.ilike.%${query}%,address_original.ilike.%${query}%,google_formatted_address.ilike.%${query}%`)
        .limit(10)

      if (error) throw error
      return data || []
    } catch (err: any) {
      console.error('Database search error:', err)
      throw err
    }
  }

  // Search Google Places API
  const searchGooglePlaces = async (query: string): Promise<GooglePlaceResult[]> => {
    if (!query.trim()) return []

    try {
      // Use the Vite proxy to avoid CORS issues with session token for cost optimization
      const response = await fetch(`/api/places/textsearch/json?query=${encodeURIComponent(query)}&sessiontoken=${sessionToken}&key=${import.meta.env.VITE_GOOGLE_PLACES_API_KEY}`)
      
      if (!response.ok) {
        throw new Error(`Google Places API error: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        throw new Error(`Google Places API error: ${data.status}`)
      }

      return data.results || []
    } catch (err: any) {
      console.error('Google Places search error:', err)
      throw err
    }
  }

  // Hybrid search that combines database and Google results
  const performHybridSearch = async (query: string) => {
    if (!query.trim()) {
      setDatabaseResults([])
      setGoogleResults([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Perform both searches in parallel
      const [dbResults, googleResults] = await Promise.allSettled([
        searchDatabase(query),
        searchGooglePlaces(query)
      ])

      // Handle database results
      if (dbResults.status === 'fulfilled') {
        setDatabaseResults(dbResults.value)
      } else {
        console.error('Database search failed:', dbResults.reason)
        setDatabaseResults([])
      }

      // Handle Google results
      if (googleResults.status === 'fulfilled') {
        setGoogleResults(googleResults.value)
      } else {
        console.error('Google search failed:', googleResults.reason)
        setGoogleResults([])
      }

      // If both failed, show error
      if (dbResults.status === 'rejected' && googleResults.status === 'rejected') {
        setError('Search failed. Please try again.')
      }
    } catch (err: any) {
      console.error('Hybrid search error:', err)
      setError('Search failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Add venue from Google Places to database
  const addVenueFromGoogle = async (place: GooglePlaceResult) => {
    setLoading(true)
    try {
      // Fetch detailed place information using session token
      const detailsResponse = await fetch(`/api/places/details/json?place_id=${place.place_id}&sessiontoken=${sessionToken}&key=${import.meta.env.VITE_GOOGLE_PLACES_API_KEY}`)
      
      let detailedPlace = place
      if (detailsResponse.ok) {
        const detailsData = await detailsResponse.json()
        if (detailsData.status === 'OK' && detailsData.result) {
          detailedPlace = { ...place, ...detailsData.result }
        }
      }

      const venueData = {
        name_original: detailedPlace.name,
        address_original: detailedPlace.formatted_address,
        google_place_id: detailedPlace.place_id,
        google_name: detailedPlace.name,
        google_formatted_address: detailedPlace.formatted_address,
        google_phone_number: detailedPlace.formatted_phone_number || null,
        google_website: detailedPlace.website || null,
        google_rating: detailedPlace.rating || null,
        google_user_ratings_total: detailedPlace.user_ratings_total || null,
        google_photo_reference: detailedPlace.photos?.[0]?.photo_reference || null,
        google_location: detailedPlace.geometry?.location ? 
          `POINT(${detailedPlace.geometry.location.lng} ${detailedPlace.geometry.location.lat})` : null,
        verification_status: 'verified',
        is_imported: false,
        status: 'approved',
        created_by: user?.id
      }

      const { data, error } = await supabase
        .from('venues')
        .insert([venueData])
        .select()
        .single()

      if (error) throw error

      // Automatically process image if venue has google_photo_reference
      if (data && data.google_photo_reference) {
        try {
          console.log(`Automatically processing image for imported venue ${data.id}`)
          const imageResponse = await supabase.functions.invoke('process-venue-images', {
            body: { 
              venue_id: data.id,
              google_photo_reference: data.google_photo_reference
            }
          })

          if (imageResponse.error) {
            console.error('Auto image processing failed:', imageResponse.error)
            // Don't throw - venue creation should still succeed even if image processing fails
          } else if (imageResponse.data?.success) {
            console.log('Image processed automatically for imported venue')
          }
        } catch (err) {
          console.error('Auto image processing error:', err)
          // Don't throw - venue creation should still succeed even if image processing fails
        }
      }

      // Success - navigate to create event for this venue
      navigate(`/admin/events/new?venue_id=${data.id}`)
    } catch (err: any) {
      console.error('Add venue error:', err)
      setError('Failed to add venue to database')
    } finally {
      setLoading(false)
    }
  }

  // Debounced hybrid search as user types
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        performHybridSearch(searchQuery)
      } else {
        setDatabaseResults([])
        setGoogleResults([])
      }
    }, 400) // 400ms debounce as recommended
    
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Merge and deduplicate results for unified display
  const hybridResults: HybridSearchResult[] = useMemo(() => {
    const results: HybridSearchResult[] = []
    
    // Add database results first (prioritized)
    databaseResults.forEach((venue) => {
      results.push({
        id: venue.id,
        type: 'database',
        name: venue.google_name || venue.name_original,
        address: venue.google_formatted_address || venue.address_original,
        venue,
        rating: venue.google_rating || undefined,
        user_ratings_total: venue.google_user_ratings_total || undefined,
        phone: venue.google_phone_number || undefined,
        website: venue.google_website || undefined,
        verified: venue.verification_status === 'verified'
      })
    })
    
    // Add Google results that aren't already in database
    googleResults.forEach((place) => {
      // Check if this place is already in our database
      const existsInDb = databaseResults.some(venue => 
        venue.google_place_id === place.place_id
      )
      
      if (!existsInDb) {
        results.push({
          id: place.place_id,
          type: 'google',
          name: place.name,
          address: place.formatted_address,
          place,
          rating: place.rating,
          user_ratings_total: place.user_ratings_total,
          phone: place.formatted_phone_number,
          website: place.website
        })
      }
    })
    
    return results
  }, [databaseResults, googleResults])

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/admin')}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
        
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Find Venue</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Search for an existing venue or find a new one to add events
        </p>
      </div>

      {/* Search Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Venue Search</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Search across our database and Google Places simultaneously for the best results
          </p>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by venue name, address, or city..."
            className="w-full pl-10 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg"
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 animate-spin text-gray-400" />
          )}
        </div>

        {/* Help Text */}
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          Searches automatically as you type. Database results are prioritized, followed by new venues from Google Places.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Unified Results */}
      <div className="space-y-4">
        {hybridResults.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Search Results ({hybridResults.length})
            </h2>
            <div className="space-y-3">
              {hybridResults.map((result) => (
                <div
                  key={result.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700"
                >
                  <div className="space-y-3">
                    {/* Header with name and tag */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                          {result.name}
                        </h3>
                        {result.type === 'database' ? (
                          <div className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 rounded-full text-xs font-medium flex-shrink-0">
                            <Database className="w-3 h-3" />
                            Saved
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 rounded-full text-xs font-medium flex-shrink-0">
                            <Globe className="w-3 h-3" />
                            New
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Address - full width */}
                    <div className="text-gray-600 dark:text-gray-400 text-sm">
                      <MapPin className="w-4 h-4 inline mr-1 flex-shrink-0" />
                      <span className="break-words">{result.address}</span>
                    </div>
                    
                    {/* Rating, phone, website */}
                    <div className="space-y-1">
                      {result.rating && (
                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                          <Star className="w-4 h-4 inline mr-1 text-yellow-500" />
                          {result.rating} ({result.user_ratings_total} reviews)
                        </p>
                      )}
                      
                      {result.phone && (
                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                          <Phone className="w-4 h-4 inline mr-1" />
                          {result.phone}
                        </p>
                      )}
                      
                      {result.website && (
                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                          <Globe className="w-4 h-4 inline mr-1" />
                          <a href={result.website} target="_blank" rel="noopener noreferrer" className="text-purple-500 hover:underline">
                            Website
                          </a>
                        </p>
                      )}
                    </div>
                    
                    {/* Status badges and category tags */}
                    <div className="space-y-2">
                      {result.type === 'database' && result.venue && (
                        <div>
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                            result.verified
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                          }`}>
                            {result.venue.verification_status}
                          </span>
                        </div>
                      )}
                      
                      {result.type === 'google' && result.place && (
                        <div className="flex flex-wrap gap-1">
                          {result.place.types.slice(0, 3).map((type) => (
                            <span
                              key={type}
                              className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-xs flex-shrink-0"
                            >
                              {type.replace(/_/g, ' ')}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Action button - full width on mobile */}
                    <div className="pt-2">
                      {result.type === 'database' ? (
                        <button
                          onClick={() => navigate(`/admin/events/new?venue_id=${result.venue!.id}`)}
                          className="w-full sm:w-auto px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                        >
                          <Plus className="w-4 h-4" />
                          Add Event
                        </button>
                      ) : (
                        <button
                          onClick={() => addVenueFromGoogle(result.place!)}
                          disabled={loading}
                          className="w-full sm:w-auto px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                        >
                          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                          Add & Create Event
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Results */}
        {!loading && searchQuery && hybridResults.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">
              No venues found. Try a different search term or check your spelling.
            </p>
          </div>
        )}
      </div>

      {/* Search Tips */}
      {!searchQuery && (
        <div className="mt-8 bg-purple-50 dark:bg-purple-900/20 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-300 mb-3">
            Search Tips
          </h3>
          <ul className="space-y-2 text-purple-800 dark:text-purple-400 text-sm">
            <li>• Try searching by venue name (e.g., "Murphy's Pub", "The Ryman")</li>
            <li>• Search by address or city (e.g., "Nashville", "Broadway")</li>
            <li>• Results from our database appear first with a "Saved" tag</li>
            <li>• New venues from Google Places show with a "New" tag</li>
            <li>• Session tokens optimize costs - multiple searches in this session are bundled</li>
          </ul>
        </div>
      )}
    </div>
  )
}

export default VenueSearchPage