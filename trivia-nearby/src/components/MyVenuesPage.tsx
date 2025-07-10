import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Calendar, TrendingUp, Edit3, Plus, UserCheck, AlertCircle, CheckCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/auth_context'

interface MyVenue {
  id: string
  name_original: string
  google_name?: string
  address_original: string
  google_formatted_address?: string
  verification_status: string
  event_count: number
  active_events: number
  claimed_at: string
  role: string
}

const MyVenuesPage: React.FC = () => {
  const { userProfile } = useAuth()
  const [venues, setVenues] = useState<MyVenue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchMyVenues()
  }, [])

  const fetchMyVenues = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('user_venues')
        .select(`
          role,
          granted_at,
          venue:venues (
            id,
            name_original,
            google_name,
            address_original,
            google_formatted_address,
            verification_status,
            events (
              id,
              is_active
            )
          )
        `)
        .eq('user_id', userProfile?.id)
        .order('granted_at', { ascending: false })

      if (error) throw error

      const processedVenues = (data || []).map(item => ({
        ...item.venue,
        role: item.role,
        claimed_at: item.granted_at,
        event_count: item.venue.events?.length || 0,
        active_events: item.venue.events?.filter(e => e.is_active).length || 0
      }))

      setVenues(processedVenues)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'pending':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />
    }
  }

  const totalStats = venues.reduce((acc, venue) => ({
    totalEvents: acc.totalEvents + venue.event_count,
    activeEvents: acc.activeEvents + venue.active_events,
    verifiedVenues: acc.verifiedVenues + (venue.verification_status === 'verified' ? 1 : 0)
  }), { totalEvents: 0, activeEvents: 0, verifiedVenues: 0 })

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          My Venues
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your claimed venues and their trivia events
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">My Venues</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{venues.length}</p>
            </div>
            <MapPin className="w-8 h-8 text-purple-500" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Events</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{totalStats.totalEvents}</p>
            </div>
            <Calendar className="w-8 h-8 text-purple-500" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Events</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{totalStats.activeEvents}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Verified</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{totalStats.verifiedVenues}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            to="/admin/venues/claim"
            className="flex items-center gap-3 p-4 border-2 border-dashed border-purple-300 dark:border-purple-600 rounded-lg hover:border-purple-500 dark:hover:border-purple-400 transition-colors"
          >
            <UserCheck className="w-6 h-6 text-purple-500" />
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">Claim Another Venue</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Find and claim more venues you manage</p>
            </div>
          </Link>
          
          <Link
            to="/admin/venues/new"
            className="flex items-center gap-3 p-4 border-2 border-dashed border-purple-300 dark:border-purple-600 rounded-lg hover:border-purple-500 dark:hover:border-purple-400 transition-colors"
          >
            <Plus className="w-6 h-6 text-purple-500" />
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">Add New Venue</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Create a new venue listing</p>
            </div>
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-800 dark:text-red-200">{error}</span>
          </div>
        </div>
      )}

      {/* Venues List */}
      {venues.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {venues.map((venue) => (
            <div key={venue.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                    {venue.google_name || venue.name_original}
                  </h3>
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusIcon(venue.verification_status)}
                    <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                      {venue.verification_status}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">•</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                      {venue.role}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link
                    to={`/admin/venues/${venue.id}/detail`}
                    className="p-2 text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
                  >
                    <Calendar className="w-4 h-4" />
                  </Link>
                  <Link
                    to={`/admin/venues/${venue.id}/edit`}
                    className="p-2 text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
                  >
                    <Edit3 className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-4">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">
                  {venue.google_formatted_address || venue.address_original}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {venue.event_count}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Events</div>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {venue.active_events}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Active Events</div>
                </div>
              </div>

              <div className="text-xs text-gray-500 dark:text-gray-400">
                Claimed {new Date(venue.claimed_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
          <UserCheck className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No venues claimed yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Start by claiming venues you own or manage to control their trivia listings.
          </p>
          <Link
            to="/admin/venues/claim"
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
          >
            <UserCheck className="w-5 h-5" />
            Claim Your First Venue
          </Link>
        </div>
      )}
    </div>
  )
}

export default MyVenuesPage