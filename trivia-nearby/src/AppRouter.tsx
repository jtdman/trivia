import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import App from './App'
import AdminLayout from './components/AdminLayout'
import AdminLogin from './components/AdminLogin'
import AdminRegister from './components/AdminRegister'
import AdminDashboard from './components/AdminDashboard'
import VenuesList from './components/VenuesList'
import AdminTest from './components/AdminTest'
import AdminRoute from './components/AdminRoute'
import LocationPage from './components/LocationPage'
import { AuthProvider } from './context/auth_context'

const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Main app routes */}
          <Route path="/" element={<App />} />
          
          {/* SEO location routes */}
          <Route path="/trivia-near-me" element={<Navigate to="/" replace />} />
          <Route path="/trivia-near-:location" element={<LocationPage onBack={() => window.history.back()} />} />
          
          {/* Admin routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/register" element={<AdminRegister />} />
          <Route path="/admin/test" element={<AdminTest />} />
          
          {/* Protected admin routes */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="venues" element={<VenuesList />} />
            <Route path="events" element={<div className="p-8">Events page coming soon</div>} />
            <Route path="team" element={<div className="p-8">Team page coming soon</div>} />
            <Route path="profile" element={<div className="p-8">Profile page coming soon</div>} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default AppRouter