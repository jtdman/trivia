#!/usr/bin/env python3
"""
King Trivia Scraper

This script scrapes venue and event information from King Trivia's website
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
    import_source: str = "king_trivia"

@dataclass
class Event:
    """Event data structure matching our database schema"""
    event_type: str
    day_of_week: str
    start_time: str
    venue_name: str  # For matching with venue
    end_time: Optional[str] = None
    is_active: bool = True

class KingTriviaScraperError(Exception):
    """Custom exception for scraper errors"""
    pass

class KingTriviaScraper:
    def __init__(self):
        self.base_url = "https://www.kingtrivia.com"
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
        
        # Major ZIP codes to search (covering their mentioned cities)
        self.zip_codes = [
            '90210',  # Los Angeles
            '80202',  # Denver
            '75201',  # Dallas
            '10001',  # New York
            '02101',  # Boston
            '92647',  # Orange County
            '92101',  # San Diego
            '93001',  # Ventura
            '91730',  # Inland Empire
        ]
        
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

    def search_venues_by_zip(self, zip_code: str) -> List[Dict]:
        """Search for venues in a specific ZIP code"""
        logger.info(f"Searching venues in ZIP code: {zip_code}")
        
        try:
            # First, try to get the search page
            search_url = f"{self.base_url}/where-to-play/"
            response = self.session.get(search_url)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Look for AJAX endpoints or form submissions
            # Check for any scripts that might contain venue data
            scripts = soup.find_all('script')
            venues_data = []
            
            for script in scripts:
                if script.string and 'venue' in script.string.lower():
                    # Try to extract JSON data
                    try:
                        # Look for JSON-like patterns
                        json_matches = re.findall(r'\{[^{}]*venue[^{}]*\}', script.string, re.IGNORECASE)
                        for match in json_matches:
                            try:
                                data = json.loads(match)
                                venues_data.append(data)
                            except json.JSONDecodeError:
                                continue
                    except Exception:
                        continue
            
            # If no JSON data found, try form submission approach
            if not venues_data:
                venues_data = self._try_form_submission(zip_code)
            
            return venues_data
            
        except requests.RequestException as e:
            logger.error(f"Error searching ZIP {zip_code}: {e}")
            return []

    def _try_form_submission(self, zip_code: str) -> List[Dict]:
        """Try submitting the search form to get venue data"""
        try:
            # Try different potential endpoints
            endpoints = [
                f"{self.base_url}/where-to-play/",
                f"{self.base_url}/api/venues/search",
                f"{self.base_url}/venues/search",
            ]
            
            for endpoint in endpoints:
                try:
                    # Try POST with ZIP code
                    response = self.session.post(endpoint, data={'zip': zip_code})
                    if response.status_code == 200:
                        if response.headers.get('content-type', '').startswith('application/json'):
                            return response.json()
                        else:
                            # Parse HTML response
                            return self._parse_venue_html(response.text)
                except requests.RequestException:
                    continue
            
            # Try GET with ZIP parameter
            response = self.session.get(f"{self.base_url}/where-to-play/", params={'zip': zip_code})
            if response.status_code == 200:
                return self._parse_venue_html(response.text)
                
        except Exception as e:
            logger.error(f"Error in form submission for ZIP {zip_code}: {e}")
        
        return []

    def _parse_venue_html(self, html_content: str) -> List[Dict]:
        """Parse HTML content to extract venue information"""
        soup = BeautifulSoup(html_content, 'html.parser')
        venues = []
        
        # Look for common venue listing patterns
        venue_selectors = [
            '.venue-listing',
            '.venue-item',
            '.location-item',
            '.trivia-venue',
            '[data-venue]',
            '.venue-card'
        ]
        
        venue_elements = []
        for selector in venue_selectors:
            elements = soup.select(selector)
            if elements:
                venue_elements = elements
                break
        
        # If no specific venue elements found, look for text patterns
        if not venue_elements:
            venues = self._extract_venues_from_text(html_content)
        else:
            for element in venue_elements:
                venue_data = self._extract_venue_from_element(element)
                if venue_data:
                    venues.append(venue_data)
        
        return venues

    def _extract_venues_from_text(self, html_content: str) -> List[Dict]:
        """Extract venue information from text content"""
        venues = []
        
        # Look for address patterns
        address_patterns = [
            r'(\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Boulevard|Blvd|Road|Rd|Lane|Ln|Drive|Dr|Way|Place|Pl))',
            r'(\d+\s+[A-Za-z\s]+,\s*[A-Za-z\s]+,\s*[A-Z]{2}\s*\d{5})',
        ]
        
        for pattern in address_patterns:
            matches = re.findall(pattern, html_content, re.IGNORECASE)
            for match in matches:
                # This is a simplified extraction - would need more sophisticated parsing
                venues.append({
                    'name': 'Unknown Venue',
                    'address': match,
                    'source': 'text_extraction'
                })
        
        return venues

    def _extract_venue_from_element(self, element) -> Optional[Dict]:
        """Extract venue information from a DOM element"""
        try:
            name = element.get_text(strip=True)
            
            # Look for address information
            address_element = element.find(['address', '.address', '[data-address]'])
            address = address_element.get_text(strip=True) if address_element else None
            
            # Look for phone number
            phone_element = element.find(['phone', '.phone', '[data-phone]'])
            phone = phone_element.get_text(strip=True) if phone_element else None
            
            return {
                'name': name,
                'address': address,
                'phone': phone,
                'source': 'element_extraction'
            }
            
        except Exception as e:
            logger.error(f"Error extracting venue from element: {e}")
            return None

    def scrape_all_venues(self) -> List[Venue]:
        """Scrape venues from all target ZIP codes"""
        all_venues = []
        
        for zip_code in self.zip_codes:
            logger.info(f"Scraping ZIP code: {zip_code}")
            
            venue_data = self.search_venues_by_zip(zip_code)
            
            for data in venue_data:
                venue = self._convert_to_venue(data)
                if venue:
                    all_venues.append(venue)
            
            # Be respectful - add delay between requests
            time.sleep(2)
        
        # Remove duplicates based on name and address
        unique_venues = self._deduplicate_venues(all_venues)
        
        logger.info(f"Found {len(unique_venues)} unique venues")
        return unique_venues

    def _convert_to_venue(self, data: Dict) -> Optional[Venue]:
        """Convert raw venue data to Venue object"""
        try:
            name = data.get('name', '').strip()
            address = data.get('address', '').strip()
            
            if not name or not address:
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

    def _parse_address(self, address: str) -> tuple:
        """Parse address into city, state, zip components"""
        # Simple address parsing - would need more sophisticated logic
        parts = address.split(',')
        
        city = None
        state = None
        zip_code = None
        
        if len(parts) >= 2:
            city = parts[-2].strip()
            
            # Look for state and ZIP in last part
            last_part = parts[-1].strip()
            state_zip_match = re.search(r'([A-Z]{2})\s*(\d{5})', last_part)
            if state_zip_match:
                state = state_zip_match.group(1)
                zip_code = state_zip_match.group(2)
        
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

    def generate_sql_insert(self, venues: List[Venue]) -> str:
        """Generate SQL INSERT statements for venues"""
        if not venues:
            return "-- No venues found\n"
        
        sql_parts = []
        sql_parts.append("-- King Trivia venues import")
        sql_parts.append("-- Generated on: " + datetime.now().isoformat())
        sql_parts.append("")
        
        # Get King Trivia provider ID
        sql_parts.append("""
