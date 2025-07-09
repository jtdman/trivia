import React from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import EventForm from './EventForm'

const AddEventPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const venueId = searchParams.get('venue_id')

  const handleCancel = () => {
    navigate('/admin/events')
  }

  const handleSuccess = () => {
    navigate('/admin/events')
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <button
          onClick={() => navigate('/admin/events')}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Events
        </button>
      </div>

      <EventForm
        mode="create"
        preselectedVenueId={venueId || undefined}
        onCancel={handleCancel}
        onSuccess={handleSuccess}
      />
    </div>
  )
}

export default AddEventPage