-- =====================================================
-- TRIVIA APP DATABASE STATUS DOCUMENTATION
-- =====================================================
-- Generated: July 2, 2025
-- Purpose: Complete database schema and function documentation

-- =====================================================
-- 1. TABLE STATUS AND COUNTS
-- =====================================================

-- Check table structure and row counts
SELECT 
  schemaname,
  tablename,
  schemaname||'.'||tablename as full_name,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes,
  n_live_tup as live_rows,
  n_dead_tup as dead_rows
FROM pg_stat_user_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- =====================================================
-- 2. VENUES TABLE STATUS
-- =====================================================

-- Venue verification status breakdown
SELECT 
  verification_status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM venues 
GROUP BY verification_status
ORDER BY count DESC;

-- Venues with Google Places data
SELECT 
  'Total venues' as metric,
  COUNT(*) as count
FROM venues
UNION ALL
SELECT 
  'With Google Place ID' as metric,
  COUNT(*) as count
FROM venues 
WHERE google_place_id IS NOT NULL
UNION ALL
SELECT 
  'With Google location data' as metric,
  COUNT(*) as count
FROM venues 
WHERE google_location IS NOT NULL
UNION ALL
SELECT 
  'With Google photos' as metric,
  COUNT(*) as count
FROM venues 
WHERE google_photo_reference IS NOT NULL
UNION ALL
SELECT 
  'With thumbnail URLs' as metric,
  COUNT(*) as count
FROM venues 
WHERE thumbnail_url IS NOT NULL;

-- =====================================================
-- 3. EVENTS TABLE STATUS
-- =====================================================

-- Events breakdown by status and type
SELECT 
  event_type,
  frequency,
  is_active,
  COUNT(*) as count
FROM events 
GROUP BY event_type, frequency, is_active
ORDER BY event_type, frequency, is_active;

-- Active events per venue distribution
SELECT 
  active_event_count,
  COUNT(*) as venues_with_this_count
FROM (
  SELECT 
    v.id,
    COUNT(e.id) as active_event_count
  FROM venues v
  LEFT JOIN events e ON v.id = e.venue_id AND e.is_active = true
  GROUP BY v.id
) venue_events
GROUP BY active_event_count
ORDER BY active_event_count;

-- =====================================================
-- 4. LOCATION DATA STATUS
-- =====================================================

-- Geographic distribution of venues
SELECT 
  CASE 
    WHEN google_formatted_address LIKE '%TN%' THEN 'Tennessee'
    WHEN google_formatted_address LIKE '%LA%' THEN 'Louisiana' 
    WHEN google_formatted_address LIKE '%FL%' THEN 'Florida'
    WHEN google_formatted_address LIKE '%TX%' THEN 'Texas'
    ELSE 'Other/Unknown'
  END as state,
  COUNT(*) as venue_count
FROM venues 
WHERE google_formatted_address IS NOT NULL
GROUP BY 
  CASE 
    WHEN google_formatted_address LIKE '%TN%' THEN 'Tennessee'
    WHEN google_formatted_address LIKE '%LA%' THEN 'Louisiana'
    WHEN google_formatted_address LIKE '%FL%' THEN 'Florida' 
    WHEN google_formatted_address LIKE '%TX%' THEN 'Texas'
    ELSE 'Other/Unknown'
  END
ORDER BY venue_count DESC;

-- Sample of venue coordinates (first 5 per state)
WITH venue_coords AS (
  SELECT 
    id,
    COALESCE(google_name, name_original) as name,
    google_formatted_address,
    ST_X(google_location) as longitude,
    ST_Y(google_location) as latitude,
    CASE 
      WHEN google_formatted_address LIKE '%TN%' THEN 'Tennessee'
      WHEN google_formatted_address LIKE '%LA%' THEN 'Louisiana'
      WHEN google_formatted_address LIKE '%FL%' THEN 'Florida'
      ELSE 'Other'
    END as state,
    ROW_NUMBER() OVER (
      PARTITION BY CASE 
        WHEN google_formatted_address LIKE '%TN%' THEN 'Tennessee'
        WHEN google_formatted_address LIKE '%LA%' THEN 'Louisiana' 
        WHEN google_formatted_address LIKE '%FL%' THEN 'Florida'
        ELSE 'Other'
      END 
      ORDER BY COALESCE(google_name, name_original)
    ) as rn
  FROM venues 
  WHERE google_location IS NOT NULL
)
SELECT state, name, longitude, latitude, google_formatted_address
FROM venue_coords 
WHERE rn <= 3
ORDER BY state, name;

-- =====================================================
-- 5. DATABASE FUNCTIONS STATUS
-- =====================================================

-- List custom functions
SELECT 
  routine_name,
  routine_type,
  data_type as return_type,
  routine_definition IS NOT NULL as has_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%venue%'
ORDER BY routine_name;

-- Test get_nearby_venues function (if it exists)
-- Uncomment after creating the function:
-- SELECT 'Function test' as status, COUNT(*) as nearby_venues_count
-- FROM get_nearby_venues(36.1627, -86.5804, 50, 5);

-- =====================================================
-- 6. DATA QUALITY CHECKS
-- =====================================================

-- Venues missing critical data
SELECT 
  'Missing Google Place ID' as issue,
  COUNT(*) as count
FROM venues 
WHERE google_place_id IS NULL
UNION ALL
SELECT 
  'Missing location coordinates' as issue,
  COUNT(*) as count
FROM venues 
WHERE google_location IS NULL
UNION ALL
SELECT 
  'Missing events' as issue,
  COUNT(*) as count
FROM venues v
WHERE NOT EXISTS (
  SELECT 1 FROM events e 
  WHERE e.venue_id = v.id AND e.is_active = true
)
UNION ALL
SELECT 
  'Duplicate venue names' as issue,
  COUNT(*) - COUNT(DISTINCT COALESCE(google_name, name_original)) as count
FROM venues;

-- =====================================================
-- 7. PERFORMANCE INDEXES
-- =====================================================

-- List relevant indexes
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND (tablename IN ('venues', 'events') OR indexname LIKE '%location%')
ORDER BY tablename, indexname;

-- =====================================================
-- 8. RECENT ACTIVITY
-- =====================================================

-- Recently added/updated venues
SELECT 
  'Recent venues (last 7 days)' as metric,
  COUNT(*) as count
FROM venues 
WHERE created_at > NOW() - INTERVAL '7 days'
UNION ALL
SELECT 
  'Recently updated venues (last 7 days)' as metric,
  COUNT(*) as count
FROM venues 
WHERE updated_at > NOW() - INTERVAL '7 days' AND updated_at != created_at;

-- =====================================================
-- END OF STATUS REPORT
-- =====================================================