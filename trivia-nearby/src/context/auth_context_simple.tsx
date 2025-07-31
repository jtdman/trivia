import React, { createContext, useContext, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthContextType {
  user: User | null
  loading: boolean
  isGodAdmin: boolean
  userProvider: any | null
  supabase: typeof supabase
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, userData: any) => Promise<any>
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
  const [loading, setLoading] = useState(true)
  const [isGodAdmin, setIsGodAdmin] = useState(false)
  const [userProvider, setUserProvider] = useState<any | null>(null)

  useEffect(() => {
    let mounted = true

    // Check for existing session
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!mounted) return
        
        setUser(session?.user ?? null)
        if (session?.user) {
          // Wait for role checks to complete before setting loading to false
          await Promise.all([
            checkUserRole(session.user),
            fetchUserProvider(session.user.id)
          ])
        }
      } catch (error) {
        console.error('Error getting session:', error)
      } finally {
        if (mounted) {
          // Always set loading to false after all checks complete
          setLoading(false)
        }
      }
    }

    initializeAuth()

    // Listen for auth changes with debouncing
    let timeoutId: NodeJS.Timeout | null = null
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return
      
      // Clear any pending timeout
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      
      // Debounce rapid auth state changes
      timeoutId = setTimeout(async () => {
        if (!mounted) return
        
        setUser(session?.user ?? null)
        if (session?.user) {
          try {
            await Promise.all([
              checkUserRole(session.user),
              fetchUserProvider(session.user.id)
            ])
          } catch (error) {
            console.error('Error during auth state change:', error)
          }
        } else {
          setIsGodAdmin(false)
          setUserProvider(null)
        }
      }, 100) // 100ms debounce
    })

    return () => {
      mounted = false
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      subscription.unsubscribe()
    }
  }, [])

  const checkUserRole = async (user: User) => {
    try {
      // First check metadata for role
      const metadataRole = user.user_metadata?.role || user.app_metadata?.role
      
      // Then check admin_users table
      const { data: adminData, error: adminError } = await supabase
        .from('admin_users')
        .select('role')
        .eq('user_id', user.id)
        .single()

      if (!adminError && adminData) {
        const isGod = adminData.role === 'god' || adminData.role === 'god_admin'
        setIsGodAdmin(isGod)
        return
      }

      // Fall back to metadata
      setIsGodAdmin(metadataRole === 'god_admin')
    } catch (error) {
      console.error('Error checking user role:', error)
      setIsGodAdmin(false)
    }
  }

  const fetchUserProvider = async (userId: string) => {
    try {
      // Check provider_users table for provider association
      const { data: providerUserData, error: providerUserError } = await supabase
        .from('provider_users')
        .select(`
          id,
          role,
          trivia_providers (
            id,
            name,
            website,
            contact_info,
            is_active,
            status
          )
        `)
        .eq('user_id', userId)
        .maybeSingle()

      if (!providerUserError && providerUserData) {
        setUserProvider(providerUserData.trivia_providers)
        return
      }

    } catch (error) {
      console.error('Error fetching user provider:', error)
    }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signUp = async (email: string, password: string, userData: any) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData
      }
    })
    if (error) throw error
    return data
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) throw error
  }

  const value = {
    user,
    loading,
    isGodAdmin,
    userProvider,
    supabase,
    signIn,
    signUp,
    signOut,
    resetPassword
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}