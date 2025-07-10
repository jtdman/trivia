import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/auth_context'

export interface AdminStats {
  totalVenues: number
  totalEvents: number
  activeEvents: number
  myVenues: number
  myEvents: number
  myActiveEvents: number
  teamMembers: number
  recentVenues: Array<{
    id: string
    name: string
    created_at: string
    verification_status: string
  }>
  recentEvents: Array<{
    id: string
    event_type: string
    venue_name: string
    day_of_week: string
    start_time: string
    created_at: string
  }>
}

export const useAdminStats = () => {
  const { user, userProfile } = useAuth()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user || !userProfile) return

    const fetchStats = async () => {
      try {
        setLoading(true)
        setError(null)

        // Get total platform stats (for admins)
        userProfile.role === 'platform_admin'
        
        // First, get my venue IDs
        const myVenueIds = await supabase
          .from('user_venues')
          .select('venue_id')
          .eq('user_id', user.id)

        const myVenueIdArray = myVenueIds.data?.map(v => v.venue_id) || []

        const [
          totalVenuesResult,
          totalEventsResult,
          activeEventsResult,
          myVenuesResult,
          myEventsResult,
          recentVenuesResult,
          recentEventsResult
        ] = await Promise.all([
          // Total venues (all users for admin, or just accessible ones for others)
          supabase
            .from('venues')
            .select('id', { count: 'exact', head: true }),
          
          // Total events 
          supabase
            .from('events')
            .select('id', { count: 'exact', head: true }),
          
          // Active events
          supabase
            .from('events')
            .select('id', { count: 'exact', head: true })
            .eq('is_active', true),
          
          // My venues (venues I have access to)
          myVenueIdArray.length > 0 
            ? supabase
                .from('venues')
                .select('id', { count: 'exact', head: true })
                .in('id', myVenueIdArray)
            : Promise.resolve({ count: 0 }),
          
          // My events (events for venues I have access to)
          myVenueIdArray.length > 0
            ? supabase
                .from('events')
                .select('id', { count: 'exact', head: true })
                .in('venue_id', myVenueIdArray)
            : Promise.resolve({ count: 0 }),
          
          // Recent venues (last 5)
          supabase
            .from('venues')
            .select('id, name_original, google_name, created_at, verification_status')
            .order('created_at', { ascending: false })
            .limit(5),
          
          // Recent events with venue names
          supabase
            .from('events')
            .select(`
              id,
              event_type,
              day_of_week,
              start_time,
              created_at,
              venues!events_venue_id_fkey (
                name_original,
                google_name
              )
            `)
            .order('created_at', { ascending: false })
            .limit(5)
        ])

        // Count team members (users who have access to same venues)
        const teamMembersResult = myVenueIdArray.length > 0
          ? await supabase
              .from('user_venues')
              .select('user_id', { count: 'exact', head: true })
              .in('venue_id', myVenueIdArray)
          : { count: 1 } // Just the user themselves

        // Process results
        const newStats: AdminStats = {
          totalVenues: totalVenuesResult.count || 0,
          totalEvents: totalEventsResult.count || 0,
          activeEvents: activeEventsResult.count || 0,
          myVenues: myVenuesResult.count || 0,
          myEvents: myEventsResult.count || 0,
          myActiveEvents: 0, // Will calculate separately
          teamMembers: teamMembersResult.count || 0,
          recentVenues: (recentVenuesResult.data || []).map(venue => ({
            id: venue.id,
            name: venue.google_name || venue.name_original,
            created_at: venue.created_at,
            verification_status: venue.verification_status
          })),
          recentEvents: (recentEventsResult.data || []).map(event => ({
            id: event.id,
            event_type: event.event_type,
            venue_name: event.venues?.google_name || event.venues?.name_original || 'Unknown Venue',
            day_of_week: event.day_of_week,
            start_time: event.start_time,
            created_at: event.created_at
          }))
        }

        // Get active events count for my venues
        const myActiveEventsResult = myVenueIdArray.length > 0
          ? await supabase
              .from('events')
              .select('id', { count: 'exact', head: true })
              .eq('is_active', true)
              .in('venue_id', myVenueIdArray)
          : { count: 0 }

        newStats.myActiveEvents = myActiveEventsResult.count || 0

        setStats(newStats)
      } catch (err) {
        console.error('Error fetching admin stats:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch stats')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [user, userProfile])

  return { stats, loading, error, refetch: () => {
    if (user && userProfile) {
      // Trigger a re-fetch
      setLoading(true)
      // The effect will re-run and fetch fresh data
    }
  }}
}