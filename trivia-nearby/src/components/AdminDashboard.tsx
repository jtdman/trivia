import React from 'react'
import { useAuth } from '../context/auth_context'
import { MapPin, Calendar, Users, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'

const AdminDashboard: React.FC = () => {
  const { userProfile } = useAuth()

  // Placeholder stats - these would come from the database
  const stats = {
    venues: 0,
    events: 0,
    activeEvents: 0,
    teamMembers: 1
  }

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
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Venues</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.venues}</p>
            </div>
            <MapPin className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Events</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.events}</p>
            </div>
            <Calendar className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Events</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.activeEvents}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </div>

        {(userProfile?.role === 'admin' || userProfile?.role === 'trivia_host') && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Team Members</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.teamMembers}</p>
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

      {/* Getting started guide for new users */}
      {stats.venues === 0 && (
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