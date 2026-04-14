import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables. Please check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.')
}

// Create Supabase client with service role key for backend operations
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Google Places API configuration
export const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY

if (!GOOGLE_PLACES_API_KEY) {
  console.warn('Warning: GOOGLE_PLACES_API_KEY not found. Google Places API calls will fail.')
}

// Rate limiting configuration
export const RATE_LIMITS = {
  GOOGLE_PLACES: {
    MAX_DAILY_REQUESTS: 1000,
    REQUESTS_PER_SECOND: 10,
    DELAY_BETWEEN_REQUESTS: 110 // 110ms to stay under 10/second
  }
} as const