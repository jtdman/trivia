import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/auth_simple'
import { Loader2 } from 'lucide-react'

interface AdminRouteProps {
  children: React.ReactNode
}

const AdminRouteSimple: React.FC<AdminRouteProps> = ({ children }) => {
  const { user, loading } = useAuth()

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

  // For now, allow any authenticated user - we'll add role checking later
  return <>{children}</>
}

export default AdminRouteSimple