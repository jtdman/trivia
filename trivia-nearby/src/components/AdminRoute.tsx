import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/auth_context'
import { Loader2 } from 'lucide-react'

interface AdminRouteProps {
  children: React.ReactNode
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user, userProfile, loading } = useAuth()

  console.log('AdminRoute - user:', user)
  console.log('AdminRoute - userProfile:', userProfile)
  console.log('AdminRoute - loading:', loading)

  // Show loading while authentication is being determined
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    )
  }

  // If no user, redirect to login
  if (!user) {
    console.log('No user found, redirecting to login')
    return <Navigate to="/admin/login" replace />
  }

  // If user exists but profile is still loading, show loading
  if (user && !userProfile) {
    console.log('User exists but profile not loaded yet, showing loading')
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    )
  }

  // Check if user has appropriate role
  const allowedRoles = ['platform_admin', 'trivia_host', 'venue_owner', 'staff']
  if (!userProfile?.role || !allowedRoles.includes(userProfile.role)) {
    console.log('User role check failed:', userProfile?.role, 'Allowed roles:', allowedRoles)
    return <Navigate to="/" replace />
  }

  console.log('AdminRoute - access granted')
  return <>{children}</>
}

export default AdminRoute