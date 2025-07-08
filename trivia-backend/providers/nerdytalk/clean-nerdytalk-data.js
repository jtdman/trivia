import fs from 'fs';

/**
 * Clean and process NerdyTalk Trivia scraped data
 * Extract only essential venue information and format for Google Places validation
 */

class NerdyTalkDataCleaner {
  constructor() {
    this.cleanedData = [];
  }

  cleanScrapedData(inputFile) {
    console.log(`Reading data from ${inputFile}...`);
    const rawData = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
    
    console.log(`Processing ${rawData.total_locations} locations...`);
    
    for (const location of rawData.locations) {
      const cleaned = this.cleanVenueData(location.venueInfo);
      if (cleaned) {
        this.cleanedData.push(cleaned);
      }
    }
    
    console.log(`Cleaned data: ${this.cleanedData.length} valid venues`);
    return this.cleanedData;
  }

  cleanVenueData(venueInfo) {
    // Extract venue name
    const venueName = this.cleanText(venueInfo.venueTitle);
    
    // Skip invalid venue names
    if (!venueName || this.isInvalidVenueName(venueName)) {
      return null;
    }

    // Extract and clean address
    const address = this.extractAddress(venueInfo.venueAddress);
    
    // Extract event information
    const events = this.extractEvents(venueInfo.venueAddress);
    
    if (!address && events.length === 0) {
      return null;
    }

    return {
      venue_name: venueName,
      address: address || '',
      events: events,
      provider: 'NerdyTalk Trivia',
      scraped_at: venueInfo.scrapedAt
    };
  }

  cleanText(text) {
    if (!text) return '';
    
    return text
      .replace(/\n+/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/\t/g, ' ')
      .trim();
  }

  isInvalidVenueName(name) {
    const invalid = [
      'TN BREW WORKS',  // This seems to be a section header, not a venue
      'FIND A GAME',
      'FIND BY STATE', 
      'HIRE NERDY TALK',
      'HOME',
      'ABOUT',
      'CONTACT',
      'MENU',
      'NAVIGATION'
    ];
    
    return invalid.some(invalid => name.toUpperCase().includes(invalid)) ||
           name.length < 3 ||
           name.length > 100;
  }

  extractAddress(addressText) {
    if (!addressText) return '';
    
    // Look for "Location:" pattern
    const locationMatch = addressText.match(/Location:\s*([^*\n]+?)(?:\s*Prizes|$)/i);
    if (locationMatch) {
      return this.cleanText(locationMatch[1]);
    }
    
    // Look for address patterns (number + street)
    const addressMatch = addressText.match(/\d+\s+[\w\s]+(st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane|ct|court|pk|pike|pl|place)[,\s]/i);
    if (addressMatch) {
      // Extract the full address line
      const startIndex = addressText.indexOf(addressMatch[0]);
      const addressLine = addressText.substring(startIndex);
      const endMatch = addressLine.match(/^[^*\n]+/);
      return endMatch ? this.cleanText(endMatch[0]) : '';
    }
    
    return '';
  }

  extractEvents(text) {
    if (!text) return [];
    
    const events = [];
    
    // Look for day and time patterns
    const dayTimePattern = /(\d{1,2}:?\d{0,2}\s*(?:AM|PM)),?\s*(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/gi;
    let match;
    
    while ((match = dayTimePattern.exec(text)) !== null) {
      const time = match[1].trim();
      const day = match[2].trim();
      
      // Look for event type (TRIVIA, BINGO, etc.)
      const eventTypeMatch = text.match(/(TRIVIA|BINGO|BALLAD BINGO|OPINIONARY)/i);
      const eventType = eventTypeMatch ? eventTypeMatch[1].toLowerCase() : 'trivia';
      
      // Look for host information
      const hostMatch = text.match(/hosted by\s+(\w+)/i);
      const host = hostMatch ? hostMatch[1] : '';
      
      // Look for prize information
      const prizeMatch = text.match(/Prizes?:\s*([^*\n]+?)(?:\s*\n|$)/i);
      const prize = prizeMatch ? this.cleanText(prizeMatch[1]) : '';
      
      events.push({
        day_of_week: day,
        start_time: time,
        event_type: eventType,
        host: host,
        prize_info: prize
      });
    }
    
    // Alternative pattern: Look for day first, then time
    if (events.length === 0) {
      const altPattern = /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)[^|]*\|\s*[^|]*\s+(\d{1,2}:?\d{0,2}\s*(?:AM|PM))/gi;
      while ((match = altPattern.exec(text)) !== null) {
        const day = match[1].trim();
        const time = match[2].trim();
        
        events.push({
          day_of_week: day,
          start_time: time,
          event_type: 'trivia',
          host: '',
          prize_info: ''
        });
      }
    }
    
    return events;
  }

  formatForGooglePlaces() {
    return this.cleanedData.map(venue => ({
      name_original: venue.venue_name,
      address_original: venue.address,
      provider: venue.provider,
      events: venue.events.map(event => ({
        day_of_week: event.day_of_week,
        start_time: event.start_time,
        event_type: event.event_type,
        prize_info: event.prize_info,
        host: event.host
      }))
    }));
  }

  saveCleanedData(filename = 'nerdytalk-cleaned.json') {
    const filepath = `/home/jason/code/trivia/trivia-backend/${filename}`;
    
    const output = {
      provider: 'NerdyTalk Trivia',
      scraped_at: new Date().toISOString(),
      total_venues: this.cleanedData.length,
      venues: this.cleanedData,
      google_places_format: this.formatForGooglePlaces()
    };
    
    fs.writeFileSync(filepath, JSON.stringify(output, null, 2));
    console.log(`Cleaned data saved to ${filepath}`);
    return filepath;
  }
}

// Main execution
function main() {
  const cleaner = new NerdyTalkDataCleaner();
  
  try {
    console.log('Starting NerdyTalk data cleaning...');
    
    // Clean the refined scraped data
    cleaner.cleanScrapedData('/home/jason/code/trivia/trivia-backend/nerdytalk-trivia-refined.json');
    
    // Save cleaned data
    const filepath = cleaner.saveCleanedData();
    
    console.log('Data cleaning completed successfully!');
    console.log(`Output file: ${filepath}`);
    
  } catch (error) {
    console.error('Data cleaning failed:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default NerdyTalkDataCleaner;