import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/auth_context'
import { Loader2, AlertCircle } from 'lucide-react'

interface AdminRouteProps {
  children: React.ReactNode
}

const AdminRouteSimple: React.FC<AdminRouteProps> = ({ children }) => {
  const { user, userProfile, loading, isAdmin } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-black">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />
  }

  // Check if user has admin access
  if (!isAdmin && userProfile?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-black">
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500" />
          <h2 className="text-xl font-semibold text-black dark:text-white">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400">
            You don't have permission to access the admin panel. Please contact an administrator if you believe this is an error.
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="mt-4 bg-purple-500 hover:bg-purple-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export default AdminRouteSimple