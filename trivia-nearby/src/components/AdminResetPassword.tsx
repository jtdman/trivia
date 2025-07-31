import React, { useState, useEffect } from 'react'
import { Navigate, Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/auth_context'
import { Brain, Beer, Search, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

const AdminResetPassword: React.FC = () => {
  const { user, loading } = useAuth()
  const [searchParams] = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Get access token from URL
  const accessToken = searchParams.get('access_token')
  const refreshToken = searchParams.get('refresh_token')

  useEffect(() => {
    // If we have tokens in the URL, set them in the session
    if (accessToken && refreshToken) {
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      })
    }
  }, [accessToken, refreshToken])

  // Redirect if already logged in and no reset tokens
  if (user && !accessToken) {
    return <Navigate to="/admin" replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setIsSubmitting(true)

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      })

      if (updateError) {
        throw updateError
      }

      setSuccess(true)
    } catch (err: any) {
      console.error('Password reset error:', err)
      setError(err.message || 'Failed to reset password')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-white dark:bg-black">
        <div className="px-4 py-6">
          <Link to="/" className="text-purple-400 font-medium">
            ← Back
          </Link>
        </div>
        
        <div className="mx-auto w-full max-w-md px-6 mt-8">
          <div className="text-center mb-8">
            <Link to="/" className="inline-block">
              <h1 className="text-4xl font-bold mb-4">
                <span className="text-purple-400">TRIVIA</span>
                <span className="text-black dark:text-white">NEARBY</span>
              </h1>
            </Link>
            <div className="flex gap-4 justify-center mb-6">
              <Search className="w-6 h-6 text-black dark:text-white" />
              <Brain className="w-6 h-6 text-black dark:text-white" />
              <Beer className="w-6 h-6 text-black dark:text-white" />
            </div>
          </div>

          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-6 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-black dark:text-white mb-2">
              Password Reset Successful!
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Your password has been updated successfully.
            </p>
            <Link
              to="/admin/login"
              className="inline-block bg-purple-500 hover:bg-purple-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="px-4 py-6">
        <Link to="/" className="text-purple-400 font-medium">
          ← Back
        </Link>
      </div>
      
      <div className="mx-auto w-full max-w-md px-6 mt-8">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <h1 className="text-4xl font-bold mb-4">
              <span className="text-purple-400">TRIVIA</span>
              <span className="text-black dark:text-white">NEARBY</span>
            </h1>
          </Link>
          <div className="flex gap-4 justify-center mb-6">
            <Search className="w-6 h-6 text-black dark:text-white" />
            <Brain className="w-6 h-6 text-black dark:text-white" />
            <Beer className="w-6 h-6 text-black dark:text-white" />
          </div>
          <h2 className="text-2xl font-semibold text-black dark:text-white">Reset Password</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              New Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-purple-500 hover:bg-purple-600 disabled:bg-purple-400 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
            {isSubmitting ? 'Updating Password...' : 'Update Password'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/admin/login" className="text-purple-400 hover:text-purple-300 text-sm">
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}

export default AdminResetPassword