import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function createLocationFunction() {
  try {
    console.log('Creating get_nearby_venues function...')

    const { data, error } = await supabase.rpc('exec', {
      sql: `
        CREATE OR REPLACE FUNCTION get_nearby_venues(
          user_lat DOUBLE PRECISION,
          user_lng DOUBLE PRECISION,
          radius_km INTEGER DEFAULT 50,
          venue_limit INTEGER DEFAULT 50
        )
        RETURNS TABLE (
          id UUID,
          name_original TEXT,
          address_original TEXT,
          google_place_id TEXT,
          google_name TEXT,
          google_formatted_address TEXT,
          google_rating DOUBLE PRECISION,
          google_phone_number TEXT,
          google_website TEXT,
          google_photo_reference TEXT,
          thumbnail_url TEXT,
          verification_status TEXT,
          created_at TIMESTAMPTZ,
          updated_at TIMESTAMPTZ,
          longitude DOUBLE PRECISION,
          latitude DOUBLE PRECISION,
          distance_km DOUBLE PRECISION,
          events JSONB
        ) 
        LANGUAGE plpgsql
        AS $$
        BEGIN
          RETURN QUERY
          SELECT 
            v.id,
            v.name_original,
            v.address_original,
            v.google_place_id,
            v.google_name,
            v.google_formatted_address,
            v.google_rating,
            v.google_phone_number,
            v.google_website,
            v.google_photo_reference,
            v.thumbnail_url,
            v.verification_status,
            v.created_at,
            v.updated_at,
            ST_X(v.google_location) as longitude,
            ST_Y(v.google_location) as latitude,
            ST_Distance(
              v.google_location,
              ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
            ) / 1000.0 as distance_km,
            COALESCE(
              jsonb_agg(
                jsonb_build_object(
                  'id', e.id,
                  'event_type', e.event_type,
                  'day_of_week', e.day_of_week,
                  'start_time', e.start_time,
                  'end_time', e.end_time,
                  'frequency', e.frequency,
                  'prize_amount', e.prize_amount,
                  'prize_description', e.prize_description,
                  'max_teams', e.max_teams,
                  'is_active', e.is_active
                )
              ) FILTER (WHERE e.id IS NOT NULL),
              '[]'::jsonb
            ) as events
          FROM venues v
          LEFT JOIN events e ON v.id = e.venue_id AND e.is_active = true
          WHERE v.google_location IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM events e2 
              WHERE e2.venue_id = v.id AND e2.is_active = true
            )
            AND ST_DWithin(
              v.google_location,
              ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
              radius_km * 1000
            )
          GROUP BY v.id, v.name_original, v.address_original, v.google_place_id, 
                   v.google_name, v.google_formatted_address, v.google_rating,
                   v.google_phone_number, v.google_website, v.google_photo_reference,
                   v.thumbnail_url, v.verification_status, v.created_at, v.updated_at,
                   v.google_location
          ORDER BY distance_km
          LIMIT venue_limit;
        END;
        $$;
      `
    })

    if (error) {
      console.error('Error creating function:', error)
      return false
    }

    console.log('Function created successfully!')
    return true

  } catch (err) {
    console.error('Error:', err)
    return false
  }
}

// Test the function
async function testFunction() {
  try {
    console.log('Testing function with Nashville coordinates...')
    
    const { data, error } = await supabase.rpc('get_nearby_venues', {
      user_lat: 36.1627,
      user_lng: -86.5804,
      radius_km: 50,
      venue_limit: 5
    })

    if (error) {
      console.error('Error testing function:', error)
      return
    }

    console.log('Function test successful!')
    console.log('Found venues:', data?.length)
    if (data?.[0]) {
      console.log('First venue:', {
        name: data[0].google_name || data[0].name_original,
        distance: data[0].distance_km?.toFixed(1) + 'km',
        events: data[0].events?.length
      })
    }

  } catch (err) {
    console.error('Error testing:', err)
  }
}

async function main() {
  const success = await createLocationFunction()
  if (success) {
    await testFunction()
  }
}

main()