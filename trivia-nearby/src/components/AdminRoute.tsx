import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/auth_context'
import { Loader2 } from 'lucide-react'

interface AdminRouteProps {
  children: React.ReactNode
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user, userProfile, loading, isProviderAdmin, provider } = useAuth()

  console.log('AdminRoute check:', {
    user: user?.id,
    userProfile,
    isProviderAdmin,
    provider,
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

  // Allow access for admin, provider admins, trivia_host, or venue_owner roles
  if (!userProfile && !isProviderAdmin) {
    console.log('No profile and not provider admin, denying access')
    return <Navigate to="/" replace />
  }
  
  // Allow if user is admin, provider admin, or has specific roles
  const hasAccess = userProfile?.role === 'admin' || 
                    isProviderAdmin || 
                    (userProfile?.role && ['trivia_host', 'venue_owner', 'staff'].includes(userProfile.role))
  
  console.log('Access check:', {
    role: userProfile?.role,
    isProviderAdmin,
    hasAccess
  })
  
  if (!hasAccess) {
    console.log('Access denied')
    return <Navigate to="/" replace />
  }

  console.log('Access granted')
  return <>{children}</>
}

export default AdminRoute