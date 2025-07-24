import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://izaojwusiuvosqrbdwtd.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6YW9qd3VzaXV2b3NxcmJkd3RkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzMDM3ODksImV4cCI6MjA2Njg3OTc4OX0.lqCeXhKf_0FZJZ7cQQJCCzz8Q8QfTc2A9RZBJ8QZBQQ'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      trivia_providers: {
        Row: {
          id: string
          name: string
          website: string | null
          contact_info: any | null
          created_at: string | null
          updated_at: string | null
          is_active: boolean | null
          status: string | null
        }
        Insert: {
          id?: string
          name: string
          website?: string | null
          contact_info?: any | null
          created_at?: string | null
          updated_at?: string | null
          is_active?: boolean | null
          status?: string | null
        }
        Update: {
          id?: string
          name?: string
          website?: string | null
          contact_info?: any | null
          created_at?: string | null
          updated_at?: string | null
          is_active?: boolean | null
          status?: string | null
        }
      }
      venues: {
        Row: {
          id: string
          name_original: string
          address_original: string
          google_place_id: string | null
          google_name: string | null
          google_formatted_address: string | null
          google_phone_number: string | null
          google_website: string | null
          google_rating: number | null
          google_user_ratings_total: number | null
          verification_status: string | null
          created_at: string | null
          updated_at: string | null
          status: string | null
        }
        Insert: {
          id?: string
          name_original: string
          address_original: string
          google_place_id?: string | null
          google_name?: string | null
          google_formatted_address?: string | null
          google_phone_number?: string | null
          google_website?: string | null
          google_rating?: number | null
          google_user_ratings_total?: number | null
          verification_status?: string | null
          created_at?: string | null
          updated_at?: string | null
          status?: string | null
        }
        Update: {
          id?: string
          name_original?: string
          address_original?: string
          google_place_id?: string | null
          google_name?: string | null
          google_formatted_address?: string | null
          google_phone_number?: string | null
          google_website?: string | null
          google_rating?: number | null
          google_user_ratings_total?: number | null
          verification_status?: string | null
          created_at?: string | null
          updated_at?: string | null
          status?: string | null
        }
      }
      events: {
        Row: {
          id: string
          venue_id: string
          provider_id: string | null
          event_type: string
          day_of_week: string
          start_time: string
          end_time: string | null
          frequency: string | null
          prize_amount: number | null
          prize_description: string | null
          max_teams: number | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
          status: string | null
        }
        Insert: {
          id?: string
          venue_id: string
          provider_id?: string | null
          event_type: string
          day_of_week: string
          start_time: string
          end_time?: string | null
          frequency?: string | null
          prize_amount?: number | null
          prize_description?: string | null
          max_teams?: number | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          status?: string | null
        }
        Update: {
          id?: string
          venue_id?: string
          provider_id?: string | null
          event_type?: string
          day_of_week?: string
          start_time?: string
          end_time?: string | null
          frequency?: string | null
          prize_amount?: number | null
          prize_description?: string | null
          max_teams?: number | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          status?: string | null
        }
      }
      event_occurrences: {
        Row: {
          id: string
          event_id: string
          occurrence_date: string
          status: string | null
          actual_start_time: string | null
          actual_end_time: string | null
          notes: string | null
          created_at: string | null
          is_themed: boolean | null
          theme_name: string | null
          theme_description: string | null
          confirmed_by: string | null
          confirmed_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          event_id: string
          occurrence_date: string
          status?: string | null
          actual_start_time?: string | null
          actual_end_time?: string | null
          notes?: string | null
          created_at?: string | null
          is_themed?: boolean | null
          theme_name?: string | null
          theme_description?: string | null
          confirmed_by?: string | null
          confirmed_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          event_id?: string
          occurrence_date?: string
          status?: string | null
          actual_start_time?: string | null
          actual_end_time?: string | null
          notes?: string | null
          created_at?: string | null
          is_themed?: boolean | null
          theme_name?: string | null
          theme_description?: string | null
          confirmed_by?: string | null
          confirmed_at?: string | null
          updated_at?: string | null
        }
      }
      admin_users: {
        Row: {
          id: string
          user_id: string
          email: string
          role: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          email: string
          role?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          email?: string
          role?: string | null
          created_at?: string | null
        }
      }
      provider_users: {
        Row: {
          id: string
          user_id: string
          provider_id: string
          role: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          provider_id: string
          role?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          provider_id?: string
          role?: string | null
          created_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}