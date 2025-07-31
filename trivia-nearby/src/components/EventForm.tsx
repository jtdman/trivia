import React, { useState, useEffect } from 'react'
import { Calendar, Clock, MapPin, DollarSign, Users, Save, X, Loader2, Building } from 'lucide-react'
import { supabase, type Event, type Venue, type TriviaProvider } from '../lib/supabase'
import { useAuth } from '../context/auth_context_simple'

interface EventFormProps {
  mode: 'create' | 'edit'
  eventId?: string
  initialData?: Event & { venue?: Venue }
  preselectedVenueId?: string
  onCancel: () => void
  onSuccess: () => void
}

const EventForm: React.FC<EventFormProps> = ({
  mode,
  eventId,
  initialData,
  preselectedVenueId,
  onCancel,
  onSuccess
}) => {
  const { user, isGodAdmin } = useAuth()
  const [loading, setLoading] = useState(false)
  const [venuesLoading, setVenuesLoading] = useState(false)
  const [providersLoading, setProvidersLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [venues, setVenues] = useState<Venue[]>([])
  const [providers, setProviders] = useState<TriviaProvider[]>([])

  const [formData, setFormData] = useState({
    venue_id: preselectedVenueId || initialData?.venue_id || '',
    provider_id: initialData?.provider_id || '',
    event_type: initialData?.event_type || '',
    day_of_week: initialData?.day_of_week || '',
    start_time: initialData?.start_time || '',
    end_time: initialData?.end_time || '',
    frequency: initialData?.frequency || 'weekly' as 'weekly' | 'monthly' | 'one-time',
    prize_amount: initialData?.prize_amount || '',
    prize_description: initialData?.prize_description || '',
    max_teams: initialData?.max_teams || '',
    is_active: initialData?.is_active ?? true
  })

  useEffect(() => {
    fetchVenues()
    fetchProviders()
  }, [])

  const fetchVenues = async () => {
    try {
      setVenuesLoading(true)
      let query = supabase.from('venues').select('*').order('name_original')

      // If not platform admin, only show venues user has access to
      if (!isGodAdmin) {
        query = query.or(`created_by.eq.${user?.id},id.in.(${await getUserVenueIds()})`)
      }

      const { data, error } = await query
      if (error) throw error
      setVenues(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setVenuesLoading(false)
    }
  }

  const getUserVenueIds = async (): Promise<string> => {
    if (!user?.id) return ''
    const { data } = await supabase
      .from('user_venues')
      .select('venue_id')
      .eq('user_id', user.id)
    return data?.map(uv => uv.venue_id).join(',') || ''
  }

  const fetchProviders = async () => {
    try {
      setProvidersLoading(true)
      const { data, error } = await supabase
        .from('trivia_providers')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      
      // Add "Self-hosted" option at the beginning
      const providersWithSelfHosted = [
        {
          id: 'self-hosted',
          name: 'Self-hosted',
          website: null,
          phone: null,
          email: null,
          is_active: true,
          created_at: '',
          updated_at: ''
        },
        ...(data || [])
      ]
      
      setProviders(providersWithSelfHosted)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setProvidersLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const eventData = {
        ...formData,
        provider_id: formData.provider_id === 'self-hosted' ? null : formData.provider_id || null,
        prize_amount: formData.prize_amount ? parseFloat(formData.prize_amount.toString()) : null,
        max_teams: formData.max_teams ? parseInt(formData.max_teams.toString()) : null,
        end_time: formData.end_time || null
      }

      if (mode === 'create') {
        const { error: insertError } = await supabase
          .from('events')
          .insert([eventData])

        if (insertError) throw insertError
      } else if (mode === 'edit' && eventId) {
        const { error: updateError } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', eventId)

        if (updateError) throw updateError
      }

      onSuccess()
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {mode === 'create' ? 'Add New Event' : 'Edit Event'}
        </h2>
        <button
          onClick={onCancel}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Venue Selection */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <MapPin className="inline w-4 h-4 mr-1" />
              Venue *
            </label>
            <select
              name="venue_id"
              value={formData.venue_id}
              onChange={handleInputChange}
              required
              disabled={venuesLoading || !!preselectedVenueId}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800"
            >
              <option value="">Select a venue...</option>
              {venues.map((venue) => (
                <option key={venue.id} value={venue.id}>
                  {venue.google_name || venue.name_original}
                </option>
              ))}
            </select>
          </div>

          {/* Provider */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Building className="inline w-4 h-4 mr-1" />
              Trivia Provider *
            </label>
            <select
              name="provider_id"
              value={formData.provider_id}
              onChange={handleInputChange}
              required
              disabled={providersLoading}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800"
            >
              <option value="">Select provider...</option>
              {providers.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.name}
                </option>
              ))}
            </select>
          </div>

          {/* Event Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Event Type *
            </label>
            <input
              type="text"
              name="event_type"
              value={formData.event_type}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="e.g., General Trivia, Music Trivia"
            />
          </div>

          {/* Day of Week */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Calendar className="inline w-4 h-4 mr-1" />
              Day of Week *
            </label>
            <select
              name="day_of_week"
              value={formData.day_of_week}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Select day...</option>
              <option value="Monday">Monday</option>
              <option value="Tuesday">Tuesday</option>
              <option value="Wednesday">Wednesday</option>
              <option value="Thursday">Thursday</option>
              <option value="Friday">Friday</option>
              <option value="Saturday">Saturday</option>
              <option value="Sunday">Sunday</option>
            </select>
          </div>

          {/* Start Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Clock className="inline w-4 h-4 mr-1" />
              Start Time *
            </label>
            <input
              type="time"
              name="start_time"
              value={formData.start_time}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* End Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Clock className="inline w-4 h-4 mr-1" />
              End Time
            </label>
            <input
              type="time"
              name="end_time"
              value={formData.end_time}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Frequency *
            </label>
            <select
              name="frequency"
              value={formData.frequency}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="one-time">One-time</option>
            </select>
          </div>

          {/* Prize Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <DollarSign className="inline w-4 h-4 mr-1" />
              Prize Amount
            </label>
            <input
              type="number"
              name="prize_amount"
              value={formData.prize_amount}
              onChange={handleInputChange}
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="0.00"
            />
          </div>

          {/* Max Teams */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Users className="inline w-4 h-4 mr-1" />
              Max Teams
            </label>
            <input
              type="number"
              name="max_teams"
              value={formData.max_teams}
              onChange={handleInputChange}
              min="1"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="No limit"
            />
          </div>

          {/* Prize Description */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Prize Description
            </label>
            <textarea
              name="prize_description"
              value={formData.prize_description}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Describe the prizes or rewards..."
            />
          </div>

          {/* Is Active */}
          <div className="md:col-span-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleInputChange}
                className="w-4 h-4 text-purple-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-purple-500"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Event is active and visible to users
              </span>
            </label>
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
            {mode === 'create' ? 'Create Event' : 'Update Event'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default EventForm