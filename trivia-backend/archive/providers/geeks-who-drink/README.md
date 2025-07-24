# Geeks Who Drink Scraper

## Overview
Geeks Who Drink is a nationwide trivia company operating in bars, restaurants, and Dave & Buster's locations. They offer multiple game formats and have a robust venue search system.

## Website Structure
- Main site: https://www.geekswhodrink.com
- Venue search: https://www.geekswhodrink.com/venues
- Contact: sales@geekswhodrink.com, info@geekswhodrink.com, 303-532-4737

## Game Types
- **GWD Classic**: Their flagship 7-round trivia game
- **Small Batch Trivia**: Smaller format trivia
- **Jeopardy! Bar League**: Licensed Jeopardy format
- **Boombox Bingo**: Music-based bingo game
- **Theme Quizzes**: Specialized topic quizzes
- **Dave & Buster's Events**: Venue-specific events
- **Quiz for a Cause**: Charity-focused events
- **Theme Bingo**: Themed bingo variants
- **Special Events**: One-off or seasonal events

## Scraping Strategy
1. **City-based Search**: Search major cities for venue listings
2. **HTML Parsing**: Extract venue information from search results
3. **Schedule Extraction**: Parse day/time information from event listings
4. **Game Type Mapping**: Standardize game types to our database format
5. **Deduplication**: Remove duplicate venues and events

## Target Cities
- Denver, CO (their home base)
- Austin, TX
- Portland, OR
- Seattle, WA
- San Francisco, CA
- Los Angeles, CA
- Chicago, IL
- New York, NY
- Boston, MA
- Atlanta, GA
- Miami, FL
- Phoenix, AZ

## Database Schema Mapping
- Provider: Geeks Who Drink
- Venue data maps to `venues` table
- Event data maps to `events` table with `provider_id` reference
- Game types are standardized for consistency

## Implementation Notes
- Respectful scraping with delays between requests
- Handles various HTML structures for venue listings
- Extracts schedule information to create event records
- Generates SQL with conflict handling for database insertion