import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { SmartVenueSearch } from '../components/SmartVenueSearch'
import { MapPin, Star, Phone, Globe, Plus } from 'lucide-react'

interface Venue {
  id: string
  name_original: string
  google_name: string | null
  google_formatted_address: string | null
  google_phone_number: string | null
  google_website: string | null
  google_rating: number | null
  google_user_ratings_total: number | null
  verification_status: string | null
  status: string | null
  events_count?: number
}

export function Venues() {
  const { isAdmin, isProvider, providerId } = useAuth()
  const [venues, setVenues] = useState<Venue[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddVenue, setShowAddVenue] = useState(false)
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null)

  useEffect(() => {
    fetchVenues()
  }, [providerId])

  const fetchVenues = async () => {
    try {
      let query = supabase
        .from('venues')
        .select(`
          id,
          name_original,
          google_name,
          google_formatted_address,
          google_phone_number,
          google_website,
          google_rating,
          google_user_ratings_total,
          verification_status,
          status
        `)

      // If provider user, only show venues with their events
      if (isProvider && providerId) {
        query = query
          .select(`
            id,
            name_original,
            google_name,
            google_formatted_address,
            google_phone_number,
            google_website,
            google_rating,
            google_user_ratings_total,
            verification_status,
            status,
            events!inner(id)
          `)
          .eq('events.provider_id', providerId)
      }

      const { data } = await query.order('google_name')

      // Count events for each venue (for admin view)
      if (isAdmin) {
        const venuesWithCounts = await Promise.all(
          (data || []).map(async (venue) => {
            const { count } = await supabase
              .from('events')
              .select('*', { count: 'exact', head: true })
              .eq('venue_id', venue.id)
              .eq('is_active', true)

            return { ...venue, events_count: count || 0 }
          })
        )
        setVenues(venuesWithCounts)
      } else {
        setVenues(data || [])
      }
    } catch (error) {
      console.error('Error fetching venues:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleVenueSelect = (venue: Venue) => {
    setSelectedVenue(venue)
    setShowAddVenue(false)
  }

  const handleAddNewVenue = (searchTerm: string) => {
    // TODO: Implement Google Places API validation for new venue
    console.log('Adding new venue:', searchTerm)
    alert(`Adding new venue: ${searchTerm}\n\nThis would validate with Google Places API and add to pending approval.`)
  }

  const getStatusColor = (status: string | null, verificationStatus: string | null) => {
    if (status === 'pending') return 'bg-yellow-100 text-yellow-800'
    if (verificationStatus === 'failed') return 'bg-red-100 text-red-800'
    if (verificationStatus === 'verified') return 'bg-green-100 text-green-800'
    return 'bg-gray-100 text-gray-800'
  }

  const getStatusText = (status: string | null, verificationStatus: string | null) => {
    if (status === 'pending') return 'Pending Approval'
    if (verificationStatus === 'failed') return 'Verification Failed'
    if (verificationStatus === 'verified') return 'Verified'
    return verificationStatus || 'Unknown'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold text-gray-900">Venues</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage trivia venues and their information
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            onClick={() => setShowAddVenue(true)}
            className="inline-flex items-center rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Venue
          </button>
        </div>
      </div>

      {/* Add Venue Modal */}
      {showAddVenue && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add Venue</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search for existing venue or add new:
                </label>
                <SmartVenueSearch
                  onVenueSelect={handleVenueSelect}
                  onAddNew={handleAddNewVenue}
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowAddVenue(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Venues Grid */}
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {venues.map((venue) => (
          <div key={venue.id} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-medium text-gray-900 truncate">
                    {venue.google_name || venue.name_original}
                  </h3>
                  {venue.google_formatted_address && (
                    <div className="flex items-start mt-1">
                      <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <p className="ml-1 text-sm text-gray-500">
                        {venue.google_formatted_address}
                      </p>
                    </div>
                  )}
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(venue.status, venue.verification_status)}`}>
                  {getStatusText(venue.status, venue.verification_status)}
                </span>
              </div>

              <div className="mt-4 space-y-2">
                {venue.google_rating && (
                  <div className="flex items-center">
                    <Star className="h-4 w-4 text-yellow-400" />
                    <span className="ml-1 text-sm text-gray-600">
                      {venue.google_rating} ({venue.google_user_ratings_total} reviews)
                    </span>
                  </div>
                )}

                {venue.google_phone_number && (
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="ml-1 text-sm text-gray-600">
                      {venue.google_phone_number}
                    </span>
                  </div>
                )}

                {venue.google_website && (
                  <div className="flex items-center">
                    <Globe className="h-4 w-4 text-gray-400" />
                    <a
                      href={venue.google_website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-1 text-sm text-primary-600 hover:text-primary-500 truncate"
                    >
                      Website
                    </a>
                  </div>
                )}

                {isAdmin && typeof venue.events_count !== 'undefined' && (
                  <div className="text-sm text-gray-500">
                    {venue.events_count} active events
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {venues.length === 0 && (
        <div className="text-center py-12">
          <MapPin className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No venues</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by adding a venue.
          </p>
        </div>
      )}
    </div>
  )
}