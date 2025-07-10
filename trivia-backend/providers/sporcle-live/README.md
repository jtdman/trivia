# Sporcle Live Scraper

## Overview
Sporcle Live is a trivia platform that offers pub quizzes, virtual events, and themed trivia nights. Their website contains structured data that can be extracted for venue and event information.

## Website Structure
- Main site: https://www.sporcle.com
- Events page: https://www.sporcle.com/events/locations
- Data is loaded via JavaScript payloads in `app.payload.shows` and related objects

## Game Types
- Pub Quiz
- Virtual Pub Quiz
- Opinionation
- Theme Nights
- Globe League
- Private Events

## Data Structure
The website contains JavaScript payloads with structured event data:
```javascript
app.payload.shows = [
  {
    "name": "Virtual Pub Quiz 7-9-2025 7:00 PM",
    "host_detail": {"name": "Kate", "location": "Twin Cities, MN"},
    "date_and_time": "1752102000",
    "link": "https://sporcle.zoom.us/j/...",
    "game_type": "virtual-pub-quiz"
  }
]
```

## Scraping Strategy
1. **Extract JavaScript Payloads**: Parse `app.payload.shows` and related data
2. **Process Events**: Convert timestamps and extract venue/timing information
3. **Deduplicate**: Remove duplicate venues based on name/location
4. **Generate SQL**: Create INSERT statements for our database schema

## Database Schema Mapping
- Provider: Sporcle Live
- Venues extracted from host locations
- Events with timing and game type information
- Maps to our `venues` and `events` tables with `provider_id` reference