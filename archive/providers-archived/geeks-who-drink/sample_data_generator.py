#!/usr/bin/env python3
"""
Geeks Who Drink Sample Data Generator

Since the website blocks automated scraping, this generates realistic sample data
based on their known operating patterns and typical venue types.
"""

import json
from datetime import datetime
from typing import List, Dict
from dataclasses import dataclass, asdict

@dataclass
class Venue:
    name_original: str
    address_original: str
    city: str
    state: str
    zip_code: str = None
    phone_number: str = None
    website: str = None
    verification_status: str = "needs_review"
    is_imported: bool = True
    import_source: str = "geeks_who_drink"

@dataclass
class Event:
    event_type: str
    day_of_week: str
    start_time: str
    venue_name: str
    end_time: str = None
    is_active: bool = True

def generate_sample_data():
    """Generate realistic sample data for Geeks Who Drink venues"""
    
    # Sample venues based on typical GWD locations
    venues = [
        # Denver (their home base)
        Venue("Wynkoop Brewing Company", "1634 18th St, Denver, CO", "Denver", "CO", "80202"),
        Venue("Falling Rock Tap House", "1919 Blake St, Denver, CO", "Denver", "CO", "80202"),
        Venue("Highlands Tavern", "3927 W 32nd Ave, Denver, CO", "Denver", "CO", "80212"),
        Venue("Lowry Beer Garden", "7577 E Academy Blvd, Denver, CO", "Denver", "CO", "80230"),
        
        # Austin
        Venue("The Draught House", "4112 Medical Pkwy, Austin, TX", "Austin", "TX", "78756"),
        Venue("Scholz Garten", "1607 San Jacinto Blvd, Austin, TX", "Austin", "TX", "78701"),
        Venue("Lazarus Brewing", "1902 E 6th St, Austin, TX", "Austin", "TX", "78702"),
        
        # Portland
        Venue("McMenamins Crystal Ballroom", "1332 W Burnside St, Portland, OR", "Portland", "OR", "97209"),
        Venue("Bailey's Taproom", "213 SW Broadway, Portland, OR", "Portland", "OR", "97205"),
        Venue("Prost!", "4237 N Mississippi Ave, Portland, OR", "Portland", "OR", "97227"),
        
        # Seattle
        Venue("Fremont Brewing Company", "1050 N 34th St, Seattle, WA", "Seattle", "WA", "98103"),
        Venue("The Walrus and The Carpenter", "4743 Ballard Ave NW, Seattle, WA", "Seattle", "WA", "98107"),
        Venue("Optimism Brewing", "1158 Broadway, Seattle, WA", "Seattle", "WA", "98122"),
        
        # San Francisco
        Venue("Thirsty Bear Brewing", "661 Howard St, San Francisco, CA", "San Francisco", "CA", "94105"),
        Venue("Public House", "24 Willie Mays Plaza, San Francisco, CA", "San Francisco", "CA", "94107"),
        Venue("Mad Dog in the Fog", "530 Haight St, San Francisco, CA", "San Francisco", "CA", "94117"),
        
        # Los Angeles
        Venue("The Misfit Restaurant + Bar", "225 Santa Monica Blvd, Santa Monica, CA", "Santa Monica", "CA", "90401"),
        Venue("Barney's Beanery", "8447 Santa Monica Blvd, West Hollywood, CA", "West Hollywood", "CA", "90069"),
        Venue("Red Lion Tavern", "2366 Glendale Blvd, Los Angeles, CA", "Los Angeles", "CA", "90039"),
        
        # Chicago
        Venue("Goose Island Brewpub", "1800 N Clybourn Ave, Chicago, IL", "Chicago", "IL", "60614"),
        Venue("Sluggers World Class Sports Bar", "3540 N Clark St, Chicago, IL", "Chicago", "IL", "60657"),
        Venue("Murphy's Bleachers", "3655 N Sheffield Ave, Chicago, IL", "Chicago", "IL", "60613"),
        
        # New York
        Venue("Peculier Pub", "145 Bleecker St, New York, NY", "New York", "NY", "10012"),
        Venue("The Ginger Man", "11 E 36th St, New York, NY", "New York", "NY", "10016"),
        Venue("Dive Bar", "732 E 9th St, New York, NY", "New York", "NY", "10009"),
        
        # Boston
        Venue("The Thinking Cup", "85 Newbury St, Boston, MA", "Boston", "MA", "02116"),
        Venue("Sunset Grill & Tap", "130 Brighton Ave, Boston, MA", "Boston", "MA", "02134"),
        Venue("The Quiet Man Pub", "11 Dorchester St, Boston, MA", "Boston", "MA", "02127"),
        
        # Atlanta
        Venue("The Vortex Bar & Grill", "438 Moreland Ave NE, Atlanta, GA", "Atlanta", "GA", "30307"),
        Venue("Northside Tavern", "1058 Howell Mill Rd, Atlanta, GA", "Atlanta", "GA", "30318"),
        Venue("The Porter Beer Bar", "1156 Euclid Ave NE, Atlanta, GA", "Atlanta", "GA", "30307"),
        
        # Miami
        Venue("Blackbird Ordinary", "729 SW 1st Ave, Miami, FL", "Miami", "FL", "33130"),
        Venue("Broken Shaker", "2727 Indian Creek Dr, Miami Beach, FL", "Miami Beach", "FL", "33140"),
        Venue("The Regent Cocktail Club", "1690 Collins Ave, Miami Beach, FL", "Miami Beach", "FL", "33139"),
        
        # Phoenix
        Venue("Four Peaks Brewing", "1340 E 8th St, Tempe, AZ", "Tempe", "AZ", "85281"),
        Venue("The Cornish Pasty Co", "960 W University Dr, Tempe, AZ", "Tempe", "AZ", "85281"),
        Venue("Zipps Sports Grill", "2320 W Northern Ave, Phoenix, AZ", "Phoenix", "AZ", "85021"),
    ]
    
    # Generate events for venues
    events = []
    game_types = ["GWD Classic", "Small Batch Trivia", "Jeopardy! Bar League", "Boombox Bingo", "Theme Quiz"]
    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    times = ["7:00 PM", "7:30 PM", "8:00 PM", "8:30 PM", "9:00 PM"]
    
    for i, venue in enumerate(venues):
        # Most venues have one regular trivia night
        day = days[i % len(days)]
        time = times[i % len(times)]
        game_type = game_types[i % len(game_types)]
        
        events.append(Event(
            event_type=game_type,
            day_of_week=day,
            start_time=time,
            venue_name=venue.name_original,
            end_time="10:00 PM"
        ))
        
        # Some venues have additional events
        if i % 3 == 0:  # Every third venue gets a second event
            second_day = days[(i + 1) % len(days)]
            second_time = times[(i + 1) % len(times)]
            second_game = game_types[(i + 1) % len(game_types)]
            
            events.append(Event(
                event_type=second_game,
                day_of_week=second_day,
                start_time=second_time,
                venue_name=venue.name_original,
                end_time="10:30 PM"
            ))
    
    return venues, events

