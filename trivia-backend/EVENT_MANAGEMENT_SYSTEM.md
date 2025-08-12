# Event Management System Documentation

## Overview

This document outlines the event management system architecture, including the duplicate prevention solution, event occurrence generation, and plans for different event frequencies.

## Current Architecture

### Tables
- **`events`** - Recurring event templates (what providers create/scrape)
- **`event_occurrences`** - Specific date instances (what the scheduler generates)
- **`venues`** - Location information
- **`trivia_providers`** - Provider/company information

### Event Flow
1. **Events are created** via scraping or admin interface
2. **Scheduler generates occurrences** every Sunday night for the next 4 weeks
3. **Providers confirm/cancel** specific occurrences
4. **Users see confirmed events** on the public app

## Duplicate Event Problem (RESOLVED)

### The Issue
The scraping process created **duplicate events** without checking for existing entries:
- Same venue + event type + day + time + provider = multiple event records
- Example: True Texas BBQ had 20 separate events for "Live Trivia" on Tuesday 6:30 PM
- Scheduler created occurrences for ALL events, resulting in 20 identical entries in the UI

### The Solution

#### 1. Database Constraints (Migration: `20250804_prevent_duplicate_events.sql`)
```sql
-- Unique constraint prevents duplicate events
ALTER TABLE events 
ADD CONSTRAINT unique_event_combination 
UNIQUE (venue_id, event_type, day_of_week, start_time, provider_id)
WHERE is_active = true;
```

#### 2. Cleanup Script (`fix-duplicate-events.js`)
- Identifies duplicate events
- Keeps oldest event from each duplicate group
- Deletes all event occurrences
- Deletes duplicate events
- Regenerates clean occurrences

#### 3. Import Script Updates (`utils/event-deduplication.js`)
- Helper functions to check for existing events
- Smart insertion with duplicate prevention
- Batch processing with progress tracking

### How to Fix Existing Duplicates

```bash
cd trivia-backend

# Test the cleanup (safe to run)
pnpm fix-duplicates:dry-run

# Execute the cleanup (after verifying dry-run results)
pnpm fix-duplicates

# Monitor the process
pnpm monitor
```

## Event Frequency Support

### Current Status: Weekly Events Only
All scraped events are marked as `frequency = 'weekly'` and generate occurrences every week on the specified day.

### Planned Frequency Types

#### 1. Weekly Events (✅ Implemented)
- **Use case**: Regular weekly trivia nights
- **Frequency**: `'weekly'`
- **Occurrence generation**: Every week on `day_of_week`
- **Date range**: Respects `start_date` and `end_date`

#### 2. One-Time Events (🚧 Planned)
- **Use case**: Special events, tournaments, holiday trivia
- **Frequency**: `'once'`
- **Required fields**: `specific_date` (new column needed)
- **Occurrence generation**: Single occurrence on `specific_date`
- **Admin interface**: Date picker for specific date

#### 3. Monthly Events (🚧 Planned)
- **Use case**: Monthly tournaments, special themed nights
- **Frequency**: `'monthly'`
- **Options**:
  - `'first_monday'`, `'second_tuesday'`, etc.
  - `'monthly_15th'` (specific date each month)
- **Required fields**: `monthly_pattern` (new column needed)
- **Occurrence generation**: Calculate dates based on pattern

#### 4. Bi-weekly Events (🚧 Future)
- **Use case**: Every other week events
- **Frequency**: `'biweekly'`
- **Required fields**: `reference_date` to determine which weeks

#### 5. Custom/Irregular (🚧 Future)
- **Use case**: Events with custom schedules
- **Frequency**: `'custom'`
- **Implementation**: Separate `event_schedule` table with specific dates

### Database Schema Updates Needed

```sql
-- Add columns for different frequency types
ALTER TABLE events ADD COLUMN specific_date DATE; -- For one-time events
ALTER TABLE events ADD COLUMN monthly_pattern TEXT; -- For monthly events
ALTER TABLE events ADD COLUMN reference_date DATE; -- For bi-weekly events

-- Update frequency enum
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_frequency_check;
ALTER TABLE events ADD CONSTRAINT events_frequency_check 
CHECK (frequency IN ('weekly', 'once', 'monthly', 'biweekly', 'custom'));
```

### Scheduler Updates Needed

The `sunday-night-scheduler.js` will need updates to handle different frequencies:

```javascript
// Current: Only processes weekly events
.eq('frequency', 'weekly')

// Updated: Handle multiple frequencies
.in('frequency', ['weekly', 'monthly', 'biweekly'])

// Add frequency-specific logic
switch (event.frequency) {
  case 'weekly':
    // Current logic
    break;
  case 'monthly':
    // Calculate monthly dates
    break;
  case 'once':
    // Skip - one-time events don't need recurring generation
    break;
}
```

