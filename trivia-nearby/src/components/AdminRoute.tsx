import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/auth_context_simple'
import { Loader2 } from 'lucide-react'

interface AdminRouteProps {
  children: React.ReactNode
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user, loading, isGodAdmin, userProvider } = useAuth()

  console.log('AdminRoute - user:', user)
  console.log('AdminRoute - isGodAdmin:', isGodAdmin)
  console.log('AdminRoute - userProvider:', userProvider)
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

  // Allow access for god admin or users with a provider
  if (!isGodAdmin && !userProvider) {
    console.log('User has no admin access or provider')
    return <Navigate to="/" replace />
  }

  console.log('AdminRoute - access granted')
  return <>{children}</>
}

export default AdminRoute