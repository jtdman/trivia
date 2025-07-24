import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { Calendar, MapPin, Users, CheckCircle, XCircle, Clock } from 'lucide-react'
import { format, addDays, startOfWeek } from 'date-fns'

interface WeeklyEvent {
  id: string
  event_id: string
  occurrence_date: string
  status: string
  event: {
    event_type: string
    start_time: string
    venue: {
      name_original: string
      google_name: string | null
    }
  }
}

export function Dashboard() {
  const { isAdmin, isProvider, providerId } = useAuth()
  const [weeklyEvents, setWeeklyEvents] = useState<WeeklyEvent[]>([])
  const [stats, setStats] = useState({
    totalEvents: 0,
    scheduledEvents: 0,
    confirmedEvents: 0,
    cancelledEvents: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [providerId])

  const fetchDashboardData = async () => {
    try {
      // Get this week's events
      const startDate = startOfWeek(new Date())
      const endDate = addDays(startDate, 6)

      let eventsQuery = supabase
        .from('event_occurrences')
        .select(`
          id,
          event_id,
          occurrence_date,
          status,
          events (
            event_type,
            start_time,
            venues (
              name_original,
              google_name
            )
          )
        `)
        .gte('occurrence_date', format(startDate, 'yyyy-MM-dd'))
        .lte('occurrence_date', format(endDate, 'yyyy-MM-dd'))

      // If provider user, filter by their provider
      if (isProvider && providerId) {
        eventsQuery = eventsQuery.eq('events.provider_id', providerId)
      }

      const { data: events } = await eventsQuery

      setWeeklyEvents(events || [])

      // Calculate stats
      const totalEvents = events?.length || 0
      const scheduledEvents = events?.filter(e => e.status === 'scheduled').length || 0
      const confirmedEvents = events?.filter(e => e.status === 'confirmed').length || 0
      const cancelledEvents = events?.filter(e => e.status === 'cancelled').length || 0

      setStats({
        totalEvents,
        scheduledEvents,
        confirmedEvents,
        cancelledEvents
      })

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
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

      // Refresh data
      fetchDashboardData()
    } catch (error) {
      console.error('Error updating event:', error)
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
      <div className="border-4 border-dashed border-gray-200 rounded-lg p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">
          Dashboard
          {isAdmin && <span className="ml-2 text-sm text-gray-500">(God Mode)</span>}
          {isProvider && <span className="ml-2 text-sm text-gray-500">(Provider View)</span>}
        </h1>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Calendar className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Events This Week
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.totalEvents}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Clock className="h-6 w-6 text-yellow-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Scheduled
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.scheduledEvents}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Confirmed
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.confirmedEvents}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <XCircle className="h-6 w-6 text-red-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Cancelled
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.cancelledEvents}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* This Week's Events */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              This Week's Events
            </h3>
            {weeklyEvents.length === 0 ? (
              <p className="text-gray-500">No events scheduled for this week.</p>
            ) : (
              <div className="space-y-4">
                {weeklyEvents.map((event) => (
                  <div key={event.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">
                          {event.event.event_type}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {event.event.venue.google_name || event.event.venue.name_original}
                        </p>
                        <p className="text-sm text-gray-500">
                          {format(new Date(event.occurrence_date), 'EEEE, MMMM d')} at {event.event.start_time}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          event.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                          event.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {event.status}
                        </span>
                        {event.status === 'scheduled' && (
                          <div className="space-x-2">
                            <button
                              onClick={() => updateEventStatus(event.id, 'confirmed')}
                              className="text-green-600 hover:text-green-800 text-sm font-medium"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => updateEventStatus(event.id, 'cancelled')}
                              className="text-red-600 hover:text-red-800 text-sm font-medium"
                            >
                              Cancel
                            </button>
                          </div>
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
    </div>
  )
}