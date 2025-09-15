import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Calendar, Clock, DollarSign, MapPin, Phone, Globe, Users, ArrowLeft, ExternalLink, Navigation } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getImageProps } from '../utils/images'
import SimpleSEO from './SimpleSEO'

interface EventWithVenue {
  id: string
  event_type: string
  day_of_week: string
  start_time: string
  end_time: string | null
  frequency: string
  prize_amount: number | null
  prize_description: string | null
  max_teams: number | null
  venue: {
    id: string
    google_name: string
    name_original: string
    google_formatted_address: string
    address_original: string
    google_phone_number: string | null
    google_website: string | null
    google_rating: number | null
    google_user_ratings_total: number | null
    thumbnail_url: string | null
    google_photo_reference: string | null
    google_location: any
  }
  trivia_providers?: {
    name: string
    website: string | null
  }
}

const EventDetailPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>()
  const [event, setEvent] = useState<EventWithVenue | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!eventId) return

    fetchEventDetails()
  }, [eventId])

  const fetchEventDetails = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('events')
        .select(`
          id,
          event_type,
          day_of_week,
          start_time,
          end_time,
          frequency,
          prize_amount,
          prize_description,
          max_teams,
          venues!inner (
            id,
            google_name,
            name_original,
            google_formatted_address,
            address_original,
            google_phone_number,
            google_website,
            google_rating,
            google_user_ratings_total,
            thumbnail_url,
            google_photo_reference,
            google_location
          ),
          trivia_providers (
            name,
            website
          )
        `)
        .eq('id', eventId)
        .eq('is_active', true)
        .single()

      if (error) throw error
      if (!data) throw new Error('Event not found')

      // Transform the data to match EventWithVenue interface
      // Supabase returns arrays for joined tables, we need to extract the single objects
      const eventData: EventWithVenue = {
        ...data,
        venue: Array.isArray(data.venues) ? data.venues[0] : data.venues,
        trivia_providers: Array.isArray(data.trivia_providers) ? data.trivia_providers[0] : data.trivia_providers
      }

      setEvent(eventData)
    } catch (err: any) {
      console.error('Error fetching event details:', err)
      setError(err.message || 'Failed to load event details')
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${displayHour}:${minutes} ${ampm}`
  }

  const formatPrize = (amount: number | null, description: string | null) => {
    if (amount && description) {
      return `$${amount} - ${description}`
    } else if (amount) {
      return `$${amount}`
    } else if (description) {
      return description
    }
    return 'Prizes awarded'
  }

  const getDirectionsUrl = (venue: EventWithVenue['venue']) => {
    const address = venue.google_formatted_address || venue.address_original
    return `https://maps.google.com/maps?daddr=${encodeURIComponent(address)}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p>Loading event details...</p>
        </div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Event Not Found</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error || 'This event could not be found.'}</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Search
          </Link>
        </div>
      </div>
    )
  }

  const venue = event.venue
  const venueName = venue.google_name || venue.name_original
  const venueAddress = venue.google_formatted_address || venue.address_original

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      <SimpleSEO
        title={`${event.event_type} at ${venueName} - ${event.day_of_week}s | Trivia Nearby`}
        description={`Join ${event.event_type} at ${venueName} every ${event.day_of_week} at ${formatTime(event.start_time)}. ${formatPrize(event.prize_amount, event.prize_description)}`}
        keywords={`trivia, ${event.event_type}, ${venueName}, ${event.day_of_week}, ${venueAddress}`}
      />

      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-purple-500 hover:text-purple-600 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Trivia Search
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Venue Image */}
        <div className="relative h-64 md:h-80 lg:h-96 rounded-xl overflow-hidden mb-8 shadow-lg">
          <img
            {...getImageProps(
              venue.google_photo_reference,
              venue.thumbnail_url,
              venueName
            )}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">{event.event_type}</h1>
            <h2 className="text-xl md:text-2xl font-medium opacity-90">{venueName}</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Event Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold mb-4">Event Details</h3>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-purple-500" />
                  <div>
                    <p className="font-medium">Every {event.day_of_week}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {event.frequency === 'weekly' ? 'Weekly recurring event' : 'One-time event'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-purple-500" />
                  <div>
                    <p className="font-medium">
                      {formatTime(event.start_time)}
                      {event.end_time && ` - ${formatTime(event.end_time)}`}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Event time</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <DollarSign className="w-5 h-5 text-purple-500" />
                  <div>
                    <p className="font-medium">{formatPrize(event.prize_amount, event.prize_description)}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Prizes</p>
                  </div>
                </div>

                {event.max_teams && (
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-purple-500" />
                    <div>
                      <p className="font-medium">Max {event.max_teams} teams</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Team limit</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Provider Info */}
            {event.trivia_providers && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-bold mb-4">Hosted By</h3>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                    {event.trivia_providers.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium">{event.trivia_providers.name}</p>
                    {event.trivia_providers.website && (
                      <a
                        href={event.trivia_providers.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-500 hover:text-purple-600 text-sm flex items-center gap-1"
                      >
                        <Globe className="w-4 h-4" />
                        Visit Website
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Venue Info Sidebar */}
          <div className="space-y-6">
            {/* Venue Details */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold mb-4">Venue Info</h3>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">{venueName}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{venueAddress}</p>
                  </div>
                </div>

                {venue.google_phone_number && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-purple-500" />
                    <a 
                      href={`tel:${venue.google_phone_number}`}
                      className="text-purple-500 hover:text-purple-600 font-medium"
                    >
                      {venue.google_phone_number}
                    </a>
                  </div>
                )}

                {venue.google_website && (
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-purple-500" />
                    <a
                      href={venue.google_website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-500 hover:text-purple-600 font-medium flex items-center gap-1"
                    >
                      Visit Website
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}

                {venue.google_rating && (
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 text-purple-500 flex items-center justify-center">★</div>
                    <div>
                      <p className="font-medium">{venue.google_rating}/5</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {venue.google_user_ratings_total} reviews
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <a
                href={getDirectionsUrl(venue)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-purple-500 hover:bg-purple-600 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Navigation className="w-4 h-4" />
                Get Directions
              </a>

              {venue.google_phone_number && (
                <a
                  href={`tel:${venue.google_phone_number}`}
                  className="w-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Phone className="w-4 h-4" />
                  Call Venue
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EventDetailPage