-- Get King Trivia provider ID
DO $$ 
DECLARE
    provider_id_var UUID;
BEGIN
    SELECT id INTO provider_id_var FROM trivia_providers WHERE name = 'King Trivia';
    
    IF provider_id_var IS NULL THEN
        RAISE EXCEPTION 'King Trivia provider not found in database';
    END IF;
END $$;
""")
        
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
        
        return '\n'.join(sql_parts)

def main():
    """Main function to run the scraper"""
    scraper = KingTriviaScraper()
    
    try:
        logger.info("Starting King Trivia scraper...")
        venues = scraper.scrape_all_venues()
        
        if venues:
            # Generate SQL
            sql_content = scraper.generate_sql_insert(venues)
            
            # Write to file
            output_file = '/home/jason/code/trivia/trivia-backend/providers/king-trivia/venues.sql'
            with open(output_file, 'w') as f:
                f.write(sql_content)
            
            logger.info(f"Generated SQL file: {output_file}")
            logger.info(f"Found {len(venues)} venues")
            
            # Also save as JSON for debugging
            json_file = '/home/jason/code/trivia/trivia-backend/providers/king-trivia/venues.json'
            with open(json_file, 'w') as f:
                json.dump([asdict(venue) for venue in venues], f, indent=2)
            
            logger.info(f"Saved JSON debug file: {json_file}")
            
        else:
            logger.warning("No venues found")
            
    except Exception as e:
        logger.error(f"Scraper failed: {e}")
        raise

if __name__ == "__main__":
    main()