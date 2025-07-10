#!/usr/bin/env python3
"""
Sporcle Live Scraper

This script scrapes venue and event information from Sporcle Live's website
and formats it for insertion into our trivia database.
"""

import requests
import json
import time
from typing import List, Dict, Optional
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
import re
from bs4 import BeautifulSoup
import logging

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
    import_source: str = "sporcle_live"

@dataclass
class Event:
    """Event data structure matching our database schema"""
    event_type: str
    day_of_week: str
    start_time: str
    venue_name: str  # For matching with venue
    end_time: Optional[str] = None
    is_active: bool = True

class SporcleLiveScraper:
    def __init__(self):
        self.base_url = "https://www.sporcle.com"
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
        
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

    def scrape_venues_and_events(self) -> tuple[List[Venue], List[Event]]:
        """Scrape venues and events from Sporcle Live"""
        logger.info("Starting Sporcle Live scraper...")
        
        # Get the events/locations page
        url = f"{self.base_url}/events/locations"
        
        try:
            response = self.session.get(url)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Look for JavaScript payload with venue/event data
            venues = []
            events = []
            
            # Find script tags containing app.payload data
            scripts = soup.find_all('script')
            for script in scripts:
                if script.string and 'app.payload' in script.string:
                    # Extract JSON data from JavaScript
                    venues_data, events_data = self._extract_payload_data(script.string)
                    
                    # Convert to our data structures
                    venues.extend(self._process_venues(venues_data))
                    events.extend(self._process_events(events_data))
            
            # If no payload found, try other approaches
            if not venues and not events:
                venues, events = self._scrape_from_html(soup)
            
            logger.info(f"Found {len(venues)} venues and {len(events)} events")
            return venues, events
            
        except requests.RequestException as e:
            logger.error(f"Error fetching Sporcle Live data: {e}")
            return [], []

    def _extract_payload_data(self, script_content: str) -> tuple[List[Dict], List[Dict]]:
        """Extract venue and event data from JavaScript payload"""
        venues_data = []
        events_data = []
        
        try:
            # Look for app.payload.shows or similar patterns
            show_match = re.search(r'app\.payload\.shows\s*=\s*(\[.*?\]);', script_content, re.DOTALL)
            if show_match:
                shows_json = show_match.group(1)
                shows = json.loads(shows_json)
                events_data = shows
            
            # Look for venue data
            venue_match = re.search(r'app\.payload\.venues\s*=\s*(\[.*?\]);', script_content, re.DOTALL)
            if venue_match:
                venues_json = venue_match.group(1)
                venues_data = json.loads(venues_json)
            
            # Look for location data
            location_match = re.search(r'app\.payload\.locations\s*=\s*(\[.*?\]);', script_content, re.DOTALL)
            if location_match:
                locations_json = location_match.group(1)
                locations = json.loads(locations_json)
                # Convert locations to venues if needed
                for location in locations:
                    if isinstance(location, dict) and 'name' in location:
                        venues_data.append(location)
        
        except (json.JSONDecodeError, AttributeError) as e:
            logger.error(f"Error parsing payload data: {e}")
        
        return venues_data, events_data

    def _process_venues(self, venues_data: List[Dict]) -> List[Venue]:
        """Process raw venue data into Venue objects"""
        venues = []
        
        for venue_data in venues_data:
            try:
                venue = self._convert_venue_data(venue_data)
                if venue:
                    venues.append(venue)
            except Exception as e:
                logger.error(f"Error processing venue data: {e}")
                continue
        
        return venues

    def _process_events(self, events_data: List[Dict]) -> List[Event]:
        """Process raw event data into Event objects"""
        events = []
        
        for event_data in events_data:
            try:
                event = self._convert_event_data(event_data)
                if event:
                    events.append(event)
            except Exception as e:
                logger.error(f"Error processing event data: {e}")
                continue
        
        return events

    def _convert_venue_data(self, data: Dict) -> Optional[Venue]:
        """Convert raw venue data to Venue object"""
        try:
            # Handle different possible data structures
            name = data.get('name', '').strip()
            
            # Try different address fields
            address = (data.get('address') or 
                      data.get('location') or 
                      data.get('venue_address') or 
                      data.get('full_address', '')).strip()
            
            if not name:
                return None
            
            # If no address, try to build from city/state
            if not address:
                city = data.get('city', '').strip()
                state = data.get('state', '').strip()
                if city and state:
                    address = f"{city}, {state}"
                elif city:
                    address = city
                else:
                    # Skip venues without location info
                    return None
            
            # Parse address components
            city, state, zip_code = self._parse_address(address)
            
            return Venue(
                name_original=name,
                address_original=address,
                city=city,
                state=state,
                zip_code=zip_code,
                phone_number=data.get('phone'),
                website=data.get('website')
            )
            
        except Exception as e:
            logger.error(f"Error converting venue data: {e}")
            return None

    def _convert_event_data(self, data: Dict) -> Optional[Event]:
        """Convert raw event data to Event object"""
        try:
            # Extract event info
            event_name = data.get('name', '').strip()
            game_type = data.get('game_type', 'pub-quiz').replace('-', ' ').title()
            
            # Extract venue info
            venue_name = "Unknown Venue"
            if 'host_detail' in data:
                host_info = data['host_detail']
                if isinstance(host_info, dict):
                    venue_name = host_info.get('name', 'Unknown Venue')
            
            # Extract timing info
            date_time = data.get('date_and_time')
            if date_time:
                # Convert timestamp to datetime
                try:
                    dt = datetime.fromtimestamp(int(date_time), tz=timezone.utc)
                    day_of_week = dt.strftime('%A')
                    start_time = dt.strftime('%H:%M')
                except (ValueError, TypeError):
                    # Try parsing as string
                    day_of_week = "Unknown"
                    start_time = "Unknown"
            else:
                day_of_week = "Unknown"
                start_time = "Unknown"
            
            # Skip if essential info is missing
            if not event_name or day_of_week == "Unknown":
                return None
            
            return Event(
                event_type=game_type,
                day_of_week=day_of_week,
                start_time=start_time,
                venue_name=venue_name,
                is_active=True
            )
            
        except Exception as e:
            logger.error(f"Error converting event data: {e}")
            return None

    def _scrape_from_html(self, soup: BeautifulSoup) -> tuple[List[Venue], List[Event]]:
        """Fallback method to scrape from HTML structure"""
        venues = []
        events = []
        
        # Look for venue listings in various HTML structures
        venue_selectors = [
            '.venue-listing',
            '.location-item',
            '.event-venue',
            '[data-venue]',
            '.venue-card'
        ]
        
        for selector in venue_selectors:
            elements = soup.select(selector)
            for element in elements:
                venue_data = self._extract_venue_from_element(element)
                if venue_data:
                    venue = self._convert_venue_data(venue_data)
                    if venue:
                        venues.append(venue)
        
        return venues, events

    def _extract_venue_from_element(self, element) -> Optional[Dict]:
        """Extract venue information from an HTML element"""
        try:
            # Try to extract venue information
            name = element.get_text(strip=True)
            
            # Look for address or location info
            address_elem = element.find(['address', '.address', '.location'])
            address = address_elem.get_text(strip=True) if address_elem else None
            
            return {
                'name': name,
                'address': address or name  # Use name as fallback
            }
            
        except Exception as e:
            logger.error(f"Error extracting venue from element: {e}")
            return None

    def _parse_address(self, address: str) -> tuple:
        """Parse address into city, state, zip components"""
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
        else:
            # Try to extract city from single string
            city = address.strip()
        
        return city, state, zip_code

    def _deduplicate_venues(self, venues: List[Venue]) -> List[Venue]:
        """Remove duplicate venues"""
        seen = set()
        unique_venues = []
        
        for venue in venues:
            key = (venue.name_original.lower(), venue.address_original.lower())
            if key not in seen:
                seen.add(key)
                unique_venues.append(venue)
        
        return unique_venues

    def generate_sql_inserts(self, venues: List[Venue], events: List[Event]) -> str:
        """Generate SQL INSERT statements for venues and events"""
        sql_parts = []
        sql_parts.append("-- Sporcle Live venues and events import")
        sql_parts.append("-- Generated on: " + datetime.now().isoformat())
        sql_parts.append("")
        
        # Deduplicate venues
        unique_venues = self._deduplicate_venues(venues)
        
        if unique_venues:
            sql_parts.append("-- Insert venues")
            sql_parts.append("INSERT INTO venues (")
            sql_parts.append("    name_original, address_original, city, state, zip_code,")
            sql_parts.append("    phone_number, website, verification_status, is_imported, import_source")
            sql_parts.append(") VALUES")
            
            venue_values = []
            for venue in unique_venues:
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
            sql_parts.append("-- Insert events")
            sql_parts.append("-- Note: These events need to be matched with venue IDs")
            sql_parts.append("/*")
            sql_parts.append("INSERT INTO events (")
            sql_parts.append("    venue_id, event_type, day_of_week, start_time, end_time,")
            sql_parts.append("    is_active, provider_id")
            sql_parts.append(") VALUES")
            
            event_values = []
            for event in events:
                values = [
                    "(SELECT id FROM venues WHERE name_original = '" + event.venue_name.replace("'", "''") + "' LIMIT 1)",
                    f"'{event.event_type}'",
                    f"'{event.day_of_week}'",
                    f"'{event.start_time}'",
                    f"'{event.end_time}'" if event.end_time else "NULL",
                    str(event.is_active).lower(),
                    "(SELECT id FROM trivia_providers WHERE name = 'Sporcle Live' LIMIT 1)"
                ]
                event_values.append(f"    ({', '.join(values)})")
            
            sql_parts.append(',\n'.join(event_values))
            sql_parts.append("ON CONFLICT DO NOTHING;")
            sql_parts.append("*/")
            sql_parts.append("")
        
        return '\n'.join(sql_parts)

def main():
    """Main function to run the scraper"""
    scraper = SporcleLiveScraper()
    
    try:
        venues, events = scraper.scrape_venues_and_events()
        
        if venues or events:
            # Generate SQL
            sql_content = scraper.generate_sql_inserts(venues, events)
            
            # Write to file
            output_file = '/home/jason/code/trivia/trivia-backend/providers/sporcle-live/venues_events.sql'
            with open(output_file, 'w') as f:
                f.write(sql_content)
            
            logger.info(f"Generated SQL file: {output_file}")
            logger.info(f"Found {len(venues)} venues and {len(events)} events")
            
            # Also save as JSON for debugging
            data = {
                'venues': [asdict(venue) for venue in venues],
                'events': [asdict(event) for event in events]
            }
            
            json_file = '/home/jason/code/trivia/trivia-backend/providers/sporcle-live/data.json'
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