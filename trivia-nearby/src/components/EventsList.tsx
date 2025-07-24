import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/auth_context_simple'
import { 
  Search, 
  Calendar, 
  Plus, 
  Edit3, 
  MapPin,
  Clock,
  DollarSign,
  Users,
  Filter,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react'

interface EventWithVenue {
  id: string
  venue_id: string
  event_type: string
  day_of_week: string
  start_time: string
  end_time?: string
  frequency: string
  prize_amount?: number
  prize_description?: string
  max_teams?: number
  is_active: boolean
  created_at: string
  updated_at: string
  venue: {
    id: string
    name_original: string
    google_name?: string
    address_original: string
    google_formatted_address?: string
  }
}

const EventsList: React.FC = () => {
  const { userProfile, isGodAdmin, userProvider } = useAuth()
  const [events, setEvents] = useState<EventWithVenue[]>([])
  const [providers, setProviders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dayFilter, setDayFilter] = useState<string>('all')
  const [providerFilter, setProviderFilter] = useState<string>('all')
  const [error, setError] = useState<string | null>(null)
  
  // Determine user type for role-specific UI
  const isProvider = !isGodAdmin && userProvider
  const isIndividualHost = !isGodAdmin && !userProvider

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    try {
      setLoading(true)
      
      let query = supabase
        .from('events')
        .select(`
          *,
          venue:venues!inner(
            id,
            name_original,
            google_name,
            address_original,
            google_formatted_address
          ),
          trivia_providers(
            id,
            name
          )
        `)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true })

      // If not god admin, only show events for venues user has access to
      if (!isGodAdmin) {
        const userVenueIds = await getUserVenueIds()
        if (userVenueIds.length > 0) {
          query = query.in('venue_id', userVenueIds)
        } else {
          // User has no venues, return empty
          setEvents([])
          return
        }
      }

      const { data, error } = await query
      if (error) throw error
      setEvents(data || [])
      
      // Extract unique providers from events for dropdown
      if (isGodAdmin && data) {
        const uniqueProviders = Array.from(
          new Map(
            data
              .filter(event => event.trivia_providers)
              .map(event => [event.trivia_providers.id, event.trivia_providers])
          ).values()
        ).sort((a, b) => a.name.localeCompare(b.name))
        
        setProviders(uniqueProviders)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getUserVenueIds = async (): Promise<string[]> => {
    if (!userProfile?.id) return []
    
    // Get venues user owns or manages
    const { data: userVenues } = await supabase
      .from('user_venues')
      .select('venue_id')
      .eq('user_id', userProfile.id)
    
    const { data: createdVenues } = await supabase
      .from('venues')
      .select('id')
      .eq('created_by', userProfile.id)
    
    const venueIds = [
      ...(userVenues?.map(uv => uv.venue_id) || []),
      ...(createdVenues?.map(v => v.id) || [])
    ]
    
    return [...new Set(venueIds)] // Remove duplicates
  }

  const filteredEvents = events.filter(event => {
    const matchesSearch = 
      event.event_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.venue.name_original.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (event.venue.google_name && event.venue.google_name.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && event.is_active) ||
      (statusFilter === 'inactive' && !event.is_active)

    const matchesDay = dayFilter === 'all' || event.day_of_week === dayFilter
    
    const matchesProvider = providerFilter === 'all' || 
      (event.trivia_providers?.id === providerFilter)

    return matchesSearch && matchesStatus && matchesDay && matchesProvider
  })

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

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {isGodAdmin ? 'All Events' : isProvider ? 'My Events' : 'My Events'}
            </h1>
            {isGodAdmin && (
              <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">
                Platform-wide view • {events.length} total events
              </p>
            )}
            {isProvider && userProvider && (
              <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                {userProvider.name} • {events.length} events
              </p>
            )}
            {isIndividualHost && (
              <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                Your trivia events • {events.length} events
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {isIndividualHost && (
              <button
                className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                <MapPin className="w-4 h-4" />
                Claim Venue
              </button>
            )}
            <Link
              to="/admin/events/new"
              className="inline-flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              {isIndividualHost ? 'Add Event' : 'Add Event'}
            </Link>
          </div>
        </div>
        
        <p className="text-gray-600 dark:text-gray-400">
          {isGodAdmin ? 'Manage all trivia events across providers' : 
           isProvider ? 'Manage your provider\'s events and schedules' :
           'Manage your personal trivia events'}
        </p>
      </div>

      {/* Search and Filters */}
      <div className={`mb-6 grid grid-cols-1 gap-4 ${isGodAdmin ? 'md:grid-cols-5' : 'md:grid-cols-4'}`}>
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search events or venues..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-10 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 w-full"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <select
            value={dayFilter}
            onChange={(e) => setDayFilter(e.target.value)}
            className="pl-10 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 w-full"
          >
            <option value="all">All Days</option>
            {dayOrder.map(day => (
              <option key={day} value={day}>{day}</option>
            ))}
          </select>
        </div>

        {isGodAdmin && (
          <div className="relative">
            <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <select
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 w-full"
            >
              <option value="all">All Providers</option>
              {providers.map(provider => (
                <option key={provider.id} value={provider.id}>{provider.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{events.length}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Events</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-green-600">{events.filter(e => e.is_active).length}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Active</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-red-600">{events.filter(e => !e.is_active).length}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Inactive</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {new Set(events.map(e => e.venue_id)).size}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Venues</div>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center gap-2 text-red-600 dark:text-red-400">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Events List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Event
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Venue
                </th>
                {isGodAdmin && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Provider
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Schedule
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredEvents.map((event) => (
                <tr key={event.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {event.event_type}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                      {event.frequency}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="text-sm text-gray-900 dark:text-white">
                          {event.venue.google_name || event.venue.name_original}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {event.venue.google_formatted_address || event.venue.address_original}
                        </div>
                      </div>
                    </div>
                  </td>
                  
                  {isGodAdmin && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {event.trivia_providers?.name || 'No Provider'}
                      </div>
                    </td>
                  )}
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="text-sm text-gray-900 dark:text-white">
                          {event.day_of_week}s
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTime(event.start_time)}
                          {event.end_time && ` - ${formatTime(event.end_time)}`}
                        </div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {event.prize_amount && (
                        <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                          <DollarSign className="w-3 h-3" />
                          ${event.prize_amount}
                        </div>
                      )}
                      {event.max_teams && (
                        <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                          <Users className="w-3 h-3" />
                          Max {event.max_teams} teams
                        </div>
                      )}
                      {event.prize_description && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-32">
                          {event.prize_description}
                        </div>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(event.is_active)}
                      <span className="text-sm text-gray-900 dark:text-white">
                        {event.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link
                      to={`/admin/events/${event.id}`}
                      className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300"
                    >
                      <Edit3 className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredEvents.length === 0 && !loading && (
          <div className="text-center py-12">
            <Calendar className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              {isIndividualHost ? 'No trivia events yet' : 'No events found'}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {searchTerm || statusFilter !== 'all' || dayFilter !== 'all' || providerFilter !== 'all'
                ? 'Try adjusting your search or filters.' 
                : isIndividualHost 
                  ? 'Ready to start hosting trivia? Add your first event or claim an existing venue.'
                  : 'Get started by adding your first event.'
              }
            </p>
            {isIndividualHost && !searchTerm && statusFilter === 'all' && dayFilter === 'all' && (
              <div className="mt-6 flex justify-center gap-3">
                <button className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg transition-colors">
                  <MapPin className="w-4 h-4" />
                  Claim Existing Venue
                </button>
                <Link
                  to="/admin/events/new"
                  className="inline-flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add New Event
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default EventsList