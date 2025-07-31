import React, { createContext, useContext, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { UserProfile } from '../lib/supabase'

interface AuthContextType {
  user: User | null
  userProfile: UserProfile | null
  loading: boolean
  isAdmin: boolean
  supabase: typeof supabase
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, displayName?: string) => Promise<any>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    // Check for existing session
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!mounted) return
        
        setUser(session?.user ?? null)
        if (session?.user) {
          await fetchUserProfile(session.user.id)
        }
      } catch (error) {
        console.error('Error getting session:', error)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return
      
      setUser(session?.user ?? null)
      if (session?.user) {
        await fetchUserProfile(session.user.id)
      } else {
        setUserProfile(null)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const fetchUserProfile = async (userId: string) => {
    try {
      console.log('Fetching user profile for userId:', userId)
      
      // For the admin user, create a profile if it doesn't exist
      if (userId === '8600177e-3e85-426a-b3b6-b760abaf983b') {
        console.log('Setting hardcoded admin profile for known admin user')
        setUserProfile({
          id: userId,
          display_name: 'Jason (Admin)',
          role: 'admin' as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        return
      }
      
      // Try to get existing profile from user_profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      console.log('Profile query result:', { data: profileData, error: profileError })

      if (profileData) {
        setUserProfile(profileData)
        return
      }

      // Check if user is in admin_users table
      const { data: adminData, error: adminError } = await supabase
        .from('admin_users')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle()

      console.log('Admin users query result:', { data: adminData, error: adminError })

      if (adminData) {
        // Create profile for admin user
        const adminProfile: UserProfile = {
          id: userId,
          display_name: 'Admin User',
          role: adminData.role === 'god' || adminData.role === 'god_admin' ? 'admin' : 'venue_owner',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        
        // Try to insert the profile (ignore errors if it already exists)
        const { error: insertError } = await supabase
          .from('user_profiles')
          .insert(adminProfile)

        if (insertError) {
          console.warn('Could not insert user profile:', insertError)
        }

        setUserProfile(adminProfile)
        return
      }

      // Default to venue_owner role for other authenticated users
      const defaultProfile: UserProfile = {
        id: userId,
        display_name: 'User',
        role: 'venue_owner' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      setUserProfile(defaultProfile)
      
    } catch (error) {
      console.error('Error fetching user profile:', error)
      // Fallback profile
      setUserProfile({
        id: userId,
        display_name: 'User',
        role: 'venue_owner' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    }
  }

  const signIn = async (email: string, password: string) => {
    console.log('Attempting to sign in with email:', email)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      console.error('Sign in error:', error)
      throw error
    }
    console.log('Sign in successful')
  }

  const signUp = async (email: string, password: string, displayName?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: displayName
        }
      }
    })
    if (error) throw error
    return data
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setUserProfile(null)
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/admin/reset-password`
    })
    if (error) throw error
  }

  const isAdmin = userProfile?.role === 'admin'

  const value = {
    user,
    userProfile,
    loading,
    isAdmin,
    supabase,
    signIn,
    signUp,
    signOut,
    resetPassword
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}