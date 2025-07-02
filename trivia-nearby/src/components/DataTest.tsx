import React from 'react'
import { useVenues } from '../hooks/useVenues'
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'

const DataTest: React.FC = () => {
  const { venues, loading, error } = useVenues({ limit: 5 })

  if (loading) {
    return (
      <div className='p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg'>
        <div className='flex items-center gap-2'>
          <Loader2 className='w-4 h-4 animate-spin' />
          <span>Testing connection to database...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className='p-4 bg-red-50 dark:bg-red-900/20 rounded-lg'>
        <div className='flex items-center gap-2 text-red-600 dark:text-red-400'>
          <AlertCircle className='w-4 h-4' />
          <span>Database connection failed: {error}</span>
        </div>
      </div>
    )
  }

  return (
    <div className='p-4 bg-green-50 dark:bg-green-900/20 rounded-lg'>
      <div className='flex items-center gap-2 text-green-600 dark:text-green-400 mb-2'>
        <CheckCircle2 className='w-4 h-4' />
        <span>Database connected successfully!</span>
      </div>
      <div className='text-sm text-gray-600 dark:text-gray-400'>
        Found {venues.length} venues with events
      </div>
      {venues.length > 0 && (
        <div className='mt-2 text-xs text-gray-500'>
          Sample venue: {venues[0].google_name || venues[0].name_original}
        </div>
      )}
    </div>
  )
}

export default DataTest
