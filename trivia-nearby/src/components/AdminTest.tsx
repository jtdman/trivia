import React from 'react'
import { useAuth } from '../context/auth_context_simple'

const AdminTest: React.FC = () => {
  const { user, isGodAdmin, userProvider, loading } = useAuth()

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Admin Route Test</h1>
      <div className="space-y-2">
        <p><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</p>
        <p><strong>User:</strong> {user ? user.email : 'None'}</p>
        <p><strong>Is God Admin:</strong> {isGodAdmin ? 'Yes' : 'No'}</p>
        <p><strong>User Provider:</strong> {userProvider ? JSON.stringify(userProvider) : 'None'}</p>
        <p><strong>User Metadata:</strong> {user?.user_metadata ? JSON.stringify(user.user_metadata) : 'None'}</p>
      </div>
    </div>
  )
}

export default AdminTest