import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Save, X, Loader2, Lock, AlertTriangle } from 'lucide-react'
import { supabase, Venue } from '../lib/supabase'
import { useAuth } from '../context/auth_context'
import { useVenuePermissions } from '../hooks/useVenuePermissions'

interface VenueFormProps {
  mode: 'create' | 'edit'
  venueId?: string
  initialData?: Venue
  userOwnsVenue?: boolean
  onCancel: () => void
  onSuccess: () => void
}

const VenueForm: React.FC<VenueFormProps> = ({
  mode,
  venueId,
  initialData,
  userOwnsVenue = false,
  onCancel,
  onSuccess
}) => {
  const navigate = useNavigate()
  const { userProfile } = useAuth()
  const permissions = useVenuePermissions(initialData, userOwnsVenue)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    name_original: initialData?.name_original || '',
    address_original: initialData?.address_original || '',
    google_place_id: initialData?.google_place_id || '',
    google_name: initialData?.google_name || '',
    google_formatted_address: initialData?.google_formatted_address || '',
    google_phone_number: initialData?.google_phone_number || '',
    google_website: initialData?.google_website || ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (mode === 'create') {
        const { data, error: insertError } = await supabase
          .from('venues')
          .insert([{
            ...formData,
            verification_status: 'pending',
            is_imported: false,
            created_by: userProfile?.id
          }])
          .select()
          .single()

        if (insertError) throw insertError

        // If user is not platform_admin, create a user_venue relationship
        if (userProfile?.role !== 'platform_admin' && data) {
          const { error: relationError } = await supabase
            .from('user_venues')
            .insert([{
              user_id: userProfile?.id,
              venue_id: data.id,
              role: 'owner'
            }])

          if (relationError) throw relationError
        }
      } else if (mode === 'edit' && venueId) {
        // Only update fields user has permission to edit
        const updateData: any = {}
        
        if (permissions.canEditOriginalData) {
          updateData.name_original = formData.name_original
          updateData.address_original = formData.address_original
        }
        
        // Platform admin can update Google data only if verification failed/needs review
        if (permissions.canEditGoogleData) {
          updateData.google_place_id = formData.google_place_id
          updateData.google_name = formData.google_name
          updateData.google_formatted_address = formData.google_formatted_address
          updateData.google_phone_number = formData.google_phone_number
          updateData.google_website = formData.google_website
        }

        const { error: updateError } = await supabase
          .from('venues')
          .update(updateData)
          .eq('id', venueId)

        if (updateError) throw updateError
      }

      onSuccess()
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  // Check if user can edit this venue
  if (mode === 'edit' && !permissions.canEdit) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400 mb-4">
          <Lock className="w-6 h-6" />
          <h2 className="text-xl font-semibold">Access Restricted</h2>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {permissions.reason || 'You do not have permission to edit this venue.'}
        </p>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
        >
          Go Back
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {mode === 'create' ? 'Add New Venue' : 'Edit Venue'}
        </h2>
        <button
          onClick={onCancel}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Permission warning for protected data */}
      {mode === 'edit' && initialData?.is_imported && (
        <div className="mb-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Protected Venue Data
              </h3>
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                This venue was imported from existing data. Google Places information is read-only and can only be updated through verification.
                {!permissions.canEditOriginalData && ' Original venue data is also protected.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Original venue information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Original Information
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Venue Name *
                {mode === 'edit' && !permissions.canEditOriginalData && (
                  <Lock className="inline w-3 h-3 ml-1 text-gray-400" />
                )}
              </label>
              <input
                type="text"
                name="name_original"
                value={formData.name_original}
                onChange={handleInputChange}
                required
                disabled={mode === 'edit' && !permissions.canEditOriginalData}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-500"
                placeholder="Enter venue name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Address *
                {mode === 'edit' && !permissions.canEditOriginalData && (
                  <Lock className="inline w-3 h-3 ml-1 text-gray-400" />
                )}
              </label>
              <input
                type="text"
                name="address_original"
                value={formData.address_original}
                onChange={handleInputChange}
                required
                disabled={mode === 'edit' && !permissions.canEditOriginalData}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-500"
                placeholder="Enter venue address"
              />
            </div>
          </div>

          {/* Google Places information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Google Places Data
              </h3>
              <Lock className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              This information is automatically populated from Google Places API and cannot be edited manually.
            </p>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Google Place ID
              </label>
              <input
                type="text"
                name="google_place_id"
                value={formData.google_place_id}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                placeholder="Auto-populated from Google Places"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Google Name
              </label>
              <input
                type="text"
                name="google_name"
                value={formData.google_name}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                placeholder="Auto-populated from Google Places"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Google Address
              </label>
              <input
                type="text"
                name="google_formatted_address"
                value={formData.google_formatted_address}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                placeholder="Auto-populated from Google Places"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                name="google_phone_number"
                value={formData.google_phone_number}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                placeholder="Auto-populated from Google Places"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Website
              </label>
              <input
                type="url"
                name="google_website"
                value={formData.google_website}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                placeholder="Auto-populated from Google Places"
              />
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300 text-white rounded-lg transition-colors"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {mode === 'create' ? 'Create Venue' : 'Update Venue'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default VenueForm