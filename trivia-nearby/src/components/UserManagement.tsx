import React, { useState, useEffect } from 'react'
import { Shield, User, Edit3, Save, X, AlertCircle, CheckCircle } from 'lucide-react'
import { supabase, type UserWithEmail } from '../lib/supabase'
import { useAuth } from '../context/auth_context'

interface UserManagementProps {}

const UserManagement: React.FC<UserManagementProps> = () => {
  const { userProfile } = useAuth()
  const [users, setUsers] = useState<UserWithEmail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingUser, setEditingUser] = useState<string | null>(null)
  const [newRole, setNewRole] = useState<string>('')

  const roles = [
    { value: 'platform_admin', label: 'Platform Admin', color: 'text-red-600' },
    { value: 'trivia_host', label: 'Trivia Host', color: 'text-purple-600' },
    { value: 'venue_owner', label: 'Venue Owner', color: 'text-blue-600' },
    { value: 'staff', label: 'Staff', color: 'text-gray-600' }
  ]

  useEffect(() => {
    if (userProfile?.role === 'platform_admin') {
      fetchUsers()
    }
  }, [userProfile])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.rpc('list_all_users')

      if (error) throw error
      setUsers(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const updateUserRole = async (userId: string, role: string) => {
    try {
      setError(null)
      
      // Call the update_user_role function we created in the database
      const { error } = await supabase.rpc('update_user_role', {
        target_user_id: userId,
        new_role: role
      })

      if (error) throw error

      // Update local state
      setUsers(users.map(user => 
        user.id === userId 
          ? { ...user, role: role as any, updated_at: new Date().toISOString() }
          : user
      ))
      
      setEditingUser(null)
      setNewRole('')
    } catch (err: any) {
      setError(err.message)
    }
  }

  const startEdit = (user: UserWithEmail) => {
    setEditingUser(user.id)
    setNewRole(user.role)
  }

  const cancelEdit = () => {
    setEditingUser(null)
    setNewRole('')
  }

  const getRoleInfo = (role: string) => {
    return roles.find(r => r.value === role) || roles[3] // Default to staff
  }

  // Only platform admins can access this
  if (userProfile?.role !== 'platform_admin') {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle className="w-5 h-5" />
          <span>Access denied. Only platform administrators can manage users.</span>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <span className="ml-2">Loading users...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-600" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              User Management
            </h2>
          </div>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Manage user roles and permissions across the platform
          </p>
        </div>

        {error && (
          <div className="px-6 py-4 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {users.map((user) => (
            <div key={user.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {user.email}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      ID: {user.id.slice(0, 8)}...
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {editingUser === user.id ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value)}
                        className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm"
                      >
                        {roles.map((role) => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => updateUserRole(user.id, newRole)}
                        className="p-1 text-green-600 hover:text-green-700"
                        title="Save changes"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="p-1 text-gray-500 hover:text-gray-700"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 ${getRoleInfo(user.role).color}`}>
                        {getRoleInfo(user.role).label}
                      </span>
                      <button
                        onClick={() => startEdit(user)}
                        className="p-1 text-gray-500 hover:text-gray-700"
                        title="Edit role"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Created: {new Date(user.created_at).toLocaleDateString()} • 
                Updated: {new Date(user.updated_at).toLocaleDateString()}
              </div>
            </div>
          ))}

          {users.length === 0 && (
            <div className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
              No users found
            </div>
          )}
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm">
            <div className="font-medium text-blue-900 dark:text-blue-100">Role Descriptions</div>
            <ul className="mt-1 space-y-1 text-blue-800 dark:text-blue-200">
              <li><strong>Platform Admin:</strong> Full system access, can manage all users and settings</li>
              <li><strong>Trivia Host:</strong> Can manage events and some venue operations</li>
              <li><strong>Venue Owner:</strong> Can manage their own venues and events</li>
              <li><strong>Staff:</strong> Basic access for general users</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserManagement