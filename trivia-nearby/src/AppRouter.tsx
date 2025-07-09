import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import App from './App'
import AdminLayout from './components/AdminLayout'
import AdminLogin from './components/AdminLogin'
import AdminRegister from './components/AdminRegister'
import AdminDashboard from './components/AdminDashboard'
import VenuesList from './components/VenuesList'
import AddVenuePage from './components/AddVenuePage'
import EditVenuePage from './components/EditVenuePage'
import VenueDetailPage from './components/VenueDetailPage'
import VenueClaimPage from './components/VenueClaimPage'
import MyVenuesPage from './components/MyVenuesPage'
import EventsList from './components/EventsList'
import AddEventPage from './components/AddEventPage'
import EditEventPage from './components/EditEventPage'
import ProviderContactsPage from './components/ProviderContactsPage'
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
            <Route path="venues/new" element={<AddVenuePage />} />
            <Route path="venues/claim" element={<VenueClaimPage />} />
            <Route path="venues/my-venues" element={<MyVenuesPage />} />
            <Route path="venues/:venueId" element={<EditVenuePage />} />
            <Route path="venues/:venueId/detail" element={<VenueDetailPage />} />
            <Route path="venues/:venueId/edit" element={<EditVenuePage />} />
            <Route path="events" element={<EventsList />} />
            <Route path="events/new" element={<AddEventPage />} />
            <Route path="events/:eventId" element={<EditEventPage />} />
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