# Directory Reorganization & City-Aware Scraping

## What Was Done

### 1. Directory Structure Reorganization
```
trivia-backend/
├── providers/
│   ├── nerdytalk/
│   │   ├── scrape-nerdytalk-city-aware.js    # NEW: City-aware scraper
│   │   ├── import-nerdytalk-corrected.ts     # Enhanced import with corrections
│   │   ├── import-nerdytalk.ts               # Original import script
│   │   ├── nerdytalk-venue-corrections.json  # Manual corrections
│   │   └── *.json                            # All NerdyTalk data files
│   ├── challenge-entertainment/
│   │   ├── ce-data-*.json                    # CE data files
│   │   └── README.md                         # CE provider documentation
│   └── README.md                             # Provider standards documentation
├── supabase/                                 # Database scripts (unchanged)
└── package.json                              # Updated script paths
```

### 2. City-Aware NerdyTalk Scraper
**Problem Fixed**: The original scraper captured venue names without city context, causing Google Places API to match venues to wrong locations.

**Solution**: New `scrape-nerdytalk-city-aware.js` that:
- Parses city headers from weekly-clues page (e.g., "Shelbyville, TN", "Spring Hill, TN")
- Associates venues with their correct cities
- Creates proper addresses for Google Places lookup
- Handles cases like:
  ```
  Shelbyville, TN
   Tuesday, Casa Mexicana (Battle Bingo - Reminder Email)
  Spring Hill, TN  
   Monday, Casa Mexicana (Battle Bingo)
  ```

### 3. Enhanced Import Process
- **Corrections System**: Manual venue corrections for known issues
- **Deduplication**: Removes duplicate venue entries
- **City Context**: Preserves city information for accurate Google Places matching

## Fixes Applied

### ML Rose Franklin Issue
- **Before**: "ML ROSE – MELROSE" (no address) → incorrectly matched to Franklin
- **After**: City-aware scraper will properly capture "ML Rose Franklin" with correct city context

### Casa Mexicana Issues  
- **Before**: Multiple "Casa Mexicana" entries with no addresses → random Google matches
- **After**: "Casa Mexicana, Shelbyville, TN" and "Casa Mexicana, Spring Hill, TN" as separate venues

## Updated Commands

```bash
# New city-aware scraping
npm run scrape-nerdytalk-city-aware

# Import with corrections
npm run import-nerdytalk-corrected

# Import Challenge Entertainment  
npm run import-venues providers/challenge-entertainment/ce-data-070725.json
```

## Next Steps

1. **Test the city-aware scraper**: Run `npm run scrape-nerdytalk-city-aware`
2. **Verify city associations**: Check that venues are properly linked to cities
3. **Import corrected data**: Use the corrected import process
4. **Validate fixes**: Confirm ML Rose Franklin and Casa Mexicana issues are resolved

This reorganization sets up a scalable structure for adding more trivia providers while fixing the core venue disambiguation problems.