import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types for better TypeScript support
export interface Venue {
  id: string
  name_original: string
  address_original: string
  google_place_id?: string
  google_name?: string
  google_formatted_address?: string
  google_location?: string
  google_rating?: number
  google_phone_number?: string
  google_website?: string
  google_photo_reference?: string
  thumbnail_url?: string
  verification_status: 'pending' | 'verified' | 'failed' | 'needs_review'
  created_at: string
  updated_at: string
}

export interface Event {
  id: string
  venue_id: string
  provider_id: string
  event_type: string
  day_of_week: string
  start_time: string
  end_time?: string
  frequency: 'weekly' | 'monthly' | 'one-time'
  prize_amount?: number
  prize_description?: string
  max_teams?: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface VenueWithEvents extends Venue {
  longitude?: number
  latitude?: number
  distance_km?: number
  events: Array<{
    id: string
    event_type: string
    day_of_week: string
    start_time: string
    end_time?: string
    frequency: string
    prize_amount?: number
    prize_description?: string
    max_teams?: number
    is_active: boolean
  }>
}