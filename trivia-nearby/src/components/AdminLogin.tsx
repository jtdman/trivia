import React, { useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { useAuth } from '../context/auth_context'
import { Brain, Beer, Search, Loader2, AlertCircle } from 'lucide-react'

const AdminLogin: React.FC = () => {
  const { user, signIn, loading, error: authError, clearError } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Redirect if already logged in
  if (user) {
    return <Navigate to="/admin" replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    setIsSubmitting(true)

    try {
      console.log('Attempting to sign in with:', email)
      await signIn(email, password)
      console.log('Sign in successful')
    } catch (err: any) {
      console.error('Sign in error:', err)
      // Error is now handled by auth context
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

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* Header with back button */}
      <div className="px-4 py-6">
        <Link to="/" className="text-purple-400 font-medium">
          ← Back
        </Link>
      </div>
      
      <div className="mx-auto w-full max-w-md px-6 mt-8">
        {/* Logo and title */}
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
          <h2 className="text-2xl font-semibold text-black dark:text-white">Admin Login</h2>
        </div>

        {/* Login form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {authError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{authError}</span>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
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
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Links */}
        <div className="mt-6 text-center space-y-2">
          <Link to="/admin/forgot-password" className="text-purple-400 hover:text-purple-300 text-sm">
            Forgot your password?
          </Link>
          <div className="text-gray-600 dark:text-gray-400 text-sm">
            Need an account?{' '}
            <Link to="/admin/register" className="text-purple-400 hover:text-purple-300">
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminLogin