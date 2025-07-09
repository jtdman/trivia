import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2, AlertCircle, Trash2 } from 'lucide-react'
import VenueForm from './VenueForm'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/auth_context'

interface VenueData {
  id: string
  name_original: string
  address_original: string
  google_place_id?: string
  google_name?: string
  google_formatted_address?: string
  google_phone_number?: string
  google_website?: string
  verification_status: string
}

const EditVenuePage: React.FC = () => {
  const { venueId } = useParams<{ venueId: string }>()
  const navigate = useNavigate()
  const { userProfile } = useAuth()
  const [venue, setVenue] = useState<VenueData | null>(null)
  const [userOwnsVenue, setUserOwnsVenue] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (venueId) {
      fetchVenue()
    }
  }, [venueId])

  const fetchVenue = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('venues')
        .select('*')
        .eq('id', venueId)
        .single()

      if (error) throw error
      setVenue(data)

      // Check if user owns this venue
      if (userProfile?.id) {
        const { data: userVenueData } = await supabase
          .from('user_venues')
          .select('*')
          .eq('venue_id', venueId)
          .eq('user_id', userProfile.id)
          .single()

        setUserOwnsVenue(!!userVenueData || data.created_by === userProfile.id)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!venueId) return
    
    try {
      setDeleting(true)
      
      // Delete related user_venues first
      const { error: userVenuesError } = await supabase
        .from('user_venues')
        .delete()
        .eq('venue_id', venueId)

      if (userVenuesError) throw userVenuesError

      // Delete related events
      const { error: eventsError } = await supabase
        .from('events')
        .delete()
        .eq('venue_id', venueId)

      if (eventsError) throw eventsError

      // Delete the venue
      const { error: venueError } = await supabase
        .from('venues')
        .delete()
        .eq('id', venueId)

      if (venueError) throw venueError

      navigate('/admin/venues')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const handleCancel = () => {
    navigate('/admin/venues')
  }

  const handleSuccess = () => {
    navigate('/admin/venues')
  }

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
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
                Error loading venue
              </h3>
              <p className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!venue) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Venue not found</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            The venue you're looking for doesn't exist or you don't have permission to view it.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => navigate('/admin/venues')}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Venues
        </button>

        {/* Delete button - only show for platform_admin or if user owns this venue */}
        {userProfile?.role === 'platform_admin' && (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 border border-red-300 dark:border-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete Venue
          </button>
        )}
      </div>

      <VenueForm
        mode="edit"
        venueId={venueId}
        initialData={venue}
        userOwnsVenue={userOwnsVenue}
        onCancel={handleCancel}
        onSuccess={handleSuccess}
      />

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Delete Venue
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete "{venue.google_name || venue.name_original}"? 
              This will also delete all associated events and cannot be undone.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white rounded-lg transition-colors"
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EditVenuePage