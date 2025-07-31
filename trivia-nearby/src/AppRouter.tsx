import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import App from './App'
import AdminLayout from './components/AdminLayout'
import AdminLogin from './components/AdminLogin'
import AdminRegisterSimple from './components/AdminRegisterSimple'
import AdminDashboard from './components/AdminDashboard'
import VenuesList from './components/VenuesList'
import AddVenuePage from './components/AddVenuePage'
import EditVenuePage from './components/EditVenuePage'
import VenueDetailPage from './components/VenueDetailPage'
import MyVenuesPage from './components/MyVenuesPage'
import EventsList from './components/EventsList'
import AddEventPage from './components/AddEventPage'
import EditEventPage from './components/EditEventPage'
import EventOccurrenceManager from './components/EventOccurrenceManager'
import ProviderContactsPage from './components/ProviderContactsPage'
import AdminTest from './components/AdminTest'
import AdminRoute from './components/AdminRoute'
import LocationPage from './components/LocationPage'
import BetaPage from './components/BetaPage'
import AdminForgotPassword from './components/AdminForgotPassword'
import AdminResetPassword from './components/AdminResetPassword'
import { AuthProvider } from './context/auth_context'

const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Main app routes */}
          <Route path="/" element={<App />} />
          <Route path="/beta" element={<BetaPage />} />
          
          {/* SEO location routes */}
          <Route path="/trivia-near-me" element={<Navigate to="/" replace />} />
          <Route path="/trivia-near-:location" element={<LocationPage onBack={() => window.history.back()} />} />
          
          {/* Admin routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/register" element={<AdminRegisterSimple />} />
          <Route path="/admin/forgot-password" element={<AdminForgotPassword />} />
          <Route path="/admin/reset-password" element={<AdminResetPassword />} />
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
            <Route path="venues/new" element={<AddVenuePage />} />
            <Route path="venues/my-venues" element={<MyVenuesPage />} />
            <Route path="venues/:venueId" element={<EditVenuePage />} />
            <Route path="venues/:venueId/detail" element={<VenueDetailPage />} />
            <Route path="venues/:venueId/edit" element={<EditVenuePage />} />
            <Route path="events" element={<EventsList />} />
            <Route path="events/new" element={<AddEventPage />} />
            <Route path="events/:eventId" element={<EditEventPage />} />
            <Route path="schedule" element={<EventOccurrenceManager />} />
            <Route path="providers" element={<ProviderContactsPage />} />
            <Route path="team" element={<div className="p-8">Team page coming soon</div>} />
            <Route path="profile" element={<div className="p-8">Profile page coming soon</div>} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default AppRouter