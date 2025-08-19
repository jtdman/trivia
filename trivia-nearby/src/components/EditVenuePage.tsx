import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2, AlertCircle, Trash2, Image, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
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
  google_photo_reference?: string
  thumbnail_url?: string
  verification_status: string
  status?: string
}

const EditVenuePage: React.FC = () => {
  const { venueId } = useParams<{ venueId: string }>()
  const navigate = useNavigate()
  const { user, hasProviderAccess } = useAuth()
  const [venue, setVenue] = useState<VenueData | null>(null)
  const [userOwnsVenue, setUserOwnsVenue] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [processingImage, setProcessingImage] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

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
      if (user?.id) {
        const { data: userVenueData } = await supabase
          .from('user_venues')
          .select('*')
          .eq('venue_id', venueId)
          .eq('user_id', user.id)
          .single()

        setUserOwnsVenue(!!userVenueData || data.created_by === user.id)
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

  const processVenueImage = async () => {
    if (!venue?.google_photo_reference || !venueId) return
    
    setProcessingImage(true)
    setError(null)
    
    try {
      console.log('Processing image for venue:', venueId)
      console.log('Photo reference:', venue.google_photo_reference)
      
      // Call the Edge Function to process this venue's image
      const response = await supabase.functions.invoke('process-venue-images', {
        body: { 
          venue_id: venueId,
          google_photo_reference: venue.google_photo_reference
        }
      })

      console.log('Edge Function response:', response)

      if (response.error) {
        console.error('Edge Function error:', response.error)
        throw new Error(`Edge Function error: ${response.error.message || response.error}`)
      }

      const data = response.data
      console.log('Response data:', data)
      
      if (data && data.success) {
        // Refresh venue data to show the new thumbnail_url
        await fetchVenue()
        console.log('Image processed successfully!')
      } else {
        throw new Error(data?.error || 'Image processing failed - unknown error')
      }
    } catch (err: any) {
      console.error('Process image error:', err)
      setError(`Failed to process image: ${err.message}`)
      alert(`Error: ${err.message}`)
    } finally {
      setProcessingImage(false)
    }
  }

  const updateVenueStatus = async (newStatus: 'approved' | 'rejected' | 'pending') => {
    if (!venueId) return
    
    setUpdatingStatus(true)
    setError(null)
    
    try {
      // Use a simpler update that only changes verification_status to avoid policy conflicts
      const updateData = {
        verification_status: newStatus === 'approved' ? 'verified' : newStatus,
        updated_at: new Date().toISOString()
      }

      console.log('Updating venue with data:', updateData)

      const { error } = await supabase
        .from('venues')
        .update(updateData)
        .eq('id', venueId)

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      // Refresh venue data
      await fetchVenue()
      
      // Show success message
      const statusText = newStatus === 'approved' ? 'approved' : 
                        newStatus === 'rejected' ? 'rejected' : 
                        'marked as pending'
      setSuccessMessage(`Venue ${statusText} successfully!`)
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000)
      
      console.log(`Venue ${newStatus} successfully!`)
    } catch (err: any) {
      console.error('Failed to update venue status:', err)
      setError(`Failed to update status: ${err.message}`)
    } finally {
      setUpdatingStatus(false)
    }
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

        {/* Delete button - only show for admins */}
        {hasProviderAccess && (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 border border-red-300 dark:border-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete Venue
          </button>
        )}
      </div>

      {/* Admin Actions */}
      {hasProviderAccess && (
        <div className="mb-6 space-y-4">
          {/* Status Management */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Admin Actions</h3>
            
            {/* Current Status */}
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Current Status:</p>
              <div className="flex items-center gap-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  venue.verification_status === 'verified' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                    : venue.verification_status === 'needs_review'
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                    : venue.verification_status === 'failed'
                    ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                }`}>
                  {venue.verification_status}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  venue.status === 'approved' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                    : venue.status === 'rejected'
                    ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                }`}>
                  {venue.status || 'pending'}
                </span>
              </div>
            </div>

            {/* Success Message */}
            {successMessage && (
              <div className="mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                <span className="text-green-800 dark:text-green-200">{successMessage}</span>
              </div>
            )}

            {/* Approval Actions - Show appropriate buttons based on current status */}
            <div className="flex gap-2 mb-4">
              {venue.verification_status !== 'verified' && (
                <button
                  onClick={() => updateVenueStatus('approved')}
                  disabled={updatingStatus}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white rounded-lg transition-colors"
                >
                  {updatingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Approve Venue
                </button>
              )}
              
              {venue.verification_status !== 'rejected' && (
                <button
                  onClick={() => updateVenueStatus('rejected')}
                  disabled={updatingStatus}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white rounded-lg transition-colors"
                >
                  {updatingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  Reject Venue
                </button>
              )}
              
              {venue.verification_status === 'verified' || venue.verification_status === 'rejected' ? (
                <button
                  onClick={() => updateVenueStatus('pending')}
                  disabled={updatingStatus}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white rounded-lg transition-colors"
                >
                  {updatingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Reset to Pending
                </button>
              ) : null}
            </div>

            {/* Image Processing */}
            {venue.google_photo_reference && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Image Status:</p>
                <div className="flex items-center gap-4 mb-3">
                  {venue.thumbnail_url ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <Image className="w-5 h-5" />
                      <span className="text-sm">Image Processed</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-yellow-600">
                      <AlertCircle className="w-5 h-5" />
                      <span className="text-sm">Image Not Processed</span>
                    </div>
                  )}
                </div>
                
                {!venue.thumbnail_url && (
                  <button
                    onClick={processVenueImage}
                    disabled={processingImage}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white rounded-lg transition-colors"
                  >
                    {processingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Image className="w-4 h-4" />}
                    Process Image
                  </button>
                )}
                
                {venue.thumbnail_url && (
                  <div className="mt-3">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Thumbnail Preview:</p>
                    <img 
                      src={venue.thumbnail_url} 
                      alt={venue.name_original}
                      className="w-32 h-24 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <VenueForm
        mode="edit"
        venueId={venueId}
        initialData={venue as any}
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