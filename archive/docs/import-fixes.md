# NerdyTalk Import Fixes Required

## Issues Found

### 1. ML Rose Franklin Missing
- **Problem**: Franklin location (Thursday 7:30 PM) not scraped
- **Current**: "ML ROSE – MELROSE" (no address) incorrectly matched to Franklin by Google
- **Fix**: Improve scraper to capture ML Rose Franklin specifically

### 2. Casa Mexicana Venue Disambiguation  
- **Problem**: Multiple Casa Mexicana entries with no addresses
- **Current**: All get matched to random locations by Google Places
- **Fix**: Improve scraper to capture addresses or add manual mapping

### 3. Duplicate Venue Detection
- **Problem**: Same venue appears multiple times with slight name variations
- **Fix**: Add deduplication logic in import process

## Required Fixes

### A. Enhanced Scraper (scrape-nerdytalk-comprehensive.js)
1. Better address extraction from venue detail pages
2. Venue name standardization
3. Location-specific scraping for ML Rose locations

### B. Import Process Improvements (import-nerdytalk.ts)
1. Venue deduplication before Google Places lookup
2. Manual venue mapping for known problematic venues
3. Address validation before Google Places API calls

### C. Manual Venue Corrections
1. Create corrections file for known venue mappings
2. ML Rose Franklin: Thursday 7:30 PM trivia
3. Casa Mexicana Shelbyville: Tuesday 6:30 PM Battle Bingo

## Implementation Priority
1. **Immediate**: Create manual corrections file
2. **Short-term**: Improve import deduplication  
3. **Long-term**: Enhanced scraper with better address extraction