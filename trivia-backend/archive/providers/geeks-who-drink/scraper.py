#!/usr/bin/env python3
"""
Geeks Who Drink Scraper

This script scrapes venue and event information from Geeks Who Drink's website
and formats it for insertion into our trivia database.
"""

import requests
import json
import time
from typing import List, Dict, Optional
from dataclasses import dataclass, asdict
from datetime import datetime
import re
from bs4 import BeautifulSoup
import logging
from urllib.parse import urljoin, urlparse, parse_qs

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class Venue:
    """Venue data structure matching our database schema"""
    name_original: str
    address_original: str
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    phone_number: Optional[str] = None
    website: Optional[str] = None
    verification_status: str = "needs_review"
    is_imported: bool = True
    import_source: str = "geeks_who_drink"

@dataclass
class Event:
    """Event data structure matching our database schema"""
    event_type: str
    day_of_week: str
    start_time: str
    venue_name: str  # For matching with venue
    end_time: Optional[str] = None
    is_active: bool = True

class GeeksWhoDrinkScraper:
    def __init__(self):
        self.base_url = "https://www.geekswhodrink.com"
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        })
        
        # Major cities to search
        self.cities = [
            ('Denver', 'CO'),
            ('Austin', 'TX'),
            ('Portland', 'OR'),
            ('Seattle', 'WA'),
            ('San Francisco', 'CA'),
            ('Los Angeles', 'CA'),
            ('Chicago', 'IL'),
            ('New York', 'NY'),
            ('Boston', 'MA'),
            ('Atlanta', 'GA'),
            ('Miami', 'FL'),
            ('Phoenix', 'AZ')
        ]
        
        # Game type mappings
        self.game_types = {
            'GWD Classic': 'Geeks Who Drink Classic',
            'Small Batch Trivia': 'Small Batch Trivia',
            'Jeopardy! Bar League': 'Jeopardy Bar League',
            'Boombox Bingo': 'Boombox Bingo',
            'Theme Quizzes': 'Theme Quiz',
            'Quiz for a Cause': 'Quiz for a Cause',
            'Theme Bingo': 'Theme Bingo',
            'Special Events': 'Special Event'
        }
        
        # Day mapping for standardization
        self.day_mapping = {
            'monday': 'Monday',
            'tuesday': 'Tuesday', 
            'wednesday': 'Wednesday',
            'thursday': 'Thursday',
            'friday': 'Friday',
            'saturday': 'Saturday',
            'sunday': 'Sunday',
            'mon': 'Monday',
            'tue': 'Tuesday',
            'wed': 'Wednesday',
            'thu': 'Thursday',
            'fri': 'Friday',
            'sat': 'Saturday',
            'sun': 'Sunday'
        }

    def search_venues_by_city(self, city: str, state: str) -> List[Dict]:
        """Search for venues in a specific city"""
        logger.info(f"Searching venues in {city}, {state}")
        
        try:
            # Try the venues endpoint with city/state parameters
            search_url = f"{self.base_url}/venues"
            params = {
                'city': city,
                'state': state
            }
            
            response = self.session.get(search_url, params=params)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            venues_data = []
            
            # Look for JSON data in script tags
            scripts = soup.find_all('script')
            for script in scripts:
                if script.string and ('venue' in script.string.lower() or 'location' in script.string.lower()):
                    venues_data.extend(self._extract_json_from_script(script.string))
            
            # If no JSON found, try to parse HTML structure
            if not venues_data:
                venues_data = self._parse_venue_html(soup)
            
            return venues_data
            
        except requests.RequestException as e:
            logger.error(f"Error searching {city}, {state}: {e}")
            return []

    def _extract_json_from_script(self, script_content: str) -> List[Dict]:
        """Extract JSON data from JavaScript content"""
        venues_data = []
        
        try:
            # Look for various JSON patterns
            json_patterns = [
                r'venues\s*:\s*(\[.*?\])',
                r'locations\s*:\s*(\[.*?\])',
                r'events\s*:\s*(\[.*?\])',
                r'gameData\s*:\s*(\[.*?\])',
                r'\{[^{}]*venue[^{}]*\}',
                r'\{[^{}]*location[^{}]*\}',
                r'\{[^{}]*address[^{}]*\}'
            ]
            
            for pattern in json_patterns:
                matches = re.findall(pattern, script_content, re.IGNORECASE | re.DOTALL)
                for match in matches:
                    try:
                        data = json.loads(match)
                        if isinstance(data, list):
                            venues_data.extend(data)
                        elif isinstance(data, dict):
                            venues_data.append(data)
                    except json.JSONDecodeError:
                        continue
            
        except Exception as e:
            logger.error(f"Error extracting JSON from script: {e}")
        
        return venues_data

    def _parse_venue_html(self, soup: BeautifulSoup) -> List[Dict]:
        """Parse HTML structure to extract venue information"""
        venues_data = []
        
        # Look for common venue listing patterns
        venue_selectors = [
            '.venue-listing',
            '.venue-item',
            '.location-item',
            '.venue-card',
            '.game-location',
            '[data-venue]',
            '.venue-info',
            '.location-info'
        ]
        
        venue_elements = []
        for selector in venue_selectors:
            elements = soup.select(selector)
            if elements:
                venue_elements.extend(elements)
        
        # Process venue elements
        for element in venue_elements:
            venue_data = self._extract_venue_from_element(element)
            if venue_data:
                venues_data.append(venue_data)
        
        # If no structured elements found, try text extraction
        if not venues_data:
            venues_data = self._extract_venues_from_text(soup.get_text())
        
        return venues_data

    def _extract_venue_from_element(self, element) -> Optional[Dict]:
        """Extract venue information from an HTML element"""
        try:
            # Try to find venue name
            name_selectors = ['.venue-name', '.location-name', 'h3', 'h4', '.name']
            name = None
            
            for selector in name_selectors:
                name_elem = element.select_one(selector)
                if name_elem:
                    name = name_elem.get_text(strip=True)
                    break
            
            if not name:
                # Fallback to element text
                name = element.get_text(strip=True)
                # Clean up name (remove extra whitespace, etc.)
                name = ' '.join(name.split())[:100]  # Limit length
            
            # Try to find address
            address_selectors = ['.address', '.venue-address', '.location-address', 'address']
            address = None
            
            for selector in address_selectors:
                addr_elem = element.select_one(selector)
                if addr_elem:
                    address = addr_elem.get_text(strip=True)
                    break
            
            # Try to find schedule/day info
            schedule_selectors = ['.schedule', '.day', '.time', '.when']
            schedule = None
            
            for selector in schedule_selectors:
                sched_elem = element.select_one(selector)
                if sched_elem:
                    schedule = sched_elem.get_text(strip=True)
                    break
            
            # Try to find game type
            game_type_selectors = ['.game-type', '.event-type', '.quiz-type']
            game_type = None
            
            for selector in game_type_selectors:
                type_elem = element.select_one(selector)
                if type_elem:
                    game_type = type_elem.get_text(strip=True)
                    break
            
            if name:
                return {
                    'name': name,
                    'address': address,
                    'schedule': schedule,
                    'game_type': game_type
                }
            
        except Exception as e:
            logger.error(f"Error extracting venue from element: {e}")
        
        return None

    def _extract_venues_from_text(self, text: str) -> List[Dict]:
        """Extract venue information from plain text"""
        venues = []
        
        # Look for patterns that might indicate venue information
        lines = text.split('\n')
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Look for lines that might contain venue names
            # (This is a simplified approach - would need more sophisticated parsing)
            if (len(line) > 5 and len(line) < 100 and 
                not line.startswith('http') and 
                not line.isdigit() and
                any(keyword in line.lower() for keyword in ['bar', 'restaurant', 'pub', 'grill', 'tavern', 'brewery', 'cafe'])):
                
                venues.append({
                    'name': line,
                    'address': None,
                    'schedule': None,
                    'game_type': None
                })
        
        return venues

    def scrape_all_venues(self) -> tuple[List[Venue], List[Event]]:
        """Scrape venues and events from all target cities"""
        all_venues = []
        all_events = []
        
        for city, state in self.cities:
            logger.info(f"Scraping {city}, {state}")
            
            venue_data = self.search_venues_by_city(city, state)
            
            for data in venue_data:
                # Convert to venue
                venue = self._convert_to_venue(data, city, state)
                if venue:
                    all_venues.append(venue)
                
                # Extract event if schedule info available
                event = self._convert_to_event(data)
                if event:
                    all_events.append(event)
            
            # Be respectful - add delay between requests
            time.sleep(3)
        
        # Remove duplicates
        unique_venues = self._deduplicate_venues(all_venues)
        unique_events = self._deduplicate_events(all_events)
        
        logger.info(f"Found {len(unique_venues)} unique venues and {len(unique_events)} unique events")
        return unique_venues, unique_events

    def _convert_to_venue(self, data: Dict, city: str, state: str) -> Optional[Venue]:
        """Convert raw venue data to Venue object"""
        try:
            name = data.get('name', '').strip()
            address = data.get('address', '').strip()
            
            if not name:
                return None
            
            # If no address, use city/state
            if not address:
                address = f"{city}, {state}"
            
            # Parse address components
            parsed_city, parsed_state, zip_code = self._parse_address(address)
            
            # Use provided city/state if parsing failed
            if not parsed_city:
                parsed_city = city
            if not parsed_state:
                parsed_state = state
            
            return Venue(
                name_original=name,
                address_original=address,
                city=parsed_city,
                state=parsed_state,
                zip_code=zip_code
            )
            
        except Exception as e:
            logger.error(f"Error converting venue data: {e}")
            return None

    def _convert_to_event(self, data: Dict) -> Optional[Event]:
        """Convert raw data to Event object if schedule info available"""
        try:
            schedule = data.get('schedule', '').strip()
            game_type = data.get('game_type', '').strip()
            venue_name = data.get('name', '').strip()
            
            if not schedule or not venue_name:
                return None
            
            # Parse schedule for day and time
            day_of_week, start_time = self._parse_schedule(schedule)
            
            if not day_of_week or not start_time:
                return None
            
            # Map game type
            event_type = self.game_types.get(game_type, game_type or 'Geeks Who Drink Trivia')
            
            return Event(
                event_type=event_type,
                day_of_week=day_of_week,
                start_time=start_time,
                venue_name=venue_name
            )
            
        except Exception as e:
            logger.error(f"Error converting event data: {e}")
            return None

    def _parse_schedule(self, schedule: str) -> tuple[Optional[str], Optional[str]]:
        """Parse schedule string to extract day and time"""
        if not schedule:
            return None, None
        
        schedule = schedule.lower()
        
        # Look for day of week
        day_of_week = None
        for day_key, day_value in self.day_mapping.items():
            if day_key in schedule:
                day_of_week = day_value
                break
        
        # Look for time patterns
        time_patterns = [
            r'(\d{1,2}):(\d{2})\s*(am|pm)',
            r'(\d{1,2})\s*(am|pm)',
            r'(\d{1,2}):(\d{2})'
        ]
        
        start_time = None
        for pattern in time_patterns:
            match = re.search(pattern, schedule)
            if match:
                if len(match.groups()) == 3:  # HH:MM AM/PM
                    hour, minute, ampm = match.groups()
                    start_time = f"{hour}:{minute} {ampm.upper()}"
                elif len(match.groups()) == 2:
                    if match.group(2) in ['am', 'pm']:  # H AM/PM
                        hour, ampm = match.groups()
                        start_time = f"{hour}:00 {ampm.upper()}"
                    else:  # HH:MM (24-hour)
                        hour, minute = match.groups()
                        start_time = f"{hour}:{minute}"
                break
        
        return day_of_week, start_time

    def _parse_address(self, address: str) -> tuple[Optional[str], Optional[str], Optional[str]]:
        """Parse address into city, state, zip components"""
        if not address:
            return None, None, None
        
        city = None
        state = None
        zip_code = None
        
        # Simple parsing - look for city, state pattern
        if ',' in address:
            parts = address.split(',')
            if len(parts) >= 2:
                city = parts[0].strip()
                
                # Look for state in the last part
                last_part = parts[-1].strip()
                state_match = re.search(r'\b([A-Z]{2})\b', last_part)
                if state_match:
                    state = state_match.group(1)
                
                # Look for ZIP code
                zip_match = re.search(r'\b(\d{5})\b', last_part)
                if zip_match:
                    zip_code = zip_match.group(1)
        
        return city, state, zip_code

    def _deduplicate_venues(self, venues: List[Venue]) -> List[Venue]:
        """Remove duplicate venues based on name and address"""
        seen = set()
        unique_venues = []
        
        for venue in venues:
            key = (venue.name_original.lower(), venue.address_original.lower())
            if key not in seen:
                seen.add(key)
                unique_venues.append(venue)
        
        return unique_venues

    def _deduplicate_events(self, events: List[Event]) -> List[Event]:
        """Remove duplicate events"""
        seen = set()
        unique_events = []
        
        for event in events:
            key = (event.venue_name.lower(), event.day_of_week, event.start_time)
            if key not in seen:
                seen.add(key)
                unique_events.append(event)
        
        return unique_events

    def generate_sql_inserts(self, venues: List[Venue], events: List[Event]) -> str:
        """Generate SQL INSERT statements for venues and events"""
        sql_parts = []
        sql_parts.append("-- Geeks Who Drink venues and events import")
        sql_parts.append("-- Generated on: " + datetime.now().isoformat())
        sql_parts.append("")
        
        if venues:
            sql_parts.append("-- Insert venues")
            sql_parts.append("INSERT INTO venues (")
            sql_parts.append("    name_original, address_original, city, state, zip_code,")
            sql_parts.append("    phone_number, website, verification_status, is_imported, import_source")
            sql_parts.append(") VALUES")
            
            venue_values = []
            for venue in venues:
                values = [
                    f"'{venue.name_original.replace("'", "''")}'",
                    f"'{venue.address_original.replace("'", "''")}'",
                    f"'{venue.city}'" if venue.city else "NULL",
                    f"'{venue.state}'" if venue.state else "NULL",
                    f"'{venue.zip_code}'" if venue.zip_code else "NULL",
                    f"'{venue.phone_number}'" if venue.phone_number else "NULL",
                    f"'{venue.website}'" if venue.website else "NULL",
                    f"'{venue.verification_status}'",
                    str(venue.is_imported).lower(),
                    f"'{venue.import_source}'"
                ]
                venue_values.append(f"    ({', '.join(values)})")
            
            sql_parts.append(',\n'.join(venue_values))
            sql_parts.append("ON CONFLICT (name_original, address_original) DO NOTHING;")
            sql_parts.append("")
        
        if events:
            sql_parts.append("-- Insert events (commented out - needs manual venue ID matching)")
            sql_parts.append("/*")
            sql_parts.append("INSERT INTO events (")
            sql_parts.append("    venue_id, event_type, day_of_week, start_time, end_time,")
            sql_parts.append("    is_active, provider_id")
            sql_parts.append(") VALUES")
            
            event_values = []
            for event in events:
                values = [
                    f"(SELECT id FROM venues WHERE name_original = '{event.venue_name.replace("'", "''")}' LIMIT 1)",
                    f"'{event.event_type}'",
                    f"'{event.day_of_week}'",
                    f"'{event.start_time}'",
                    f"'{event.end_time}'" if event.end_time else "NULL",
                    str(event.is_active).lower(),
                    "(SELECT id FROM trivia_providers WHERE name = 'Geeks Who Drink' LIMIT 1)"
                ]
                event_values.append(f"    ({', '.join(values)})")
            
            sql_parts.append(',\n'.join(event_values))
            sql_parts.append("ON CONFLICT DO NOTHING;")
            sql_parts.append("*/")
            sql_parts.append("")
        
        return '\n'.join(sql_parts)

def main():
    """Main function to run the scraper"""
    scraper = GeeksWhoDrinkScraper()
    
    try:
        logger.info("Starting Geeks Who Drink scraper...")
        venues, events = scraper.scrape_all_venues()
        
        if venues or events:
            # Generate SQL
            sql_content = scraper.generate_sql_inserts(venues, events)
            
            # Write to file
            output_file = '/home/jason/code/trivia/trivia-backend/providers/geeks-who-drink/venues_events.sql'
            with open(output_file, 'w') as f:
                f.write(sql_content)
            
            logger.info(f"Generated SQL file: {output_file}")
            logger.info(f"Found {len(venues)} venues and {len(events)} events")
            
            # Also save as JSON for debugging
            data = {
                'venues': [asdict(venue) for venue in venues],
                'events': [asdict(event) for event in events]
            }
            
            json_file = '/home/jason/code/trivia/trivia-backend/providers/geeks-who-drink/data.json'
            with open(json_file, 'w') as f:
                json.dump(data, f, indent=2)
            
            logger.info(f"Saved JSON debug file: {json_file}")
            
        else:
            logger.warning("No venues or events found")
            
    except Exception as e:
        logger.error(f"Scraper failed: {e}")
        raise

if __name__ == "__main__":
    main()