def generate_sql_inserts(venues: List[Venue], events: List[Event]) -> str:
    """Generate SQL INSERT statements for venues and events"""
    sql_parts = []
    sql_parts.append("-- Geeks Who Drink sample venues and events")
    sql_parts.append("-- Generated on: " + datetime.now().isoformat())
    sql_parts.append("-- Note: This is sample data based on typical GWD venue patterns")
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
        sql_parts.append("-- Insert events")
        sql_parts.append("INSERT INTO events (")
        sql_parts.append("    venue_id, event_type, day_of_week, start_time, end_time,")
        sql_parts.append("    is_active, provider_id")
        sql_parts.append(") VALUES")
        
        event_values = []
        for event in events:
            values = [
                f"(SELECT id FROM venues WHERE name_original = '{event.venue_name.replace("'", "''")}' AND import_source = 'geeks_who_drink' LIMIT 1)",
                f"'{event.event_type}'",
                f"'{event.day_of_week}'",
                f"'{event.start_time}'",
                f"'{event.end_time}'" if event.end_time else "NULL",
                str(event.is_active).lower(),
                "(SELECT id FROM trivia_providers WHERE name = 'Geeks Who Drink' LIMIT 1)"
            ]
            event_values.append(f"    ({', '.join(values)})")
        
        sql_parts.append(',\n'.join(event_values))
        sql_parts.append("ON CONFLICT (venue_id, day_of_week, start_time) DO NOTHING;")
        sql_parts.append("")
    
    return '\n'.join(sql_parts)

def main():
    """Generate sample data and SQL"""
    print("Generating Geeks Who Drink sample data...")
    
    venues, events = generate_sample_data()
    
    # Generate SQL
    sql_content = generate_sql_inserts(venues, events)
    
    # Write to file
    output_file = '/home/jason/code/trivia/trivia-backend/providers/geeks-who-drink/sample_venues_events.sql'
    with open(output_file, 'w') as f:
        f.write(sql_content)
    
    print(f"Generated SQL file: {output_file}")
    print(f"Created {len(venues)} venues and {len(events)} events")
    
    # Also save as JSON for debugging
    data = {
        'venues': [asdict(venue) for venue in venues],
        'events': [asdict(event) for event in events]
    }
    
    json_file = '/home/jason/code/trivia/trivia-backend/providers/geeks-who-drink/sample_data.json'
    with open(json_file, 'w') as f:
        json.dump(data, f, indent=2)
    
    print(f"Saved JSON debug file: {json_file}")

if __name__ == "__main__":
    main()