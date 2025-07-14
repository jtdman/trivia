# Brain Blast Trivia Provider

## Overview
Brain Blast Trivia (brainblasttrivia.com) provides trivia, bingo, and other entertainment shows across 5 states: Alabama, Georgia, Indiana, Kentucky, and Tennessee.

## Data Structure
Each state page contains:
- **Cities**: Organized alphabetically
- **Venues**: Listed in tabular format with:
  - Day (weekly frequency assumed)
  - Time 
  - Location name
  - Phone number (ignored - will get from Google)
  - Show type (Trivia, Survey Time Showdown, Bingo, Singo, etc.)

## States Covered
- Alabama: ~10-15 cities
- Georgia: ~4 cities 
- Indiana: ~12 cities, 25 venues
- Kentucky: TBD
- Tennessee: TBD

## Scraping Notes
- Each state has its own subpage: `/where-to-play/{state}/`
- Consistent tabular format across all states
- Some venues may be "on summer break" or seasonal
- Multiple show types per provider
- Venues primarily restaurants/bars

## Data Quality
- Clean city organization
- Consistent venue format
- Phone numbers available but will be replaced with Google data
- Should result in minimal failed/ambiguous locations