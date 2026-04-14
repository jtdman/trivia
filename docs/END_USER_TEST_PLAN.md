# End User Test Plan - TriviaNeary.com

## Overview
This test plan covers comprehensive testing of the end-user experience for the trivia discovery application across different devices, locations, and scenarios.

## Test Environment
- **Production URL**: https://trivianearby.com
- **Target Users**: General public looking for trivia events
- **Primary Use Case**: Find nearby trivia events by location and date

## 1. Platform & Device Testing

### 1.1 Desktop Testing
**Browsers to test:**
- Chrome (latest)
- Safari (latest) 
- Firefox (latest)
- Edge (latest)

**Screen Resolutions:**
- 1920x1080 (common desktop)
- 1366x768 (smaller laptops)
- 2560x1440 (high-res displays)

**Test Items:**
- [ ] Page load performance (<3 seconds)
- [ ] Navigation responsiveness
- [ ] Location search autocomplete
- [ ] Event card display and scrolling
- [ ] Date filter functionality
- [ ] Theme toggle (dark/light)
- [ ] Map integration (if applicable)

### 1.2 Mobile Testing
**Devices to test:**
- iOS (iPhone 12+, Safari)
- Android (Chrome browser)
- Various screen sizes (small phones to tablets)

**Test Items:**
- [ ] Touch interactions and scrolling
- [ ] Location permission prompts
- [ ] Mobile-first responsive design
- [ ] Tap targets are appropriate size
- [ ] Text readability on small screens
- [ ] Performance on slower connections

## 2. Location Testing

### 2.1 Location Input Methods

#### GPS Location Sharing
**Test Scenarios:**
- [ ] User allows location access on first visit
- [ ] User initially denies then allows location access
- [ ] User denies location access (fallback behavior)
- [ ] Location service is disabled on device
- [ ] GPS accuracy in urban vs suburban areas

#### Manual Location Entry
**Test Scenarios:**
- [ ] Search by city, state (e.g., "Nashville, TN")
- [ ] Search by ZIP code
- [ ] Search by venue name
- [ ] Search by partial address
- [ ] Invalid location handling
- [ ] Autocomplete suggestions work properly

### 2.2 Geographic Test Locations

#### Tennessee Cities (High Event Density)
**Test each location for event discovery:**

1. **Nashville, TN**
   - Expected: High number of events (20+ venues)
   - Test: All date filters (Today/Tomorrow/This Week)
   - Verify: Distance calculations are accurate

2. **Franklin, TN**  
   - Expected: 27-31 trivia events on Tuesday
   - Test: Event data matches admin dashboard
   - Verify: Proper venue details and images

3. **Memphis, TN**
   - Expected: Moderate event density
   - Test: Cross-city distance calculations
   - Verify: Events span multiple days

4. **Chattanooga, TN**
   - Expected: Moderate event density
   - Test: Mountain/terrain impact on GPS
   - Verify: Event diversity (different providers)

5. **Clarksville, TN**
   - Expected: Lower event density
   - Test: Boundary cases with fewer results
   - Verify: "No events" messaging when appropriate

#### Out-of-State Locations (Low Event Density)
**Test sparse event scenarios:**

1. **Birmingham, AL**
   - Expected: 1-3 events maximum
   - Test: Proper handling of limited results
   - Verify: Distance calculations across state lines

2. **Atlanta, GA**
   - Expected: Few events from partner providers
   - Test: Event data accuracy
   - Verify: User experience with limited options

3. **Tampa, FL**
   - Expected: Minimal events
   - Test: "No events found" user flow
   - Verify: Suggestions for nearby areas

4. **Columbus, OH**
   - Expected: Very few events
   - Test: Long-distance search behavior
   - Verify: Performance with sparse data

5. **Indianapolis, IN**
   - Expected: Minimal to no events
   - Test: Zero results handling
   - Verify: Appropriate messaging and CTAs

## 3. Date Filter Testing

### 3.1 Filter Functionality
**Test each filter option:**

- [ ] **Today**: Shows only today's events
- [ ] **Tomorrow**: Shows only tomorrow's events (KNOWN ISSUE - NEEDS DEBUG)
- [ ] **This Week**: Shows events for current week (NEEDS VERIFICATION)

### 3.2 Date Boundary Testing
- [ ] Test at midnight (date rollover)
- [ ] Test on Sunday (week rollover) 
- [ ] Test end of month transitions
- [ ] Test during timezone changes (DST)

### 3.3 Event Data Consistency
**Verify data integrity between tables:**
- [ ] Events table has proper event definitions
- [ ] Event_occurrences table has specific date instances
- [ ] Date filters query correct table
- [ ] No orphaned occurrences without parent events
- [ ] Recurring events generate proper occurrences

## 4. User Experience Testing

