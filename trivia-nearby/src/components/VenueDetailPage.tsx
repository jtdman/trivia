import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, MapPin, Plus, Edit3, Calendar, Clock, DollarSign, Users, CheckCircle, XCircle } from 'lucide-react'
import { supabase, type Venue, type Event } from '../lib/supabase'
import { useAuth } from '../context/auth_context'

interface VenueWithEvents extends Venue {
  events: Event[]
}

const VenueDetailPage: React.FC = () => {
  const { venueId } = useParams<{ venueId: string }>()
  const navigate = useNavigate()
  const { hasProviderAccess, isSuperAdmin, provider } = useAuth()
  const [venue, setVenue] = useState<VenueWithEvents | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (venueId) {
      fetchVenueWithEvents()
    }
  }, [venueId])

  const fetchVenueWithEvents = async () => {
    try {
      setLoading(true)
      
      let query = supabase
        .from('venues')
        .select(`
          *,
          events(
            *,
            trivia_providers(id, name)
          )
        `)
        .eq('id', venueId)
        .single()

      const { data, error } = await query

      if (error) throw error
      
      // Filter events by provider if user is provider admin
      if (hasProviderAccess && provider && !isSuperAdmin) {
        data.events = data.events?.filter((event: any) => event.provider_id === provider.id) || []
      }
      
      setVenue(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (time: string) => {
    return new Date(`1970-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const getStatusIcon = (isActive: boolean) => {
    return isActive ? (
      <CheckCircle className="w-4 h-4 text-green-500" />
    ) : (
      <XCircle className="w-4 h-4 text-red-500" />
    )
  }

  const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const sortedEvents = venue?.events?.sort((a, b) => {
    const dayA = dayOrder.indexOf(a.day_of_week)
    const dayB = dayOrder.indexOf(b.day_of_week)
    if (dayA !== dayB) return dayA - dayB
    return a.start_time.localeCompare(b.start_time)
  }) || []

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded mb-6"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || !venue) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {error ? 'Error loading venue' : 'Venue not found'}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {error || "The venue you're looking for doesn't exist or you don't have permission to view it."}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => {
            // If provider admin (not super admin), go back to My Venues
            // Otherwise go to all venues
            const backPath = hasProviderAccess && !isSuperAdmin 
              ? '/admin/venues/my-venues' 
              : '/admin/venues'
            navigate(backPath)
          }}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          {hasProviderAccess && !isSuperAdmin ? 'Back to My Venues' : 'Back to Venues'}
        </button>
      </div>

      {/* Venue Info */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {venue.google_name || venue.name_original}
            </h1>
            {venue.google_name && venue.google_name !== venue.name_original && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                Originally: {venue.name_original}
              </p>
            )}
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <MapPin className="w-4 h-4" />
              <span>{venue.google_formatted_address || venue.address_original}</span>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Link
              to={`/admin/venues/${venue.id}`}
              className="flex items-center gap-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              Edit Venue
            </Link>
          </div>
        </div>

        {/* Venue Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          {venue.google_phone_number && (
            <div>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</span>
              <p className="text-gray-900 dark:text-white">{venue.google_phone_number}</p>
            </div>
          )}
          {venue.google_website && (
            <div>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Website</span>
              <p>
                <a 
                  href={venue.google_website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
                >
                  Visit Website
                </a>
              </p>
            </div>
          )}
          <div>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</span>
            <p className="capitalize text-gray-900 dark:text-white">{venue.verification_status}</p>
          </div>
        </div>
      </div>

      {/* Events Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Events ({sortedEvents.length})
          </h2>
          <Link
            to={`/admin/events/new?venue_id=${venue.id}`}
            className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Event
          </Link>
        </div>

        {sortedEvents.length > 0 ? (
          <div className="space-y-4">
            {sortedEvents.map((event) => (
              <div 
                key={event.id} 
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {event.event_type}
                      </h3>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(event.is_active)}
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {event.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Calendar className="w-4 h-4" />
                        <span>{event.day_of_week}s</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Clock className="w-4 h-4" />
                        <span>
                          {formatTime(event.start_time)}
                          {event.end_time && ` - ${formatTime(event.end_time)}`}
                        </span>
                      </div>
                      
                      {event.prize_amount && (
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <DollarSign className="w-4 h-4" />
                          <span>${event.prize_amount}</span>
                        </div>
                      )}
                      
                      {event.max_teams && (
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <Users className="w-4 h-4" />
                          <span>Max {event.max_teams} teams</span>
                        </div>
                      )}
                    </div>
                    
                    {event.prize_description && (
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        {event.prize_description}
                      </p>
                    )}
                    
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 capitalize">
                      {event.frequency} event
                    </div>
                  </div>
                  
                  <Link
                    to={`/admin/events/${event.id}`}
                    className="ml-4 p-2 text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
                  >
                    <Edit3 className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No events yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              This venue doesn't have any trivia events Scheduled yet.
            </p>
            <Link
              to={`/admin/events/new?venue_id=${venue.id}`}
              className="inline-flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add First Event
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

export default VenueDetailPage