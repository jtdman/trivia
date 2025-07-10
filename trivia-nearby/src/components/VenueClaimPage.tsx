import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { MapPin, Search, CheckCircle, Clock, AlertCircle, UserCheck, ArrowLeft } from 'lucide-react'
import { supabase, type Venue } from '../lib/supabase'
import { useAuth } from '../context/auth_context'

interface VenueWithEvents extends Venue {
  event_count: number
}

const VenueClaimPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { userProfile } = useAuth()
  const [venues, setVenues] = useState<VenueWithEvents[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')
  const [claimingVenue, setClaimingVenue] = useState<string | null>(null)
  const [, setClaimReason] = useState('')

  const searchVenues = async () => {
    if (!searchTerm.trim()) {
      setVenues([])
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Search for unclaimed venues
      const { data, error } = await supabase
        .from('venues')
        .select(`
          *,
          events(count)
        `)
        .or(`name_original.ilike.%${searchTerm}%,google_name.ilike.%${searchTerm}%,address_original.ilike.%${searchTerm}%,google_formatted_address.ilike.%${searchTerm}%`)
        .order('name_original')
        .limit(20)

      if (error) throw error

      // Process the data to include event counts and filter out already claimed venues
      const processedVenues = await Promise.all(
        (data || []).map(async (venue) => {
          // Check if venue is already claimed
          const { data: userVenueData } = await supabase
            .from('user_venues')
            .select('user_id')
            .eq('venue_id', venue.id)
            .single()

          return {
            ...venue,
            event_count: venue.events?.length || 0,
            is_claimed: !!userVenueData,
            claimed_by_me: userVenueData?.user_id === userProfile?.id
          }
        })
      )

      setVenues(processedVenues)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const claimVenue = async (venueId: string) => {
    try {
      setClaimingVenue(venueId)
      setError(null)

      // Create the claim
      const { error } = await supabase
        .from('user_venues')
        .insert([{
          user_id: userProfile?.id,
          venue_id: venueId,
          role: 'owner'
        }])

      if (error) throw error

      // Update the venue to mark it as claimed
      await supabase
        .from('venues')
        .update({ 
          verification_status: 'verified',
          updated_at: new Date().toISOString()
        })
        .eq('id', venueId)

      // Refresh the search results
      await searchVenues()
      setClaimReason('')
      
    } catch (err: any) {
      setError(err.message)
    } finally {
      setClaimingVenue(null)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    searchVenues()
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/admin/venues')}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Venues
        </button>
        
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Claim Your Venue
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Find and claim your venue to manage its trivia events and information
        </p>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by venue name or address..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300 text-white rounded-lg transition-colors"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-800 dark:text-red-200">{error}</span>
          </div>
        </div>
      )}

      {/* Search Results */}
      {venues.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Search Results ({venues.length})
          </h2>
          
          {venues.map((venue) => (
            <div key={venue.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {venue.google_name || venue.name_original}
                    </h3>
                    {getStatusIcon(venue.verification_status)}
                    <span className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                      {venue.verification_status}
                    </span>
                  </div>

                  {venue.google_name && venue.google_name !== venue.name_original && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                      Originally listed as: {venue.name_original}
                    </p>
                  )}

                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-2">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm">
                      {venue.google_formatted_address || venue.address_original}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <span>{venue.event_count} events</span>
                    {venue.google_phone_number && (
                      <span>📞 {venue.google_phone_number}</span>
                    )}
                    {venue.google_website && (
                      <a 
                        href={venue.google_website}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
                      >
                        🌐 Website
                      </a>
                    )}
                  </div>
                </div>

                <div className="ml-4">
                  {(venue as any).is_claimed ? (
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <UserCheck className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        {(venue as any).claimed_by_me ? 'Claimed by you' : 'Already claimed'}
                      </span>
                    </div>
                  ) : (
                    <button
                      onClick={() => claimVenue(venue.id)}
                      disabled={claimingVenue === venue.id}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300 text-white rounded-lg transition-colors"
                    >
                      {claimingVenue === venue.id ? (
                        <>
                          <Clock className="w-4 h-4 animate-spin" />
                          Claiming...
                        </>
                      ) : (
                        <>
                          <UserCheck className="w-4 h-4" />
                          Claim This Venue
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && venues.length === 0 && searchTerm && (
        <div className="text-center py-12">
          <MapPin className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No venues found
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Try searching with different terms or check the spelling.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Don't see your venue? <a href="mailto:support@trivia-nearby.com" className="text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300">Contact us</a> to get it added.
          </p>
        </div>
      )}

      {/* Initial State */}
      {!loading && venues.length === 0 && !searchTerm && (
        <div className="text-center py-12">
          <Search className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Find Your Venue
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Search for your venue by name or address to claim it and start managing your trivia events.
          </p>
        </div>
      )}
    </div>
  )
}

export default VenueClaimPage