import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { 
  Search, 
  MapPin, 
  Plus, 
  Edit3, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  ExternalLink,
  Filter
} from 'lucide-react'

interface Venue {
  id: string
  name_original: string
  address_original: string
  google_name?: string
  google_formatted_address?: string
  google_phone_number?: string
  google_website?: string
  google_rating?: number
  verification_status: 'pending' | 'verified' | 'failed' | 'needs_review'
  created_at: string
  updated_at: string
  events_count?: number
}

const VenuesList: React.FC = () => {
  // const { userProfile } = useAuth() // TODO: Use for user-specific venue filtering
  const [venues, setVenues] = useState<Venue[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchVenues()
  }, [])

  const fetchVenues = async () => {
    try {
      setLoading(true)
      
      // Get venues with event counts
      const { data, error } = await supabase
        .from('venues')
        .select(`
          *,
          events!inner(count)
        `)
        .order('updated_at', { ascending: false })

      if (error) throw error

      // Process the data to get event counts
      const venuesWithCounts = data?.map(venue => ({
        ...venue,
        events_count: venue.events?.length || 0
      })) || []

      setVenues(venuesWithCounts)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const filteredVenues = venues.filter(venue => {
    const matchesSearch = 
      venue.name_original.toLowerCase().includes(searchTerm.toLowerCase()) ||
      venue.address_original.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (venue.google_name && venue.google_name.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesStatus = statusFilter === 'all' || venue.verification_status === statusFilter

    return matchesSearch && matchesStatus
  })

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

  const getStatusText = (status: string) => {
    switch (status) {
      case 'verified': return 'Verified'
      case 'pending': return 'Pending'
      case 'failed': return 'Failed'
      case 'needs_review': return 'Needs Review'
      default: return 'Unknown'
    }
  }

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Venues
          </h1>
          <Link
            to="/admin/venues/new"
            className="inline-flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Venue
          </Link>
        </div>
        
        <p className="text-gray-600 dark:text-gray-400">
          Manage your trivia venues and their information
        </p>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search venues..."
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
            className="pl-10 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Status</option>
            <option value="verified">Verified</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="needs_review">Needs Review</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{venues.length}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Venues</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-green-600">{venues.filter(v => v.verification_status === 'verified').length}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Verified</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-yellow-600">{venues.filter(v => v.verification_status === 'pending').length}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Pending</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{venues.reduce((sum, v) => sum + (v.events_count || 0), 0)}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Events</div>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center gap-2 text-red-600 dark:text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Venues Grid */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Venue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Events
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredVenues.map((venue) => (
                <tr key={venue.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {venue.google_name || venue.name_original}
                      </div>
                      {venue.google_name && venue.google_name !== venue.name_original && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Originally: {venue.name_original}
                        </div>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {venue.google_formatted_address || venue.address_original}
                    </div>
                    {venue.google_phone_number && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {venue.google_phone_number}
                      </div>
                    )}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(venue.verification_status)}
                      <span className="text-sm text-gray-900 dark:text-white">
                        {getStatusText(venue.verification_status)}
                      </span>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900 dark:text-white">
                      {venue.events_count || 0} events
                    </span>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/admin/venues/${venue.id}`}
                        className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300"
                      >
                        <Edit3 className="w-4 h-4" />
                      </Link>
                      {venue.google_website && (
                        <a
                          href={venue.google_website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredVenues.length === 0 && !loading && (
          <div className="text-center py-12">
            <MapPin className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No venues found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filters.' 
                : 'Get started by adding your first venue.'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default VenuesList