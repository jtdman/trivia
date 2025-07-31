import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/auth_context'
import { supabase } from '../lib/supabase'
import { Calendar, MapPin, Check, X, Clock, Plus } from 'lucide-react'
import { format, addWeeks } from 'date-fns'


const EventOccurrenceManager: React.FC = () => {
  const { isAdmin, userProfile } = useAuth()
  
  // Determine user type for role-specific UI
  const isProvider = !isAdmin && userProfile
  const isIndividualHost = !isAdmin && !userProfile
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [weeksToShow, setWeeksToShow] = useState(4)
  const [stats, setStats] = useState({
    totalEvents: 0,
    scheduledEvents: 0,
    confirmedEvents: 0,
    cancelledEvents: 0
  })
  const [providers, setProviders] = useState<any[]>([])
  const [selectedProvider, setSelectedProvider] = useState<string>('all')
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [venueSearch, setVenueSearch] = useState<string>('')

  useEffect(() => {
    fetchEvents()
  }, [userProfile, weeksToShow, selectedProvider, selectedDayOfWeek, selectedStatus, venueSearch])

  const fetchEvents = async () => {
    try {
      // Start from today instead of start of week to catch all events
      const startDate = new Date()
      const endDate = addWeeks(startDate, weeksToShow)

      let query = supabase
        .from('event_occurrences')
        .select(`
          id,
          event_id,
          occurrence_date,
          status,
          notes,
          events (
            event_type,
            start_time,
            day_of_week,
            provider_id,
            venues (
              name_original,
              google_name,
              google_formatted_address
            ),
            trivia_providers (
              name
            )
          )
        `)
        .gte('occurrence_date', format(startDate, 'yyyy-MM-dd'))
        .lte('occurrence_date', format(endDate, 'yyyy-MM-dd'))
        .order('occurrence_date')

      const { data, error } = await query
      
      if (error) {
        console.error('Error fetching events:', error)
        return
      }

      // Apply all filters
      let filteredData = data || []
      
      // 1. Provider filtering (role-based)
      if (!isAdmin && userProfile) {
        // Regular user: only show their provider's events
        filteredData = filteredData.filter(event => (event.events as any)?.provider_id === userProfile.id)
      } else if (isAdmin && selectedProvider !== 'all') {
        // God admin with specific provider selected
        filteredData = filteredData.filter(event => {
          const providerName = (event.events as any)?.trivia_providers?.name
          return providerName === selectedProvider
        })
      }
      
      // 2. Day of week filtering
      if (selectedDayOfWeek !== 'all') {
        filteredData = filteredData.filter(event => {
          const eventDayOfWeek = (event.events as any)?.day_of_week
          return eventDayOfWeek === selectedDayOfWeek
        })
      }
      
      // 3. Status filtering
      if (selectedStatus !== 'all') {
        filteredData = filteredData.filter(event => event.status === selectedStatus)
      }
      
      // 4. Venue search filtering
      if (venueSearch.trim()) {
        const searchTerm = venueSearch.toLowerCase().trim()
        filteredData = filteredData.filter(event => {
          const venues = (event.events as any)?.venues
          const venueName = (venues?.google_name || venues?.name_original || '').toLowerCase()
          const address = (venues?.google_formatted_address || '').toLowerCase()
          return venueName.includes(searchTerm) || address.includes(searchTerm)
        })
      }

      
      setEvents(filteredData)

      // Extract unique providers from events data
      if (isAdmin && data) {
        const uniqueProviders = Array.from(
          new Map(
            data
              .filter(event => (event.events as any)?.trivia_providers)
              .map(event => [(event.events as any).trivia_providers.name, (event.events as any).trivia_providers])
          ).values()
        ).sort((a, b) => a.name.localeCompare(b.name))
        
        setProviders(uniqueProviders)
      }

      // Calculate stats based on filtered data
      const totalEvents = filteredData.length || 0
      const scheduledEvents = filteredData.filter(e => e.status === 'scheduled').length || 0
      const confirmedEvents = filteredData.filter(e => e.status === 'confirmed').length || 0
      const cancelledEvents = filteredData.filter(e => e.status === 'cancelled').length || 0

      setStats({
        totalEvents,
        scheduledEvents,
        confirmedEvents,
        cancelledEvents
      })

    } catch (error) {
      console.error('Error fetching events:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateEventStatus = async (occurrenceId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('event_occurrences')
        .update({ 
          status: newStatus,
          confirmed_at: newStatus === 'confirmed' ? new Date().toISOString() : null
        })
        .eq('id', occurrenceId)

      if (error) throw error
      fetchEvents()
    } catch (error) {
      console.error('Error updating event:', error)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Check className="h-5 w-5 text-green-500" />
      case 'cancelled':
        return <X className="h-5 w-5 text-red-500" />
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="sm:flex sm:items-center mb-8">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isAdmin ? 'All Event Schedules' : isProvider ? 'My Schedule' : 'My Schedule'}
          </h1>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            {isAdmin ? 'Manage and confirm all provider event schedules' : 
             isProvider ? 'Manage and confirm your upcoming trivia events' :
             'Manage and confirm your personal trivia events'}
          </p>
          {isAdmin && (
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
              Platform-wide view • {events.length} upcoming events
            </p>
          )}
          {isProvider && userProfile && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              {userProfile.display_name} • {events.length} upcoming events
            </p>
          )}
          {isIndividualHost && (
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              Your events • {events.length} upcoming events
            </p>
          )}
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          {/* Filters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {/* Provider Filter (Admin only) */}
            {isAdmin && (
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className="rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 py-2 pl-3 pr-10 text-sm focus:border-purple-500 focus:outline-none focus:ring-purple-500"
              >
                <option value="all">All Providers</option>
                {providers.map(provider => (
                  <option key={provider.name} value={provider.name}>{provider.name}</option>
                ))}
              </select>
            )}
            
            {/* Day of Week Filter */}
            <select
              value={selectedDayOfWeek}
              onChange={(e) => setSelectedDayOfWeek(e.target.value)}
              className="rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 py-2 pl-3 pr-10 text-sm focus:border-purple-500 focus:outline-none focus:ring-purple-500"
            >
              <option value="all">All Days</option>
              <option value="monday">Monday</option>
              <option value="tuesday">Tuesday</option>
              <option value="wednesday">Wednesday</option>
              <option value="thursday">Thursday</option>
              <option value="friday">Friday</option>
              <option value="saturday">Saturday</option>
              <option value="sunday">Sunday</option>
            </select>
            
            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 py-2 pl-3 pr-10 text-sm focus:border-purple-500 focus:outline-none focus:ring-purple-500"
            >
              <option value="all">All Status</option>
              <option value="scheduled">Scheduled</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            
            {/* Venue Search */}
            <input
              type="text"
              placeholder="Search venues..."
              value={venueSearch}
              onChange={(e) => setVenueSearch(e.target.value)}
              className="rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 py-2 pl-3 pr-3 text-sm focus:border-purple-500 focus:outline-none focus:ring-purple-500"
            />
            
            {/* Time Range */}
            <select
              value={weeksToShow}
              onChange={(e) => setWeeksToShow(Number(e.target.value))}
              className="rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 py-2 pl-3 pr-10 text-sm focus:border-purple-500 focus:outline-none focus:ring-purple-500"
            >
              <option value={2}>Next 2 weeks</option>
              <option value={4}>Next 4 weeks</option>
              <option value={8}>Next 8 weeks</option>
            </select>
          </div>
          
          {/* Filter Summary and Clear Button */}
          <div className="mt-2 flex items-center justify-between">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Showing {events.length} events
              {selectedProvider !== 'all' && ` • ${selectedProvider}`}
              {selectedDayOfWeek !== 'all' && ` • ${selectedDayOfWeek}s`}
              {selectedStatus !== 'all' && ` • ${selectedStatus}`}
              {venueSearch.trim() && ` • "${venueSearch}"`}
            </div>
            {(selectedProvider !== 'all' || selectedDayOfWeek !== 'all' || selectedStatus !== 'all' || venueSearch.trim()) && (
              <button
                onClick={() => {
                  setSelectedProvider('all')
                  setSelectedDayOfWeek('all')
                  setSelectedStatus('all')
                  setVenueSearch('')
                }}
                className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 font-medium"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Calendar className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Total Events
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {stats.totalEvents}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Scheduled
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {stats.scheduledEvents}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Check className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Confirmed
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {stats.confirmedEvents}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <X className="h-6 w-6 text-red-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Cancelled
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {stats.cancelledEvents}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Events List */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
            Upcoming Events {events.length > 0 && <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({events.length})</span>}
          </h3>
          {events.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                {isIndividualHost ? 'No scheduled events yet' : 'No events'}
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {isIndividualHost 
                  ? 'Once you add your trivia events, their weekly schedules will appear here for confirmation.'
                  : 'No events found for the selected time period.'
                }
              </p>
              {isIndividualHost && (
                <div className="mt-6">
                  <a
                    href="/admin/events"
                    className="inline-flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Your First Event
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
                <div key={event.id} className="border rounded-lg p-4 border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {event.events?.event_type || 'Trivia Event'}
                      </h4>
                      {event.notes && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{event.notes}</p>
                      )}
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 space-x-4">
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          {event.events?.venues?.google_name || event.events?.venues?.name_original || 'Unknown Venue'}
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {format(new Date(event.occurrence_date), 'EEEE, MMM d')} at {event.events?.start_time ? format(new Date(`2000-01-01T${event.events.start_time}`), 'h:mm a') : 'TBD'}
                        </div>
                        {isAdmin && event.events?.trivia_providers?.name && (
                          <div className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                            {event.events.trivia_providers.name}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center">
                        {getStatusIcon(event.status)}
                        <span className={`ml-2 inline-flex rounded-full px-2 text-sm font-semibold leading-5 ${getStatusColor(event.status)}`}>
                          {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                        </span>
                      </div>
                      {event.status === 'scheduled' && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => updateEventStatus(event.id, 'confirmed')}
                            className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 text-sm font-medium"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => updateEventStatus(event.id, 'cancelled')}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                      {event.status === 'cancelled' && (
                        <button
                          onClick={() => updateEventStatus(event.id, 'scheduled')}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
                        >
                          Reschedule
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default EventOccurrenceManager