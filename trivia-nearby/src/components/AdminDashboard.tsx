import React from 'react'
import { useAuth } from '../context/auth_context'
import { MapPin, Calendar, Users, TrendingUp, Loader2, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAdminStats } from '../hooks/useAdminStats'

const AdminDashboard: React.FC = () => {
  const { userProfile } = useAuth()
  const { stats, loading, error } = useAdminStats()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex">
            <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                Error loading dashboard
              </h3>
              <p className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Welcome back{userProfile?.display_name ? `, ${userProfile.display_name}` : ''}!
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Manage your trivia venues and events from one place.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Venues */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {userProfile?.role === 'platform_admin' ? 'Total Venues' : 'My Venues'}
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {userProfile?.role === 'platform_admin' ? stats.totalVenues : stats.myVenues}
              </p>
              {userProfile?.role === 'platform_admin' && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Platform-wide
                </p>
              )}
            </div>
            <MapPin className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        {/* Events */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {userProfile?.role === 'platform_admin' ? 'Total Events' : 'My Events'}
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {userProfile?.role === 'platform_admin' ? stats.totalEvents : stats.myEvents}
              </p>
              {userProfile?.role === 'platform_admin' && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Platform-wide
                </p>
              )}
            </div>
            <Calendar className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        {/* Active Events */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Events</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {userProfile?.role === 'platform_admin' ? stats.activeEvents : stats.myActiveEvents}
              </p>
              {userProfile?.role === 'platform_admin' && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Platform-wide
                </p>
              )}
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </div>

        {/* Team Members / System Users */}
        {(userProfile?.role === 'platform_admin' || userProfile?.role === 'trivia_host') && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {userProfile?.role === 'platform_admin' ? 'System Users' : 'Team Members'}
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.teamMembers}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {userProfile?.role === 'platform_admin' ? 'Active accounts' : 'Including yourself'}
                </p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            to="/admin/venues/new"
            className="flex items-center justify-center gap-2 bg-purple-500 hover:bg-purple-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            <MapPin className="w-5 h-5" />
            Add New Venue
          </Link>
          
          <Link
            to="/admin/events/new"
            className="flex items-center justify-center gap-2 bg-purple-500 hover:bg-purple-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            <Calendar className="w-5 h-5" />
            Add New Event
          </Link>

          <Link
            to="/admin/venues/claim"
            className="flex items-center justify-center gap-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            <MapPin className="w-5 h-5" />
            Claim Existing Venue
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {/* Recent Venues */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Venues</h3>
          {stats.recentVenues.length > 0 ? (
            <div className="space-y-3">
              {stats.recentVenues.map((venue) => (
                <div key={venue.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{venue.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(venue.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center">
                    {venue.verification_status === 'verified' && (
                      <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                    )}
                    {venue.verification_status === 'pending' && (
                      <Clock className="w-4 h-4 text-yellow-500 mr-1" />
                    )}
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300">
                      {venue.verification_status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              No venues yet. Add your first venue to get started!
            </p>
          )}
        </div>

        {/* Recent Events */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Events</h3>
          {stats.recentEvents.length > 0 ? (
            <div className="space-y-3">
              {stats.recentEvents.map((event) => (
                <div key={event.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{event.event_type}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{event.venue_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {event.day_of_week}s at {event.start_time.slice(0, 5)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(event.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              No events yet. Create your first event!
            </p>
          )}
        </div>
      </div>

      {/* Getting started guide for new users */}
      {stats.myVenues === 0 && (
        <div className="mt-8 bg-purple-50 dark:bg-purple-900/20 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-300 mb-2">
            Getting Started
          </h3>
          <ol className="space-y-2 text-purple-800 dark:text-purple-400">
            <li>1. Add your first venue or claim an existing one</li>
            <li>2. Create trivia events for your venues</li>
            <li>3. Manage your event schedule and details</li>
            <li>4. Track performance and attendance</li>
          </ol>
        </div>
      )}
    </div>
  )
}

export default AdminDashboard