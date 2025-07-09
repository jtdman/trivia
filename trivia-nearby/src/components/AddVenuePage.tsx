import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import VenueForm from './VenueForm'

const AddVenuePage: React.FC = () => {
  const navigate = useNavigate()

  const handleCancel = () => {
    navigate('/admin/venues')
  }

  const handleSuccess = () => {
    navigate('/admin/venues')
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <button
          onClick={() => navigate('/admin/venues')}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Venues
        </button>
      </div>

      <VenueForm
        mode="create"
        onCancel={handleCancel}
        onSuccess={handleSuccess}
      />
    </div>
  )
}

export default AddVenuePage