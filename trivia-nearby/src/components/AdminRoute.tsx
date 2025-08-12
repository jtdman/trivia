import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/auth_context'
import { Loader2 } from 'lucide-react'

interface AdminRouteProps {
  children: React.ReactNode
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user, loading, hasProviderAccess, provider, providers } = useAuth()

  console.log('AdminRoute check:', {
    user: user?.id,
    hasProviderAccess,
    provider: provider?.name,
    providersCount: providers.length,
    loading
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    )
  }

  if (!user) {
    console.log('No user, redirecting to login')
    return <Navigate to="/admin/login" replace />
  }

  // Simplified: just check if user has provider access
  if (!hasProviderAccess) {
    console.log('No provider access, denying access')
    return <Navigate to="/" replace />
  }

  console.log('Access granted')
  return <>{children}</>
}

export default AdminRoute