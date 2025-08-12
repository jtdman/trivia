import React, { createContext, useContext, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { UserProfile, TriviaProvider } from '../lib/supabase'

interface AuthContextType {
  user: User | null
  userProfile: UserProfile | null
  provider: TriviaProvider | null
  providers: TriviaProvider[]  // All providers for super admin
  loading: boolean
  hasProviderAccess: boolean   // Does user have any provider access?
  isSuperAdmin: boolean        // Super admin with platform-wide access
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
  const [provider, setProvider] = useState<TriviaProvider | null>(null)
  const [providers, setProviders] = useState<TriviaProvider[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    // Check for existing session
    const initializeAuth = async () => {
      try {
        console.log('Auth context: Getting session...')
        const { data: { session } } = await supabase.auth.getSession()
        console.log('Auth context: Session retrieved:', session?.user?.id)
        
        if (!mounted) return
        
        setUser(session?.user ?? null)
        if (session?.user) {
          console.log('Auth context: Fetching user profile...')
          await fetchUserProfile(session.user.id)
          console.log('Auth context: Profile fetch complete')
        }
      } catch (error) {
        console.error('Error getting session:', error)
      } finally {
        if (mounted) {
          console.log('Auth context: Setting loading to false')
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
        setProvider(null)
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
      setProvider(null) // Reset provider initially
      
      // TEMPORARY: Use hardcoded data for all known users to bypass DB issues
      const knownUsers: Record<string, any> = {
        '8600177e-3e85-426a-b3b6-b760abaf983b': {
          profile: {
            id: '8600177e-3e85-426a-b3b6-b760abaf983b',
            display_name: 'Jason (Super Admin)',
            role: 'super_admin' as const,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          provider: null,
          isSuperAdmin: true  // This user gets access to all providers
        },
        'd4fe88ab-ff42-437c-b05b-4d0e0d742819': {
          profile: {
            id: 'd4fe88ab-ff42-437c-b05b-4d0e0d742819',
            display_name: 'Fozzy\'s Trivia',
            role: 'trivia_host' as const,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          provider: {
            id: '412bd70c-1b35-401c-aad0-ac2545846f50',
            name: 'Fozzy\'s Trivia',
            website: 'https://fozzystrivia.com',
            contact_info: {
              contact_name: 'Jason',
              contact_phone: '(615) 555-0123'
            },
            is_active: true,
            status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        }
      }
      
      if (knownUsers[userId]) {
        console.log('Using hardcoded data for known user')
        const userData = knownUsers[userId]
        setUserProfile(userData.profile)
        
        if (userData.isSuperAdmin) {
          // Super admin gets access to all providers - load them all
          // For now, just create mock providers - in real app would query all providers
          setProviders([
            { id: '1', name: 'All Providers (Super Admin)', website: '', contact_info: {}, created_at: '', updated_at: '', is_active: true, status: 'approved' }
          ])
          setProvider(null) // No single provider - has access to all
        } else if (userData.provider) {
          setProvider(userData.provider)
          setProviders([]) // Regular provider admin - only their provider
        }
        return
      }
      
      // For unknown users, set a default profile
      console.log('Setting default profile for unknown user')
      setUserProfile({
        id: userId,
        display_name: 'User',
        role: 'trivia_host' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      
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
      setProvider(null)
    } finally {
      console.log('Completed fetchUserProfile for userId:', userId)
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
    setProvider(null)
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/admin/reset-password`
    })
    if (error) throw error
  }

  // Super admin has access to all providers, regular provider admin has access to one
  const isSuperAdmin = Boolean(providers.length > 0)
  const hasProviderAccess = Boolean(provider) || isSuperAdmin

  const value = {
    user,
    userProfile,
    provider,
    providers,
    loading,
    hasProviderAccess,
    isSuperAdmin,
    supabase,
    signIn,
    signUp,
    signOut,
    resetPassword
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}