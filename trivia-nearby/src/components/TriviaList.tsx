import React, { useMemo } from 'react'
import {
  MapPin,
  Calendar,
  Clock,
  DollarSign,
  Loader2,
  AlertCircle,
  Search,
  Brain,
  Beer,
  Sun,
  Moon,
} from 'lucide-react'
import { useVenues } from '../hooks/useVenues'
import { useLocation } from '../hooks/useLocation'
import {
  formatDayOfWeek,
  formatTime,
  formatPrize,
  formatDistance,
} from '../utils/location'
import { getImageProps } from '../utils/images'
import { ThemeContext } from '../context/theme_context'

interface TriviaListProps {
  location: string
  geocodedCoords: {lat: number, lng: number} | null
  onBack: () => void
}

const TriviaList: React.FC<TriviaListProps> = ({ location, geocodedCoords, onBack }) => {
  const { theme, toggleTheme } = React.useContext(ThemeContext)
  const userLocation = useLocation()
  const { venues, loading, error } = useVenues({
    latitude: geocodedCoords?.lat || userLocation.latitude || undefined,
    longitude: geocodedCoords?.lng || userLocation.longitude || undefined,
    radiusMiles: 30,
    limit: 50,
  })

  // Debug logging
  console.log('TriviaList Debug:', {
    userLocation,
    geocodedCoords,
    finalCoords: {
      lat: geocodedCoords?.lat || userLocation.latitude,
      lng: geocodedCoords?.lng || userLocation.longitude
    },
    venues: venues?.length,
    loading,
    error,
    location,
  })

  // Transform venues data for display (one card per venue with all events)
  const venueCards = useMemo(() => {
    const cards: Array<{
      venue_id: string
      venue: string
      address: string
      distance: string
      image: string
      venue_name: string
      events: Array<{
        id: string
        title: string
        day: string
        frequency: string
        time: string
        prize: string
        count: number
      }>
    }> = []

    venues.forEach((venue) => {
      const activeEvents =
        venue.events?.filter((event) => event.is_active) || []

      if (activeEvents.length === 0) return

      // Deduplicate events by grouping identical ones
      const eventMap = new Map<
        string,
        {
          id: string
          title: string
          day: string
          frequency: string
          time: string
          prize: string
          count: number
        }
      >()

      activeEvents.forEach((event) => {
        const key = `${event.event_type}-${event.day_of_week}-${event.start_time}`

        if (eventMap.has(key)) {
          // Just increment count for duplicates
          eventMap.get(key)!.count++
        } else {
          // First occurrence of this event
          eventMap.set(key, {
            id: event.id,
            title: event.event_type,
            day: formatDayOfWeek(event.day_of_week),
            frequency:
              event.frequency.charAt(0).toUpperCase() +
              event.frequency.slice(1),
            time: formatTime(event.start_time),
            prize: formatPrize(event.prize_amount, event.prize_description),
            count: 1,
          })
        }
      })

      // Get distance if we have coordinates
      let distance = ''
      if (venue.distance_miles) {
        distance = formatDistance(venue.distance_miles)
      }

      cards.push({
        venue_id: venue.id,
        venue: venue.google_name || venue.name_original,
        address: venue.google_formatted_address || venue.address_original,
        distance,
        image: venue.thumbnail_url || venue.google_photo_reference || '',
        venue_name: venue.google_name || venue.name_original,
        events: Array.from(eventMap.values()),
      })
    })

    // Sort by distance if available, then by venue name
    return cards.sort((a, b) => {
      const aVenue = venues.find((v) => v.id === a.venue_id)
      const bVenue = venues.find((v) => v.id === b.venue_id)

      // If both have distances, sort by distance
      if (aVenue?.distance_miles && bVenue?.distance_miles) {
        return aVenue.distance_miles - bVenue.distance_miles
      }
      // If only one has distance, prioritize it
      if (aVenue?.distance_miles && !bVenue?.distance_miles) return -1
      if (!aVenue?.distance_miles && bVenue?.distance_miles) return 1
      // Otherwise sort by name
      return a.venue.localeCompare(b.venue)
    })
  }, [venues, userLocation.latitude, userLocation.longitude])

  if (loading) {
    return (
      <div className='bg-white dark:bg-black w-full min-h-screen text-black dark:text-white px-4 py-6'>
        {/* Header with theme toggle */}
        <div className='flex justify-between items-center mb-6'>
          <button
            onClick={onBack}
            className='text-purple-400 font-medium'
          >
            ← Back
          </button>

          {/* App title header */}
          <div className='flex items-center gap-3'>
            <h1 className='text-lg font-bold'>
              <span className='text-purple-400'>TRIVIA</span>
              <span className='text-black dark:text-white'>NEARBY</span>
            </h1>
            <div className='flex gap-2'>
              <Search className='w-4 h-4 text-black dark:text-white' />
              <Brain className='w-4 h-4 text-black dark:text-white' />
              <Beer className='w-4 h-4 text-black dark:text-white' />
            </div>
          </div>

          <button onClick={toggleTheme} className='p-2'>
            {theme === 'dark' ? (
              <Sun className='w-5 h-5' />
            ) : (
              <Moon className='w-5 h-5' />
            )}
          </button>
        </div>

        <div className='flex items-center justify-center h-64'>
          <div className='text-center'>
            <Loader2 className='w-8 h-8 animate-spin mx-auto mb-4' />
            <p className='text-gray-600 dark:text-gray-400'>
              Loading trivia events...
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className='bg-white dark:bg-black w-full min-h-screen text-black dark:text-white px-4 py-6'>
        {/* Header with theme toggle */}
        <div className='flex justify-between items-center mb-6'>
          <button
            onClick={onBack}
            className='text-purple-400 font-medium'
          >
            ← Back
          </button>

          {/* App title header */}
          <div className='flex items-center gap-3'>
            <h1 className='text-lg font-bold'>
              <span className='text-purple-400'>TRIVIA</span>
              <span className='text-black dark:text-white'>NEARBY</span>
            </h1>
            <div className='flex gap-2'>
              <Search className='w-4 h-4 text-black dark:text-white' />
              <Brain className='w-4 h-4 text-black dark:text-white' />
              <Beer className='w-4 h-4 text-black dark:text-white' />
            </div>
          </div>

          <button onClick={toggleTheme} className='p-2'>
            {theme === 'dark' ? (
              <Sun className='w-5 h-5' />
            ) : (
              <Moon className='w-5 h-5' />
            )}
          </button>
        </div>

        <div className='flex items-center justify-center h-64'>
          <div className='text-center'>
            <AlertCircle className='w-8 h-8 text-red-500 mx-auto mb-4' />
            <p className='text-red-500 mb-2'>Failed to load trivia events</p>
            <p className='text-gray-600 dark:text-gray-400 text-sm'>{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='bg-white dark:bg-black w-full min-h-screen text-black dark:text-white px-4 py-6'>
      {/* Header with theme toggle */}
      <div className='flex justify-between items-center mb-6'>
        <button
          onClick={onBack}
          className='text-purple-400 font-medium'
        >
          ← Back
        </button>

        {/* App title header */}
        <div className='flex items-center gap-3'>
          <h1 className='text-lg font-bold'>
            <span className='text-purple-400'>TRIVIA</span>
            <span className='text-black dark:text-white'>NEARBY</span>
          </h1>
          <div className='flex gap-2'>
            <Search className='w-4 h-4 text-black dark:text-white' />
            <Brain className='w-4 h-4 text-black dark:text-white' />
            <Beer className='w-4 h-4 text-black dark:text-white' />
          </div>
        </div>

        <button onClick={toggleTheme} className='p-2'>
          {theme === 'dark' ? (
            <Sun className='w-5 h-5' />
          ) : (
            <Moon className='w-5 h-5' />
          )}
        </button>
      </div>


      {/* Header */}
      <div className='mb-6'>
        <h1 className='text-2xl font-bold mb-2'>
          Trivia Near {location}
        </h1>
        <p className='text-gray-600 dark:text-gray-400'>
          {venueCards.length} venues found
          {userLocation.loading && ' • Getting location...'}
          {userLocation.error && ' • Location unavailable'}
        </p>
      </div>

      {/* No venues found */}
      {venueCards.length === 0 && (
        <div className='text-center py-12'>
          <Calendar className='w-12 h-12 text-gray-400 mx-auto mb-4' />
          <h3 className='text-lg font-medium mb-2'>No trivia venues found</h3>
          <p className='text-gray-600 dark:text-gray-400'>
            Try expanding your search radius or check back later for new venues.
          </p>
        </div>
      )}

      {/* Venue Cards */}
      <div className='space-y-4'>
        {venueCards.map((venueCard) => (
          <div
            key={venueCard.venue_id}
            className='bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden shadow-sm'
          >
            {/* Venue Image */}
            <div className='relative h-48 bg-gradient-to-br from-amber-400 to-orange-600 overflow-hidden'>
              <img
                {...getImageProps(
                  venueCard.image.startsWith('ATK') ? venueCard.image : null, // Google photo reference
                  venueCard.image.startsWith('http') ? venueCard.image : null, // Thumbnail URL
                  venueCard.venue_name
                )}
                className='w-full h-full object-cover'
              />
              {venueCard.distance && (
                <div className='absolute top-3 right-3 bg-purple-500 text-white px-2 py-1 rounded-full text-sm font-medium backdrop-blur-sm bg-opacity-90'>
                  {venueCard.distance}
                </div>
              )}
              {/* Image overlay for better text contrast */}
              <div className='absolute inset-0 bg-gradient-to-t from-black/20 to-transparent' />
            </div>

            {/* Venue Details */}
            <div className='p-4'>
              <h3 className='text-xl font-bold mb-2'>{venueCard.venue}</h3>

              <div className='space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-4'>
                <div className='flex items-center gap-2'>
                  <MapPin className='w-4 h-4' />
                  <span>{venueCard.address}</span>
                </div>
              </div>

              {/* Events */}
              <div className='space-y-2'>
                {venueCard.events.map((event) => (
                  <div
                    key={event.id}
                    className='border-t border-gray-200 dark:border-gray-700 pt-3'
                  >
                    <div className='flex justify-between items-start mb-2'>
                      <h5 className='font-medium text-purple-400'>
                        {event.title}
                      </h5>
                      <span className='text-xs text-gray-500 bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded'>
                        {event.frequency}
                      </span>
                    </div>

                    <div className='flex items-center justify-between text-sm text-gray-600 dark:text-gray-400'>
                      <div className='flex items-center gap-4'>
                        <div className='flex items-center gap-1'>
                          <Calendar className='w-4 h-4' />
                          <span>{event.day}</span>
                        </div>

                        <div className='flex items-center gap-1'>
                          <Clock className='w-4 h-4' />
                          <span>{event.time}</span>
                        </div>
                      </div>

                      <div className='flex items-center gap-1'>
                        <DollarSign className='w-4 h-4' />
                        <span>{event.prize}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default TriviaList
