# Challenge Entertainment Provider

Challenge Entertainment provides structured JSON data files containing venue and event information.

## Data Structure

Challenge Entertainment data files contain arrays of venue objects with:
- Venue information (name, address, website, social links)
- Show schedules with dates, times, and game types
- Scraped timestamps

## Files

- `ce-data-*.json` - Raw data files from Challenge Entertainment
- `import-ce.ts` - Import script for CE data (uses existing scripts/import-venues.ts)

## Usage

```bash
# Import Challenge Entertainment data
npm run import-venues providers/challenge-entertainment/ce-data-070725.json
```

## Data Quality Notes

- CE data includes full addresses suitable for Google Places API lookup
- Venue names are generally consistent
- Event scheduling follows regular weekly patterns
- Some venues may have multiple event types (Live Trivia, Singo, Ballistic Bingo, etc.)