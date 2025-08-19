# Live Testing Notes - Date Filter Issues

## Test Setup
- **Date**: 2025-08-12 (Tuesday)
- **Dev Server**: localhost:5173 (trivia-nearby)
- **Database Status**: ✅ Data confirmed present
  - Today (2025-08-12): 267 events
  - Tomorrow (2025-08-13): 263 events  
  - This Week (2025-08-12 to 2025-08-18): 975 events

## Test Plan Phase 1: Critical Date Filter Issues

### 1. Test Location: Franklin, TN
**Expected Results:**
- Today: Should show events (known to be ~27-31 venues on Tuesday)
- Tomorrow: Should show events (KNOWN ISSUE - likely 0 results)
- This Week: Should show events (KNOWN ISSUE - may not work)

### 2. Browser Console Debug Steps
1. Open Developer Tools
2. Go to Console tab
3. Look for useVenues debug logs:
   - `🔍 useVenues fetchVenues called with options:`
   - `📅 TODAY/TOMORROW/THIS-WEEK filter: Using date`
   - `📊 Final date filter params:`
4. Check for any errors in the API calls

### 3. Network Tab Debug Steps
1. Open Network tab
2. Clear existing requests
3. Test each date filter
4. Look for:
   - Supabase RPC calls to `get_venues_with_distance`
   - Event_occurrences table queries
   - Any failed requests (red entries)

### 4. Test Sequence
1. Navigate to app
2. Use "Share My Location" or enter "Franklin, TN"
3. Wait for Today results to load
4. Click "Tomorrow" button → Check console + results
5. Click "This Week" button → Check console + results
6. Click "Today" button → Verify it still works

## Expected Issues to Find
- **Tomorrow filter**: Likely returns 0 results despite DB having 263 events
- **This Week filter**: May return 0 results or incorrect data
- **Root cause**: Probably in useVenues.ts date range logic or SQL query parameters

## Success Criteria
- Today: ✅ Works (baseline)
- Tomorrow: Should show 263 events for 2025-08-13
- This Week: Should show 975 events for 2025-08-12 to 2025-08-18

---

## Test Results (To be filled during testing)

### Test Run 1 - Franklin, TN
- **Today**: 
- **Tomorrow**: 
- **This Week**: 

### Console Errors Found:
(To be documented)

### Network Issues Found:
(To be documented)

### Root Cause Analysis:
(To be documented)