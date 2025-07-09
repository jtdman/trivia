import React, { useMemo } from 'react'
import {
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
  formatEventTitle,
} from '../utils/location'
import { getImageProps } from '../utils/images'
import { ThemeContext } from '../context/theme_context'
import StructuredData, { createBreadcrumbSchema } from './StructuredData'
import SimpleSEO from './SimpleSEO'

interface TriviaListProps {
  location: string
  geocodedCoords: {lat: number, lng: number} | null
  onBack: () => void
}

type DateFilter = 'today' | 'tomorrow' | 'this-week'

const TriviaList: React.FC<TriviaListProps> = ({ location, geocodedCoords, onBack }) => {
  const { theme, toggleTheme } = React.useContext(ThemeContext)
  const userLocation = useLocation()
  const [dateFilter, setDateFilter] = React.useState<DateFilter>('today')
  const { venues, loading, error } = useVenues({
    latitude: geocodedCoords?.lat || userLocation.latitude || undefined,
    longitude: geocodedCoords?.lng || userLocation.longitude || undefined,
    radiusMiles: 30,
    limit: 50,
  })

  // Helper function to get day order (today = 0, tomorrow = 1, etc.)
  const getDayOrder = (dayOfWeek: string): number => {
    const today = new Date()
    const todayDay = today.getDay() // 0 = Sunday, 1 = Monday, etc.
    
    const dayMap: Record<string, number> = {
      'Sunday': 0,
      'Monday': 1,
      'Tuesday': 2,
      'Wednesday': 3,
      'Thursday': 4,
      'Friday': 5,
      'Saturday': 6
    }
    
    const eventDay = dayMap[dayOfWeek]
    if (eventDay === undefined) return 999 // Unknown day goes to end
    
    // Calculate days from today (0 = today, 1 = tomorrow, etc.)
    let daysFromToday = eventDay - todayDay
    if (daysFromToday < 0) daysFromToday += 7 // Next week
    
    return daysFromToday
  }

  // Helper function to check if an event should be shown based on date filter
  const shouldShowEvent = (eventDayOfWeek: string, filter: DateFilter): boolean => {
    const today = new Date()
    const todayDay = today.toLocaleDateString('en-US', { weekday: 'long' })
    
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    const tomorrowDay = tomorrow.toLocaleDateString('en-US', { weekday: 'long' })
    
    // Get days from today through end of week (Sunday)
    const thisWeekDays: string[] = []
    const currentDay = new Date(today)
    
    // Add days from today through Sunday
    while (currentDay.getDay() !== 0 || thisWeekDays.length === 0) { // 0 = Sunday
      thisWeekDays.push(currentDay.toLocaleDateString('en-US', { weekday: 'long' }))
      currentDay.setDate(currentDay.getDate() + 1)
      if (thisWeekDays.length > 7) break // Safety check
    }
    
    switch (filter) {
      case 'today':
        return eventDayOfWeek === todayDay
      case 'tomorrow':
        return eventDayOfWeek === tomorrowDay
      case 'this-week':
        return thisWeekDays.includes(eventDayOfWeek)
      default:
        return true
    }
  }

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
        venue.events?.filter((event) => 
          event.is_active && shouldShowEvent(event.day_of_week, dateFilter)
        ) || []

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
            title: formatEventTitle(event.event_type, event.provider_id),
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

    // Sort by day of week for "this week", otherwise by distance
    return cards.sort((a, b) => {
      const aVenue = venues.find((v) => v.id === a.venue_id)
      const bVenue = venues.find((v) => v.id === b.venue_id)

      // Special sorting for "this week" filter
      if (dateFilter === 'this-week') {
        // Get the earliest day order for each venue's events
        const aEarliestDay = Math.min(...a.events.map(event => {
          // Need to get the actual day name from the venue's events
          const venueEvent = aVenue?.events?.find(ve => ve.id === event.id)
          return venueEvent ? getDayOrder(venueEvent.day_of_week) : 999
        }))
        
        const bEarliestDay = Math.min(...b.events.map(event => {
          // Need to get the actual day name from the venue's events
          const venueEvent = bVenue?.events?.find(ve => ve.id === event.id)
          return venueEvent ? getDayOrder(venueEvent.day_of_week) : 999
        }))

        // Sort by day first
        if (aEarliestDay !== bEarliestDay) {
          return aEarliestDay - bEarliestDay
        }

        // If same day, sort by distance
        if (aVenue?.distance_miles && bVenue?.distance_miles) {
          return aVenue.distance_miles - bVenue.distance_miles
        }
        if (aVenue?.distance_miles && !bVenue?.distance_miles) return -1
        if (!aVenue?.distance_miles && bVenue?.distance_miles) return 1
        
        // Finally by name
        return a.venue.localeCompare(b.venue)
      }

      // Default sorting for other filters: distance first, then name
      if (aVenue?.distance_miles && bVenue?.distance_miles) {
        return aVenue.distance_miles - bVenue.distance_miles
      }
      if (aVenue?.distance_miles && !bVenue?.distance_miles) return -1
      if (!aVenue?.distance_miles && bVenue?.distance_miles) return 1
      return a.venue.localeCompare(b.venue)
    })
  }, [venues, dateFilter])

  if (loading) {
    return (
      <div className='bg-white dark:bg-black w-full min-h-screen text-black dark:text-white px-4 py-6'>
        {/* Header with theme toggle */}
        <div className='flex justify-between items-center mb-6 max-w-7xl mx-auto'>
          <button
            onClick={onBack}
            className='text-purple-400 font-medium text-base md:text-lg'
          >
            ← Back
          </button>

          {/* App title header */}
          <div className='flex items-center gap-3'>
            <h1 className='text-lg md:text-xl font-bold'>
              <span className='text-purple-400'>TRIVIA</span>
              <span className='text-black dark:text-white'>NEARBY</span>
            </h1>
            <div className='flex gap-2'>
              <Search className='w-4 h-4 md:w-5 md:h-5 text-black dark:text-white' />
              <Brain className='w-4 h-4 md:w-5 md:h-5 text-black dark:text-white' />
              <Beer className='w-4 h-4 md:w-5 md:h-5 text-black dark:text-white' />
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

        <div className='flex items-center justify-center h-64 md:h-96'>
          <div className='text-center'>
            <Loader2 className='w-8 h-8 md:w-12 md:h-12 animate-spin mx-auto mb-4' />
            <p className='text-gray-600 dark:text-gray-400 text-base md:text-lg'>
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
        <div className='flex justify-between items-center mb-6 max-w-7xl mx-auto'>
          <button
            onClick={onBack}
            className='text-purple-400 font-medium text-base md:text-lg'
          >
            ← Back
          </button>

          {/* App title header */}
          <div className='flex items-center gap-3'>
            <h1 className='text-lg md:text-xl font-bold'>
              <span className='text-purple-400'>TRIVIA</span>
              <span className='text-black dark:text-white'>NEARBY</span>
            </h1>
            <div className='flex gap-2'>
              <Search className='w-4 h-4 md:w-5 md:h-5 text-black dark:text-white' />
              <Brain className='w-4 h-4 md:w-5 md:h-5 text-black dark:text-white' />
              <Beer className='w-4 h-4 md:w-5 md:h-5 text-black dark:text-white' />
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

        <div className='flex items-center justify-center h-64 md:h-96'>
          <div className='text-center'>
            <AlertCircle className='w-8 h-8 md:w-12 md:h-12 text-red-500 mx-auto mb-4' />
            <p className='text-red-500 mb-2 text-base md:text-lg'>Failed to load trivia events</p>
            <p className='text-gray-600 dark:text-gray-400 text-sm md:text-base'>{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='bg-white dark:bg-black w-full min-h-screen text-black dark:text-white px-4 py-6'>
      {/* SEO */}
      <SimpleSEO
        location={location}
        canonical={`https://trivia-nearby.com/trivia-near-${location.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`}
      />
      
      {/* Structured Data */}
      <StructuredData 
        data={createBreadcrumbSchema([
          { name: 'Home', url: 'https://trivia-nearby.com' },
          { name: `Trivia in ${location}`, url: `https://trivia-nearby.com/trivia-near-${location.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}` }
        ])}
      />
      
      {/* Header with theme toggle */}
      <div className='flex justify-between items-center mb-6 max-w-7xl mx-auto'>
        <button
          onClick={onBack}
          className='text-purple-400 font-medium text-base md:text-lg'
        >
          ← Back
        </button>

        {/* App title header */}
        <div className='flex items-center gap-3'>
          <h1 className='text-lg md:text-xl font-bold'>
            <span className='text-purple-400'>TRIVIA</span>
            <span className='text-black dark:text-white'>NEARBY</span>
          </h1>
          <div className='flex gap-2'>
            <Search className='w-4 h-4 md:w-5 md:h-5 text-black dark:text-white' />
            <Brain className='w-4 h-4 md:w-5 md:h-5 text-black dark:text-white' />
            <Beer className='w-4 h-4 md:w-5 md:h-5 text-black dark:text-white' />
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

      <div className='max-w-7xl mx-auto'>
        {/* Header */}
        <div className='mb-6'>
          <h1 className='text-2xl md:text-4xl font-bold mb-2'>
            Trivia Near {location}
          </h1>
          <p className='text-gray-600 dark:text-gray-400 text-base md:text-lg'>
            {venueCards.length} venues found
            {userLocation.loading && ' • Getting location...'}
            {userLocation.error && ' • Location unavailable'}
          </p>
        </div>

        {/* Date Filter Pillboxes */}
        <div className='mb-8'>
          <div className='flex gap-3 flex-wrap justify-center md:justify-start'>
            <button
              onClick={() => setDateFilter('today')}
              className={`px-6 py-3 rounded-full text-sm md:text-base font-medium transition-all duration-200 ${
                dateFilter === 'today'
                  ? 'bg-purple-500 text-white shadow-lg transform scale-105'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 hover:scale-105'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setDateFilter('tomorrow')}
              className={`px-6 py-3 rounded-full text-sm md:text-base font-medium transition-all duration-200 ${
                dateFilter === 'tomorrow'
                  ? 'bg-purple-500 text-white shadow-lg transform scale-105'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 hover:scale-105'
              }`}
            >
              Tomorrow
            </button>
            <button
              onClick={() => setDateFilter('this-week')}
              className={`px-6 py-3 rounded-full text-sm md:text-base font-medium transition-all duration-200 ${
                dateFilter === 'this-week'
                  ? 'bg-purple-500 text-white shadow-lg transform scale-105'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 hover:scale-105'
              }`}
            >
              This Week
            </button>
          </div>
        </div>

        {/* No venues found */}
        {venueCards.length === 0 && (
          <div className='text-center py-12'>
            <Calendar className='w-12 h-12 md:w-16 md:h-16 text-gray-400 mx-auto mb-4' />
            <h3 className='text-lg md:text-xl font-medium mb-2'>No trivia venues found</h3>
            <p className='text-gray-600 dark:text-gray-400 text-base md:text-lg'>
              Try expanding your search radius or check back later for new venues.
            </p>
          </div>
        )}

        {/* Venue Cards - Grid Layout for Desktop */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'>
          {venueCards.map((venueCard) => (
            <div
              key={venueCard.venue_id}
              className='bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer'
            >
              {/* Venue Image with Overlaid Text */}
              <div className='relative h-48 md:h-56 lg:h-52 bg-gradient-to-br from-amber-400 to-orange-600 overflow-hidden'>
                <img
                  {...getImageProps(
                    venueCard.image.startsWith('ATK') ? venueCard.image : null, // Google photo reference
                    venueCard.image.startsWith('http') ? venueCard.image : null, // Thumbnail URL
                    venueCard.venue_name
                  )}
                  className='w-full h-full object-cover transition-transform duration-300 hover:scale-110'
                />
                {venueCard.distance && (
                  <div className='absolute top-3 right-3 bg-purple-500 text-white px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm bg-opacity-90 shadow-lg'>
                    {venueCard.distance}
                  </div>
                )}
                {/* Stronger gradient overlay for better text contrast */}
                <div className='absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent' />
                
                {/* Overlaid Venue Details */}
                <div className='absolute bottom-0 left-0 right-0 p-4 text-white'>
                  <h3 className='text-lg md:text-xl font-bold mb-1 drop-shadow-lg line-clamp-2'>{venueCard.venue}</h3>
                  <div className='text-sm text-white/90 drop-shadow-md line-clamp-1'>
                    {venueCard.address}
                  </div>
                </div>
              </div>

              {/* Events Section Only */}
              <div className='p-4 lg:p-5'>
                {/* Events */}
                <div className='space-y-3'>
                  {venueCard.events.map((event) => (
                    <div
                      key={event.id}
                      className='border-t border-gray-200 dark:border-gray-700 pt-3 first:border-t-0 first:pt-0'
                    >
                      <div className='flex justify-between items-start mb-2'>
                        <h5 className='font-medium text-purple-400 line-clamp-1 text-sm lg:text-base'>
                          {event.title}
                        </h5>
                        <span className='text-xs text-gray-500 bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded flex-shrink-0 ml-2'>
                          {event.frequency}
                        </span>
                      </div>

                      <div className='flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 text-sm text-gray-600 dark:text-gray-400'>
                        <div className='flex items-center gap-3 lg:gap-4'>
                          <div className='flex items-center gap-1'>
                            <Calendar className='w-4 h-4' />
                            <span className='text-xs lg:text-sm'>{event.day}</span>
                          </div>

                          <div className='flex items-center gap-1'>
                            <Clock className='w-4 h-4' />
                            <span className='text-xs lg:text-sm'>{event.time}</span>
                          </div>
                        </div>

                        <div className='flex items-center gap-1'>
                          <DollarSign className='w-4 h-4' />
                          <span className='line-clamp-1 text-xs lg:text-sm'>{event.prize}</span>
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
    </div>
  )
}

export default TriviaList