### 4.1 First-Time User Journey
1. [ ] User lands on homepage
2. [ ] Location permission prompt appears
3. [ ] User grants/denies location access
4. [ ] Default view shows nearby events
5. [ ] User can browse event cards
6. [ ] User can filter by date
7. [ ] User can get directions to venue

### 4.2 Return User Journey
1. [ ] User location is remembered
2. [ ] Previous preferences maintained
3. [ ] Updated event data loads
4. [ ] Performance is faster (caching)

### 4.3 Event Discovery Flow
**Test user can easily:**
- [ ] View event details (name, venue, time, prize money)
- [ ] See venue photos where available
- [ ] Get distance and direction information
- [ ] Access venue contact information
- [ ] Share events with others

## 5. Performance Testing

### 5.1 Load Times
- [ ] Initial page load <3 seconds
- [ ] Location search response <2 seconds
- [ ] Event filtering <1 second
- [ ] Image loading doesn't block content

### 5.2 Network Conditions
- [ ] 4G connection performance
- [ ] 3G connection graceful degradation
- [ ] Offline behavior (cached data)
- [ ] Slow connection timeouts

## 6. Error Handling & Edge Cases

### 6.1 Location Errors
- [ ] GPS unavailable
- [ ] Location permission denied
- [ ] Invalid location entered
- [ ] Location outside service area

### 6.2 Data Errors
- [ ] No events found for location
- [ ] No events for selected date
- [ ] API timeouts
- [ ] Venue images fail to load

### 6.3 Browser/Device Issues
- [ ] JavaScript disabled
- [ ] Ad blockers enabled
- [ ] Cookie/storage restrictions
- [ ] Very old browsers

## 7. Data Verification Tasks

### 7.1 Event Data Accuracy
- [ ] Verify event times are correct
- [ ] Confirm venue addresses are accurate
- [ ] Check venue photos display properly
- [ ] Validate prize money information

### 7.2 Database Consistency Checks
**Technical verification:**
```sql
-- Check for orphaned event occurrences
SELECT COUNT(*) FROM event_occurrences eo 
LEFT JOIN events e ON eo.event_id = e.id 
WHERE e.id IS NULL;

-- Verify current week has events
SELECT COUNT(*) FROM event_occurrences 
WHERE event_date >= CURRENT_DATE 
AND event_date < CURRENT_DATE + INTERVAL '7 days';

-- Check Tomorrow filter data exists
SELECT COUNT(*) FROM event_occurrences 
WHERE event_date = CURRENT_DATE + INTERVAL '1 day';
```

## 8. Accessibility Testing

### 8.1 Screen Reader Compatibility
- [ ] Event cards read properly
- [ ] Navigation is accessible
- [ ] Form inputs have proper labels
- [ ] Images have alt text

### 8.2 Keyboard Navigation
- [ ] Tab order is logical
- [ ] All interactive elements accessible
- [ ] Focus indicators visible
- [ ] Skip links available

## 9. Critical Issues to Address

### 9.1 Known Issues (From CLAUDE.md)
- **URGENT**: Tomorrow filter not showing results
- **URGENT**: This Week filter likely broken
- Need to debug date filter logic in useVenues.ts

### 9.2 Required Database Fixes
- Apply RLS policy fix: `/Users/jason/code/trivia/trivia-backend/supabase/migrations/20250812_fix_user_venues_policy.sql`

## 10. Success Criteria

### 10.1 Functionality
- [ ] All date filters return correct results
- [ ] Location detection works >95% of time
- [ ] Event data is accurate and current
- [ ] Images load properly for >80% of venues

### 10.2 Performance  
- [ ] Page loads in <3 seconds on 4G
- [ ] Search responds in <2 seconds
- [ ] Mobile performance is smooth (60fps scrolling)

### 10.3 User Experience
- [ ] Users can find events in <30 seconds
- [ ] Interface is intuitive without instructions
- [ ] Error messages are helpful and actionable
- [ ] Works consistently across all tested devices

## 11. Post-Testing Actions

### 11.1 Issue Documentation
- Document all bugs found with reproduction steps
- Prioritize issues by severity (Critical/High/Medium/Low)
- Create GitHub issues for development tracking

### 11.2 Data Quality Review
- Verify event data freshness
- Check for duplicate or stale events
- Confirm venue information accuracy

### 11.3 Performance Optimization
- Identify slow queries or API calls
- Optimize image loading and sizing
- Review caching strategies

---

## Testing Schedule Recommendation

**Phase 1** (Day 1-2): Core functionality and date filter debugging
**Phase 2** (Day 3-4): Location testing across Tennessee cities  
**Phase 3** (Day 5): Out-of-state and edge case testing
**Phase 4** (Day 6): Performance and accessibility testing
**Phase 5** (Day 7): Bug fixes and retesting

**Note**: Focus first on fixing the Tomorrow and This Week date filter issues before comprehensive testing, as these are critical user-facing features.