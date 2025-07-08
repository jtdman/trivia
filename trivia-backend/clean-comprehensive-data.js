import fs from 'fs';

/**
 * Clean comprehensive NerdyTalk data for Google Places validation
 */

class ComprehensiveDataCleaner {
  constructor() {
    this.cleanedData = [];
  }

  cleanComprehensiveData(inputFile) {
    console.log(`Reading comprehensive data from ${inputFile}...`);
    const rawData = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
    
    console.log(`Processing ${rawData.total_locations} venues...`);
    
    for (const venue of rawData.raw_venue_data) {
      const cleaned = this.cleanVenueData(venue);
      if (cleaned) {
        this.cleanedData.push(cleaned);
      }
    }
    
    console.log(`Cleaned data: ${this.cleanedData.length} valid venues`);
    return this.cleanedData;
  }

  cleanVenueData(venue) {
    // Clean venue name
    const venueName = this.cleanVenueName(venue.venue_name);
    
    // Skip invalid venues
    if (!venueName || this.isInvalidVenueName(venueName)) {
      return null;
    }

    // Clean address - remove prize info that got mixed in
    let address = venue.address || '';
    address = this.cleanAddress(address);
    
    // Clean events data
    const events = this.cleanEvents(venue.events || []);
    
    // If no address and no valid events, skip
    if (!address && events.length === 0) {
      return null;
    }

    return {
      venue_name: venueName,
      address: address,
      events: events,
      provider: 'NerdyTalk Trivia',
      scraped_at: venue.scraped_at
    };
  }

  cleanVenueName(name) {
    if (!name) return '';
    
    // Remove common suffixes that got appended
    name = name.replace(/\s*-\s*Prizes:.*$/i, '');
    name = name.replace(/\s*\(.*?\)\s*-.*$/i, '');
    name = name.replace(/\s*Location:.*$/i, '');
    
    // Clean whitespace and special chars
    name = name.replace(/\s+/g, ' ').trim();
    
    return name;
  }

  cleanAddress(address) {
    if (!address) return '';
    
    // Remove prize information that got mixed in
    address = address.replace(/Prizes?:\s*.*$/i, '');
    address = address.replace(/1st.*?2nd.*?3rd.*$/i, '');
    address = address.replace(/Gift Card.*$/i, '');
    
    // Clean up location prefix
    address = address.replace(/^Location:\s*/i, '');
    
    // Remove CSS/HTML artifacts
    address = address.replace(/#\w+\s*{[\s\S]*?}/g, '');
    address = address.replace(/\s*\n\s*/g, ' ');
    
    // Clean whitespace
    address = address.replace(/\s+/g, ' ').trim();
    
    // Only return if it looks like a real address
    if (this.looksLikeAddress(address)) {
      return address;
    }
    
    return '';
  }

  looksLikeAddress(text) {
    if (!text || text.length < 10) return false;
    
    // Should contain street indicators or specific patterns
    const addressPatterns = [
      /\d+\s+[\w\s]+(st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane|ct|court|pk|pike|pl|place)/i,
      /\d+\s+[\w\s]+,\s*\w+/i, // Number + text + comma + text
      /nashville|tennessee|tn\s+\d{5}/i
    ];
    
    return addressPatterns.some(pattern => pattern.test(text));
  }

  cleanEvents(events) {
    const cleanedEvents = [];
    
    for (const event of events) {
      const cleanedEvent = this.cleanEvent(event);
      if (cleanedEvent) {
        cleanedEvents.push(cleanedEvent);
      }
    }
    
    return cleanedEvents;
  }

  cleanEvent(event) {
    const dayOfWeek = this.cleanDayOfWeek(event.day_of_week);
    const startTime = this.cleanTime(event.start_time);
    const eventType = this.cleanEventType(event.event_type);
    const prizeInfo = this.cleanPrizeInfo(event.prize_info);
    const host = this.cleanHost(event.host);
    
    return {
      day_of_week: dayOfWeek,
      start_time: startTime,
      event_type: eventType,
      prize_info: prizeInfo,
      host: host
    };
  }

  cleanDayOfWeek(day) {
    if (!day) return '';
    
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const lowerDay = day.toLowerCase();
    
    for (const validDay of days) {
      if (lowerDay.includes(validDay)) {
        return validDay.charAt(0).toUpperCase() + validDay.slice(1);
      }
    }
    
    return '';
  }

  cleanTime(time) {
    if (!time) return '';
    
    // Remove extra text and normalize
    time = time.replace(/[^\d:APM\s]/g, '').trim();
    
    // Try to match time patterns
    const timeMatch = time.match(/(\d{1,2}):?(\d{0,2})\s*(AM|PM)/i);
    if (timeMatch) {
      const hours = timeMatch[1].padStart(2, '0');
      const minutes = (timeMatch[2] || '00').padStart(2, '0');
      const period = timeMatch[3].toUpperCase();
      return `${hours}:${minutes} ${period}`;
    }
    
    return time;
  }

  cleanEventType(type) {
    if (!type) return 'trivia';
    
    const typeMap = {
      'trivia': 'trivia',
      'bingo': 'bingo',
      'ballad bingo': 'ballad bingo',
      'opinionary': 'opinionary'
    };
    
    const lowerType = type.toLowerCase();
    for (const [key, value] of Object.entries(typeMap)) {
      if (lowerType.includes(key)) {
        return value;
      }
    }
    
    return 'trivia';
  }

  cleanPrizeInfo(prize) {
    if (!prize) return '';
    
    // Remove CSS artifacts
    prize = prize.replace(/#\w+\s*{[\s\S]*?}/g, '');
    prize = prize.replace(/\s*\n\s*/g, ' ');
    prize = prize.replace(/\s+/g, ' ').trim();
    
    // Truncate if too long
    if (prize.length > 200) {
      prize = prize.substring(0, 200) + '...';
    }
    
    return prize;
  }

  cleanHost(host) {
    if (!host) return '';
    
    // Remove extra text
    host = host.replace(/hosted by\s*/i, '').trim();
    
    // Should be just a name
    if (host.length > 30 || !/^[a-zA-Z\s]+$/.test(host)) {
      return '';
    }
    
    return host;
  }

  isInvalidVenueName(name) {
    const invalid = [
      'find a game', 'find by state', 'hire nerdy talk',
      'home', 'about', 'contact', 'menu', 'navigation',
      'loading', 'error', 'undefined', 'null', 'function',
      'prizes', 'gift card', 'location'
    ];
    
    const lowerName = name.toLowerCase();
    return invalid.some(inv => lowerName.includes(inv)) ||
           name.length < 3 ||
           name.length > 80;
  }

  formatForGooglePlaces() {
    return this.cleanedData.map(venue => ({
      name_original: venue.venue_name,
      address_original: venue.address,
      provider: venue.provider,
      events: venue.events
    }));
  }

  async saveCleanedData(filename = 'nerdytalk-comprehensive-cleaned.json') {
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
  const cleaner = new ComprehensiveDataCleaner();
  
  try {
    console.log('Starting comprehensive NerdyTalk data cleaning...');
    
    cleaner.cleanComprehensiveData('/home/jason/code/trivia/trivia-backend/nerdytalk-comprehensive.json');
    
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

export default ComprehensiveDataCleaner;