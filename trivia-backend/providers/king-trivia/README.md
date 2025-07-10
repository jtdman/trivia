# King Trivia Scraper

## Overview
King Trivia is a nationwide trivia company with locations across major cities including Los Angeles, Denver, Dallas, New York, Boston, Orange County, San Diego, Ventura, and Inland Empire.

## Website Structure
- Main site: https://www.kingtrivia.com
- Location finder: https://kingtrivia.com/where-to-play/
- Contact: Contact@KingTrivia.com, 818-808-0008

## Game Types
- Pub Quiz (their original trivia game)
- Music Bingo
- Survey Slam™ (poll-based quiz)
- Special Events

## Scraping Strategy
The King Trivia website uses a location-based search system. Initial analysis suggests:

1. **Search Endpoint**: The site has a ZIP code search functionality
2. **Data Structure**: Venues are likely returned via AJAX/API calls
3. **Coverage**: Nationwide with focus on major metropolitan areas

## Implementation Plan
1. Analyze network requests when searching for venues
2. Identify API endpoints or form submissions
3. Extract venue information including:
   - Venue name and address
   - Game schedules (day/time)
   - Game types offered
   - Contact information
4. Transform data to match our database schema

## Database Schema Mapping
- Provider: King Trivia
- Venue data maps to `venues` table
- Event data maps to `events` table with `provider_id` reference