# Database Migrations Log

Track all database migrations here. Include migration number, date, description, and rollback plan.

## Migration Format

```
### YYYYMMDD_NN - Description
**Date**: YYYY-MM-DD
**Author**: Agent name
**Issue**: #123

**Changes**:
- What changed

**Rollback**:
- How to rollback

**SQL**:
```sql
-- Forward migration
```

```sql
-- Rollback migration
```
```

---

## Migrations

### 20240101_01 - Initial Schema
**Date**: 2024-01-01
**Author**: Database Agent
**Issue**: #1

**Changes**:
- Created initial tables: venues, events, trivia_providers, user_profiles, user_favorites, admin_users
- Added PostGIS extension
- Created indexes and RLS policies

**Rollback**:
- Drop all tables and extensions

**SQL**:
```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create tables (see schema.md for full definitions)
CREATE TABLE venues (...);
CREATE TABLE trivia_providers (...);
CREATE TABLE events (...);
CREATE TABLE user_profiles (...);
CREATE TABLE user_favorites (...);
CREATE TABLE admin_users (...);

-- Create functions
CREATE OR REPLACE FUNCTION update_updated_at() ...;

-- Create triggers
CREATE TRIGGER update_venues_updated_at BEFORE UPDATE ON venues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
-- Repeat for other tables
```

```sql
-- Rollback
DROP TABLE IF EXISTS admin_users CASCADE;
DROP TABLE IF EXISTS user_favorites CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS trivia_providers CASCADE;
DROP TABLE IF EXISTS venues CASCADE;
DROP FUNCTION IF EXISTS update_updated_at CASCADE;
```

---

### 20240115_01 - Add Event Categories
**Date**: 2024-01-15  
**Author**: Database Agent
**Issue**: #45

**Changes**:
- Added categories column to events table
- Added difficulty column to events table

**Rollback**:
- Remove columns

**SQL**:
```sql
-- Forward
ALTER TABLE events 
  ADD COLUMN categories TEXT[] DEFAULT '{}',
  ADD COLUMN difficulty VARCHAR(20);

-- Add check constraint
ALTER TABLE events 
  ADD CONSTRAINT check_difficulty 
  CHECK (difficulty IN ('easy', 'medium', 'hard'));
```

```sql
-- Rollback
ALTER TABLE events 
  DROP CONSTRAINT IF EXISTS check_difficulty,
  DROP COLUMN IF EXISTS categories,
  DROP COLUMN IF EXISTS difficulty;
```

---

### 20240120_01 - Event Instances Materialized View
**Date**: 2024-01-20
**Author**: Database Agent  
**Issue**: #67

**Changes**:
- Created materialized view for recurring event instances
- Added refresh function and schedule

**Rollback**:
- Drop materialized view and function

**SQL**:
```sql
-- Forward
CREATE MATERIALIZED VIEW event_instances AS
SELECT 
    e.id as event_id,
    e.venue_id,
    e.name,
    generate_series(
        e.start_time,
        LEAST(e.recurrence_end_date, CURRENT_DATE + INTERVAL '30 days'),
        '1 week'::interval
    ) as instance_date,
    e.prize_info,
    v.location
FROM events e
JOIN venues v ON e.venue_id = v.id
WHERE e.is_active = true 
  AND e.recurrence_rule IS NOT NULL;

CREATE INDEX idx_event_instances_date ON event_instances(instance_date);
CREATE INDEX idx_event_instances_location ON event_instances USING GIST(location);

-- Create refresh function
CREATE OR REPLACE FUNCTION refresh_event_instances()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY event_instances;
END;
$$ LANGUAGE plpgsql;
```

```sql
-- Rollback
DROP FUNCTION IF EXISTS refresh_event_instances();
DROP MATERIALIZED VIEW IF EXISTS event_instances;
```

---

---

### 20250803_01 - Capitalize Event Types
**Date**: 2025-08-03
**Author**: Database Agent
**Issue**: User Request

**Changes**:
- Update lowercase "trivia" to "Trivia" (75 records)
- Update lowercase "bingo" to "Bingo" (9 records)
- Improve data consistency for event_type field

**Rollback**:
- Revert specific records back to lowercase (best effort)

**SQL**:
```sql
-- Forward migration
UPDATE events 
SET event_type = 'Trivia' 
WHERE event_type = 'trivia';

UPDATE events 
SET event_type = 'Bingo' 
WHERE event_type = 'bingo';
```

```sql
-- Rollback migration (best effort)
UPDATE events 
SET event_type = 'trivia' 
WHERE event_type = 'Trivia' 
  AND updated_at >= (SELECT MAX(created_at) FROM events WHERE event_type = 'Trivia')
LIMIT 75;

UPDATE events 
SET event_type = 'bingo' 
WHERE event_type = 'Bingo'
  AND updated_at >= (SELECT MAX(created_at) FROM events WHERE event_type = 'Bingo')
LIMIT 9;
```

---

## Pending Migrations

Document planned migrations here before implementation:

### PLANNED: Add User Preferences
**Target Date**: TBD
**Issue**: TBD

**Changes**:
- Add user_preferences table for notification settings
- Add push notification tokens

### PLANNED: Event Analytics  
**Target Date**: TBD
**Issue**: TBD

**Changes**:
- Add event_views table
- Add event_registrations table
- Track user engagement metrics