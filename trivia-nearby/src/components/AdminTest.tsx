import React from 'react'
import { useAuth } from '../context/auth_context'

const AdminTest: React.FC = () => {
  const { user, userProfile, loading } = useAuth()

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Admin Route Test</h1>
      <div className="space-y-2">
        <p><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</p>
        <p><strong>User:</strong> {user ? user.email : 'None'}</p>
        <p><strong>Profile:</strong> {userProfile ? JSON.stringify(userProfile) : 'None'}</p>
        <p><strong>Role:</strong> {userProfile?.role || 'No role'}</p>
      </div>
    </div>
  )
}

export default AdminTest