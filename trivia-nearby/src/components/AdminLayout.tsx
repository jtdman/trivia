import React, { useState } from 'react'
import { Outlet, Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/auth_context'
import { 
  Brain, 
  Beer, 
  Search, 
  Home, 
  MapPin, 
  Calendar, 
  Users, 
  User, 
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  Building
} from 'lucide-react'
import { useContext } from 'react'
import { ThemeContext } from '../context/theme_context'

const AdminLayout: React.FC = () => {
  const { user, userProfile, signOut } = useAuth()
  const { theme, toggleTheme } = useContext(ThemeContext)
  const navigate = useNavigate()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const navItems = [
    { path: '/admin', label: 'Dashboard', icon: Home, end: true },
    { path: '/admin/venues', label: 'Venues', icon: MapPin },
    { path: '/admin/events', label: 'Events', icon: Calendar },
    ...(userProfile?.role === 'platform_admin' 
      ? [{ path: '/admin/providers', label: 'Providers', icon: Building }] 
      : [{ path: '/admin/venues/my-venues', label: 'My Venues', icon: MapPin }]),
    ...(userProfile?.role === 'platform_admin' || userProfile?.role === 'trivia_host' 
      ? [{ path: '/admin/team', label: 'Team', icon: Users }] 
      : []),
    { path: '/admin/profile', label: 'Profile', icon: User }
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link to="/" className="flex items-center gap-3">
                <h1 className="text-xl font-bold">
                  <span className="text-purple-400">TRIVIA</span>
                  <span className="text-black dark:text-white">NEARBY</span>
                </h1>
                <div className="hidden sm:flex gap-2">
                  <Search className="w-4 h-4 text-black dark:text-white" />
                  <Brain className="w-4 h-4 text-black dark:text-white" />
                  <Beer className="w-4 h-4 text-black dark:text-white" />
                </div>
              </Link>
              <span className="ml-3 text-sm text-gray-500 dark:text-gray-400">Admin</span>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-6">
              {navItems.map(({ path, label, icon: Icon, end }) => (
                <NavLink
                  key={path}
                  to={path}
                  end={end}
                  className={({ isActive }) =>
                    `flex items-center gap-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'text-purple-600 dark:text-purple-400'
                        : 'text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </NavLink>
              ))}
            </nav>

            {/* Right side actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={toggleTheme}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              <div className="hidden md:flex items-center gap-3">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {user?.email}
                </span>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>

              {/* Mobile menu button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2"
              >
                {isMobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 dark:border-gray-800">
            <nav className="px-4 py-2 space-y-1">
              {navItems.map(({ path, label, icon: Icon, end }) => (
                <NavLink
                  key={path}
                  to={path}
                  end={end}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </NavLink>
              ))}
              <div className="border-t border-gray-200 dark:border-gray-800 pt-2 mt-2">
                <div className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
                  {user?.email}
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg w-full"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}

export default AdminLayout