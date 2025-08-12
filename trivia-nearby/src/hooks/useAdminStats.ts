import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/auth_context'

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
  const { user, provider } = useAuth()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.id) return

    const fetchStats = async () => {
      try {
        setLoading(true)
        setError(null)

        // Get counts and recent data
        // If provider admin, filter by their provider
        let venuesQuery = supabase.from('venues').select('*', { count: 'exact', head: true })
        let eventsQuery = supabase.from('events').select('*', { count: 'exact', head: true })
        let myVenuesQuery = supabase.from('venues').select('*', { count: 'exact', head: true })
        let myEventsQuery = supabase.from('events').select('*', { count: 'exact', head: true })
        let recentVenuesQuery = supabase.from('venues').select('id, name_original, google_name, created_at, verification_status').order('created_at', { ascending: false }).limit(5)
        let recentEventsQuery = supabase.from('events').select(`
          id, 
          event_type, 
          day_of_week, 
          start_time, 
          created_at,
          venue:venues(name_original, google_name)
        `).order('created_at', { ascending: false }).limit(5)
        
        if (provider) {
          // Provider admin - filter events by provider
          myEventsQuery = myEventsQuery.eq('provider_id', provider.id)
          // For venues, get those with events from this provider
          const { data: providerEventVenues } = await supabase
            .from('events')
            .select('venue_id')
            .eq('provider_id', provider.id)
          const venueIds = [...new Set(providerEventVenues?.map(e => e.venue_id) || [])]
          if (venueIds.length > 0) {
            myVenuesQuery = myVenuesQuery.in('id', venueIds)
          } else {
            myVenuesQuery = myVenuesQuery.eq('id', 'no-venues') // Force empty result
          }
          recentEventsQuery = recentEventsQuery.eq('provider_id', provider.id)
        }
        
        const [venuesResult, eventsResult, myVenuesResult, myEventsResult, recentVenuesResult, recentEventsResult] = await Promise.all([
          venuesQuery,
          eventsQuery,
          myVenuesQuery,
          myEventsQuery,
          recentVenuesQuery,
          recentEventsQuery
        ])

        const newStats: AdminStats = {
          totalVenues: venuesResult.count || 0,
          events: eventsResult.count || 0,
          myVenues: myVenuesResult.count || 0,
          myEvents: myEventsResult.count || 0,
          recentVenues: (recentVenuesResult.data || []).map(v => ({
            id: v.id,
            name: v.google_name || v.name_original,
            created_at: v.created_at,
            verification_status: v.verification_status
          })),
          recentEvents: (recentEventsResult.data || []).map(e => ({
            id: e.id,
            event_type: e.event_type,
            venue_name: (e.venue as any)?.google_name || (e.venue as any)?.name_original || 'Unknown Venue',
            day_of_week: e.day_of_week,
            start_time: e.start_time,
            created_at: e.created_at
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
  }, [user?.id, provider?.id])

  const refetch = async () => {
    if (!user?.id) return
    
    try {
      setLoading(true)
      setError(null)

      // Get counts and recent data
      const [venuesResult, eventsResult, recentVenuesResult, recentEventsResult] = await Promise.all([
        supabase.from('venues').select('*', { count: 'exact', head: true }),
        supabase.from('events').select('*', { count: 'exact', head: true }),
        supabase.from('venues').select('id, name_original, google_name, created_at, verification_status').order('created_at', { ascending: false }).limit(5),
        supabase.from('events').select(`
          id, 
          event_type, 
          day_of_week, 
          start_time, 
          created_at,
          venue:venues(name_original, google_name)
        `).order('created_at', { ascending: false }).limit(5)
      ])

      const newStats: AdminStats = {
        totalVenues: venuesResult.count || 0,
        events: eventsResult.count || 0,
        myVenues: 0,
        myEvents: 0,
        recentVenues: (recentVenuesResult.data || []).map(v => ({
          id: v.id,
          name: v.google_name || v.name_original,
          created_at: v.created_at,
          verification_status: v.verification_status
        })),
        recentEvents: (recentEventsResult.data || []).map(e => ({
          id: e.id,
          event_type: e.event_type,
          venue_name: (e.venue as any)?.google_name || (e.venue as any)?.name_original || 'Unknown Venue',
          day_of_week: e.day_of_week,
          start_time: e.start_time,
          created_at: e.created_at
        }))
      }

      setStats(newStats)
    } catch (err) {
      console.error('Error refetching admin stats:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch stats')
    } finally {
      setLoading(false)
    }
  }

  return { stats, loading, error, refetch }
}