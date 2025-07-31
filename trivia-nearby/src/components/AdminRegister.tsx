import React, { useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { useAuth } from '../context/auth_context'
import { Brain, Beer, Search, Loader2, AlertCircle } from 'lucide-react'

const AdminRegister: React.FC = () => {
  const { user, signUp, supabase } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [phone, setPhone] = useState('')
  const [website, setWebsite] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  // Redirect if already logged in
  if (user) {
    return <Navigate to="/admin" replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      // Create user account
      const signUpResult = await signUp(email, password, displayName)
      const newUser = signUpResult.user
      
      if (newUser) {
        // Create user profile first
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: newUser.id,
            email: email,
            full_name: displayName
          })

        if (profileError) {
          console.error('Profile creation error:', profileError)
        }

        // Create trivia provider record (pending approval)
        
        const { data: provider, error: providerError } = await supabase
          .from('trivia_providers')
          .insert({
            name: companyName || displayName,
            website: website || null,
            contact_info: {
              emails: [email],
              phones: phone ? [phone] : [],
              note: description || null
            },
            status: 'pending'
          })
          .select()
          .single()

        if (providerError) throw providerError

        // Link user to provider
        const { error: linkError } = await supabase
          .from('provider_users')
          .insert({
            user_id: newUser.id,
            provider_id: provider.id,
            role: 'admin'
          })

        if (linkError) throw linkError

        // Create notification for god-admin
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert({
            type: 'new_provider',
            title: 'New Trivia Provider Registration',
            message: `${companyName || displayName} (${email}) has registered and is pending approval.`,
            related_id: provider.id,
            related_table: 'trivia_providers',
            created_by: newUser.id
          })

        if (notificationError) throw notificationError
      }
      
      setIsSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Failed to create account')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex flex-col justify-center">
        <div className="mx-auto w-full max-w-md px-6 text-center">
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-green-600 dark:text-green-400 mb-2">
              Account Created Successfully!
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Your trivia provider account has been created and is pending approval. 
              Please check your email to verify your account, then you can sign in to manage your venues and events.
              Your content will be visible on the app once approved by our team.
            </p>
            <Link
              to="/admin/login"
              className="inline-block bg-purple-500 hover:bg-purple-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Go to Login
            </Link>
          </div>
        </div>
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
          <h2 className="text-2xl font-semibold text-black dark:text-white">Register Trivia Provider</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm">
            Create an account to manage your trivia events and venues
          </p>
        </div>

        {/* Registration form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Display Name
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Your name or company"
            />
          </div>

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
              minLength={6}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="••••••••"
            />
            <p className="mt-1 text-xs text-gray-500">Minimum 6 characters</p>
          </div>

          <div>
            <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Company/Trivia Provider Name
            </label>
            <input
              id="companyName"
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="e.g., NerdyTalk Trivia"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Phone Number (Optional)
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="(555) 123-4567"
            />
          </div>

          <div>
            <label htmlFor="website" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Website (Optional)
            </label>
            <input
              id="website"
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="https://yourcompany.com"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Brief Description (Optional)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              placeholder="Tell us about your trivia company..."
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-purple-500 hover:bg-purple-600 disabled:bg-purple-400 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
            {isSubmitting ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        {/* Links */}
        <div className="mt-6 text-center">
          <div className="text-gray-600 dark:text-gray-400 text-sm">
            Already have an account?{' '}
            <Link to="/admin/login" className="text-purple-400 hover:text-purple-300">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminRegister