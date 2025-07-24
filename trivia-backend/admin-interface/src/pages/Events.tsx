import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { Plus, Calendar, MapPin, Check, X, Clock } from 'lucide-react'
import { format, addWeeks, startOfWeek } from 'date-fns'

interface EventOccurrence {
  id: string
  event_id: string
  occurrence_date: string
  status: string
  is_themed: boolean
  theme_name: string | null
  theme_description: string | null
  event: {
    event_type: string
    start_time: string
    day_of_week: string
    venue: {
      name_original: string
      google_name: string | null
      google_formatted_address: string | null
    }
    trivia_provider: {
      name: string
    } | null
  }
}

export function Events() {
  const { isAdmin, isProvider, providerId } = useAuth()
  const [events, setEvents] = useState<EventOccurrence[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddThemed, setShowAddThemed] = useState(false)
  const [weeksToShow, setWeeksToShow] = useState(4)

  useEffect(() => {
    fetchEvents()
  }, [providerId, weeksToShow])

  const fetchEvents = async () => {
    try {
      const startDate = startOfWeek(new Date())
      const endDate = addWeeks(startDate, weeksToShow)

      let query = supabase
        .from('event_occurrences')
        .select(`
          id,
          event_id,
          occurrence_date,
          status,
          is_themed,
          theme_name,
          theme_description,
          events (
            event_type,
            start_time,
            day_of_week,
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

      // Filter by provider if not admin
      if (isProvider && providerId) {
        query = query.eq('events.provider_id', providerId)
      }

      const { data } = await query
      setEvents(data || [])
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
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-yellow-100 text-yellow-800'
    }
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
          <h1 className="text-2xl font-bold text-gray-900">Events</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage your upcoming trivia events
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none space-x-3">
          <select
            value={weeksToShow}
            onChange={(e) => setWeeksToShow(Number(e.target.value))}
            className="rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
          >
            <option value={2}>Next 2 weeks</option>
            <option value={4}>Next 4 weeks</option>
            <option value={8}>Next 8 weeks</option>
          </select>
          <button
            type="button"
            onClick={() => setShowAddThemed(true)}
            className="inline-flex items-center rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Themed Event
          </button>
        </div>
      </div>

      {/* Events List */}
      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Event
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Venue
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {events.map((event) => (
                    <tr key={event.id} className={event.is_themed ? 'bg-blue-50' : ''}>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <div className="flex items-center">
                          <div>
                            <div className="font-medium text-gray-900">
                              {event.is_themed && event.theme_name ? event.theme_name : event.event.event_type}
                            </div>
                            {event.is_themed && event.theme_description && (
                              <div className="text-gray-500 text-xs">{event.theme_description}</div>
                            )}
                            {isAdmin && event.event.trivia_provider && (
                              <div className="text-gray-500 text-xs">{event.event.trivia_provider.name}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                          <div>
                            <div className="font-medium">
                              {event.event.venue.google_name || event.event.venue.name_original}
                            </div>
                            {event.event.venue.google_formatted_address && (
                              <div className="text-gray-500 text-xs">
                                {event.event.venue.google_formatted_address}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                          <div>
                            <div className="font-medium">
                              {format(new Date(event.occurrence_date), 'EEEE, MMM d')}
                            </div>
                            <div className="text-gray-500 text-xs">
                              {event.event.start_time}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <div className="flex items-center">
                          {getStatusIcon(event.status)}
                          <span className={`ml-2 inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getStatusColor(event.status)}`}>
                            {event.status}
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                        {event.status === 'scheduled' && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => updateEventStatus(event.id, 'confirmed')}
                              className="text-green-600 hover:text-green-900"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => updateEventStatus(event.id, 'cancelled')}
                              className="text-red-600 hover:text-red-900"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                        {event.status === 'cancelled' && (
                          <button
                            onClick={() => updateEventStatus(event.id, 'scheduled')}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Reschedule
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {events.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No events</h3>
          <p className="mt-1 text-sm text-gray-500">
            No events found for the selected time period.
          </p>
        </div>
      )}
    </div>
  )
}