## Admin Interface Requirements

### Event Form Fields

#### Basic Fields (✅ Exists)
- Venue selection
- Event type
- Day of week
- Start time / End time
- Prize information

#### Frequency Selection (🚧 Needed)
```javascript
// Radio button or dropdown
frequency: 'weekly' | 'once' | 'monthly' | 'biweekly'

// Conditional fields based on frequency
if (frequency === 'once') {
  // Show date picker
  specific_date: Date
}

if (frequency === 'monthly') {
  // Show monthly pattern options
  monthly_pattern: 'first_monday' | 'second_tuesday' | 'monthly_15th' | etc.
}
```

#### Date Range (✅ Exists)
- Start date (when event begins)
- End date (when event ends, optional)

### Validation Rules

1. **Weekly events**: Must have `day_of_week`
2. **One-time events**: Must have `specific_date`
3. **Monthly events**: Must have `monthly_pattern`
4. **All events**: Cannot create duplicates (enforced by DB constraint)

## API Endpoints Needed

### For Admin Interface
```javascript
// Create event
POST /api/admin/events
// Body: { venue_id, event_type, frequency, day_of_week?, specific_date?, ... }

// Update event  
PUT /api/admin/events/:id
// Body: { field: value, ... }

// Delete event (soft delete)
DELETE /api/admin/events/:id
// Sets is_active = false

// Get events for provider
GET /api/admin/events?provider_id=xxx

// Get event occurrences for confirmation
GET /api/admin/occurrences?provider_id=xxx&date_range=next_week
```

### For Public App (✅ Exists)
```javascript
// Get confirmed occurrences near location
GET /api/events?lat=xxx&lng=xxx&date=xxx&radius=xxx
```

## Testing Strategy

### Unit Tests Needed
- [ ] Event deduplication utilities
- [ ] Scheduler frequency logic
- [ ] Date calculation functions
- [ ] Validation rules

### Integration Tests Needed
- [ ] End-to-end event creation flow
- [ ] Scheduler with different frequencies
- [ ] API endpoints
- [ ] Database constraints

### Manual Testing Scenarios
- [ ] Create weekly event via admin interface
- [ ] Create one-time event via admin interface
- [ ] Verify duplicates are prevented
- [ ] Confirm scheduler generates correct occurrences
- [ ] Test provider confirmation workflow

## Monitoring & Maintenance

### Daily Monitoring
```bash
# Check scheduler health
pnpm monitor

# View recent system logs
pnpm monitor:json | jq '.stats'
```

### Weekly Maintenance
```bash
# Check for any new duplicates (should be 0)
# Run via Supabase dashboard or API
SELECT COUNT(*) - COUNT(DISTINCT CONCAT(venue_id, '|', event_type, '|', day_of_week, '|', start_time)) as duplicates
FROM events WHERE is_active = true;

# Review provider confirmation rates
SELECT 
  tp.name,
  COUNT(*) FILTER (WHERE eo.status = 'confirmed') as confirmed,
  COUNT(*) FILTER (WHERE eo.status = 'scheduled') as pending,
  COUNT(*) as total
FROM event_occurrences eo
JOIN events e ON eo.event_id = e.id  
JOIN trivia_providers tp ON e.provider_id = tp.id
WHERE eo.occurrence_date >= CURRENT_DATE
GROUP BY tp.name
ORDER BY pending DESC;
```

### Alerts to Set Up
- [ ] Scheduler failures
- [ ] High number of unconfirmed events
- [ ] Database constraint violations
- [ ] API endpoint errors

## Migration Plan

### Phase 1: Fix Current Issues ✅
1. Deploy duplicate prevention constraint
2. Run cleanup script
3. Update import processes

### Phase 2: Enhanced Admin Interface (Next Sprint)
1. Add frequency selection to event form
2. Add one-time event support
3. Improve event management UI
4. Add bulk operations

### Phase 3: Advanced Scheduling (Future)
1. Monthly event support
2. Bi-weekly event support
3. Custom scheduling
4. Event series management

### Phase 4: Provider Self-Service (Future)
1. Provider registration system
2. Venue claiming process
3. Self-service event management
4. Notification preferences

## Success Metrics

### Technical Metrics
- Zero duplicate events in database
- 100% scheduler uptime
- < 2s API response times
- Zero constraint violation errors

### Business Metrics
- Provider confirmation rate > 80%
- Event data accuracy > 95%
- User engagement with events
- Provider satisfaction scores

---

**Last Updated**: August 4, 2025
**Version**: 1.0
**Status**: Duplicate prevention implemented, frequency expansion planned