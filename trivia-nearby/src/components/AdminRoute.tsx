import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/auth_context'
import { Loader2 } from 'lucide-react'

interface AdminRouteProps {
  children: React.ReactNode
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user, userProfile, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />
  }

  // Allow access for admin, trivia_host, or venue_owner roles
  if (!userProfile || !userProfile.role || !['admin', 'trivia_host', 'venue_owner'].includes(userProfile.role)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

export default AdminRoute