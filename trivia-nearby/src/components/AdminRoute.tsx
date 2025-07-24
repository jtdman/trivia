import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/auth_context_simple'
import { Loader2 } from 'lucide-react'

interface AdminRouteProps {
  children: React.ReactNode
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user, loading, isGodAdmin, userProvider } = useAuth()

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
    return <Navigate to="/admin/login" replace />
  }

  // Allow access for god admin or users with a provider
  if (!isGodAdmin && !userProvider) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

export default AdminRoute