import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/auth_context_simple'

export interface AdminStats {
  totalVenues: number
  events: number
  myVenues: number
  myEvents: number
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
  const { user, isGodAdmin, userProvider } = useAuth()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return

    const fetchStats = async () => {
      try {
        setLoading(true)
        setError(null)

        // Get total platform stats (for admins)
        
        // For god admin, show all data. For providers, show only their data
        let myVenueIdArray: string[] = []
        
        if (!isGodAdmin && userProvider) {
          // Get venue IDs for this provider by checking events table
          const { data: providerEvents } = await supabase
            .from('events')
            .select('venue_id')
            .eq('provider_id', userProvider.id)
          
          myVenueIdArray = [...new Set(providerEvents?.map(e => e.venue_id) || [])]
        }

        const [
          totalVenuesResult,
          eventsResult,
          myVenuesResult,
          myEventsResult,
          recentVenuesResult,
          recentEventsResult
        ] = await Promise.all([
          // Total venues (all users for admin, or just accessible ones for others)
          supabase
            .from('venues')
            .select('id', { count: 'exact', head: true }),
          
          // Active events only
          supabase
            .from('events')
            .select('id', { count: 'exact', head: true })
            .eq('is_active', true),
          
          // My venues (venues I have access to)
          !isGodAdmin && userProvider && myVenueIdArray.length > 0
            ? supabase
                .from('venues')
                .select('id', { count: 'exact', head: true })
                .in('id', myVenueIdArray)
            : Promise.resolve({ count: 0 }),
          
          // My events (active events for this provider)
          !isGodAdmin && userProvider
            ? supabase
                .from('events')
                .select('id', { count: 'exact', head: true })
                .eq('is_active', true)
                .eq('provider_id', userProvider.id)
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

        // Process results
        const newStats: AdminStats = {
          totalVenues: totalVenuesResult.count || 0,
          events: eventsResult.count || 0,
          myVenues: myVenuesResult.count || 0,
          myEvents: myEventsResult.count || 0,
          recentVenues: (recentVenuesResult.data || []).map(venue => ({
            id: venue.id,
            name: venue.google_name || venue.name_original,
            created_at: venue.created_at,
            verification_status: venue.verification_status
          })),
          recentEvents: (recentEventsResult.data || []).map(event => ({
            id: event.id,
            event_type: event.event_type,
            venue_name: (event.venues as any)?.google_name || (event.venues as any)?.name_original || 'Unknown Venue',
            day_of_week: event.day_of_week,
            start_time: event.start_time,
            created_at: event.created_at
          }))
        }

        setStats(newStats)
      } catch (err) {
        console.error('Error fetching admin stats:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch stats')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [user, isGodAdmin, userProvider])

  return { stats, loading, error, refetch: () => {
    if (user) {
      // Trigger a re-fetch
      setLoading(true)
      // The effect will re-run and fetch fresh data
    }
  }}
}