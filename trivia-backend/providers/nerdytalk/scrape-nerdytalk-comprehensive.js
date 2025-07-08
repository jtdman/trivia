import fs from 'fs';
import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * Comprehensive NerdyTalk Trivia Scraper
 * Combines data from /locations and /weekly-clues pages
 */

class ComprehensiveNerdyTalkScraper {
  constructor() {
    this.baseUrl = 'http://nerdytalktrivia.com';
    this.locationsUrl = 'http://nerdytalktrivia.com/locations';
    this.weeklyCluesUrl = 'https://nerdytalktrivia.com/weekly-clues/';
    this.scraped_data = [];
    this.provider = 'NerdyTalk Trivia';
  }

  async scrapeComprehensive() {
    try {
      console.log('Starting comprehensive NerdyTalk scraping...');
      
      // Step 1: Get venue names and days from weekly clues page
      const weeklyVenues = await this.scrapeWeeklyClues();
      console.log(`Found ${weeklyVenues.length} venues from weekly clues`);
      
      // Step 2: Get detailed venue info from locations page
      const locationDetails = await this.scrapeLocationDetails();
      console.log(`Found ${locationDetails.length} location details`);
      
      // Step 3: Cross-reference and merge data
      const mergedData = this.mergeVenueData(weeklyVenues, locationDetails);
      console.log(`Merged data: ${mergedData.length} complete venues`);
      
      this.scraped_data = mergedData;
      return mergedData;

    } catch (error) {
      console.error('Error in comprehensive scraping:', error.message);
      throw error;
    }
  }

  async scrapeWeeklyClues() {
    console.log('Fetching weekly clues page...');
    const response = await axios.get(this.weeklyCluesUrl, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const venues = [];

    // Extract all text content and look for venue patterns
    const textContent = $('body').text();
    
    // Split into lines and look for venue patterns
    const lines = textContent.split('\n').map(line => line.trim()).filter(line => line);
    
    const venuePatterns = [
      // Pattern: "Monday, Venue Name"
      /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+(.+)$/i,
      // Pattern: "Venue Name (Monday)"
      /^(.+?)\s*\((Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\)$/i,
    ];

    for (const line of lines) {
      // Skip obvious non-venue content
      if (this.isSystemText(line)) continue;
      
      for (const pattern of venuePatterns) {
        const match = line.match(pattern);
        if (match) {
          let day, venueName;
          
          if (pattern.source.startsWith('^(Monday')) {
            // Day first format
            day = match[1];
            venueName = match[2];
          } else {
            // Venue first format
            venueName = match[1];
            day = match[2];
          }
          
          venueName = this.cleanVenueName(venueName);
          
          if (this.isValidVenueName(venueName)) {
            venues.push({
              venue_name: venueName,
              day_of_week: day,
              source: 'weekly_clues'
            });
          }
          break;
        }
      }
    }

    // Also look for structured venue data in form elements
    $('option, input[type="checkbox"], label').each((_, element) => {
      const $element = $(element);
      const text = $element.text().trim();
      const value = $element.attr('value') || '';
      
      if (text && this.looksLikeVenueData(text)) {
        const venueData = this.parseVenueFromText(text);
        if (venueData) {
          venues.push({
            ...venueData,
            source: 'weekly_clues_form'
          });
        }
      }
    });

    return this.deduplicateVenues(venues);
  }

  async scrapeLocationDetails() {
    console.log('Fetching locations page for detailed info...');
    const response = await axios.get(this.locationsUrl, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const locationDetails = [];

    // Look for text blocks that contain venue information
    const textContent = $('body').text();
    const chunks = textContent.split(/\n\n+/).filter(chunk => chunk.trim().length > 50);

    for (const chunk of chunks) {
      const venueData = this.extractVenueDetails(chunk);
      if (venueData) {
        locationDetails.push({
          ...venueData,
          source: 'locations_page'
        });
      }
    }

    return locationDetails;
  }

  extractVenueDetails(text) {
    // Look for venue name patterns
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    if (lines.length < 3) return null;

    let venueName = '';
    let address = '';
    let time = '';
    let dayOfWeek = '';
    let eventType = 'trivia';
    let host = '';
    let prizeInfo = '';

    for (const line of lines) {
      // Skip system text
      if (this.isSystemText(line)) continue;

      // Look for venue name (usually first substantial line)
      if (!venueName && this.isValidVenueName(line) && line.length > 5 && line.length < 80) {
        venueName = this.cleanVenueName(line);
        continue;
      }

      // Look for address patterns
      if (/location:\s*/i.test(line) || /\d+\s+[\w\s]+(st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane|ct|court|pk|pike|pl|place)/i.test(line)) {
        address = line.replace(/location:\s*/i, '').trim();
      }

      // Look for time patterns
      const timeMatch = line.match(/(\d{1,2}:?\d{0,2}\s*(?:AM|PM))/i);
      if (timeMatch) {
        time = timeMatch[1];
      }

      // Look for day patterns
      const dayMatch = line.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
      if (dayMatch) {
        dayOfWeek = dayMatch[1];
      }

      // Look for event type
      if (/trivia|bingo|ballad bingo|opinionary/i.test(line)) {
        const typeMatch = line.match(/(trivia|bingo|ballad bingo|opinionary)/i);
        if (typeMatch) {
          eventType = typeMatch[1].toLowerCase();
        }
      }

      // Look for host
      const hostMatch = line.match(/hosted by\s+(\w+)/i);
      if (hostMatch) {
        host = hostMatch[1];
      }

      // Look for prize info
      if (/prizes?:/i.test(line)) {
        prizeInfo = line.replace(/prizes?:\s*/i, '').trim();
      }
    }

    if (!venueName) return null;

    return {
      venue_name: venueName,
      address: address,
      day_of_week: dayOfWeek,
      time: time,
      event_type: eventType,
      host: host,
      prize_info: prizeInfo
    };
  }

  mergeVenueData(weeklyVenues, locationDetails) {
    const merged = [];
    const processedNames = new Set();

    // Start with venues from weekly clues (more complete list)
    for (const weeklyVenue of weeklyVenues) {
      if (processedNames.has(weeklyVenue.venue_name.toLowerCase())) continue;
      
      // Find matching location details
      const locationMatch = this.findBestMatch(weeklyVenue.venue_name, locationDetails);
      
      const mergedVenue = {
        venue_name: weeklyVenue.venue_name,
        address: locationMatch?.address || '',
        events: [{
          day_of_week: weeklyVenue.day_of_week || locationMatch?.day_of_week || '',
          start_time: locationMatch?.time || '',
          event_type: locationMatch?.event_type || 'trivia',
          host: locationMatch?.host || '',
          prize_info: locationMatch?.prize_info || ''
        }],
        provider: this.provider,
        scraped_at: new Date().toISOString()
      };

      // Only include if we have meaningful data
      if (mergedVenue.venue_name && (mergedVenue.address || mergedVenue.events[0].day_of_week)) {
        merged.push(mergedVenue);
        processedNames.add(weeklyVenue.venue_name.toLowerCase());
      }
    }

    // Add any remaining location details that weren't matched
    for (const locationDetail of locationDetails) {
      if (locationDetail.venue_name && 
          !processedNames.has(locationDetail.venue_name.toLowerCase()) &&
          this.isValidVenueName(locationDetail.venue_name)) {
        
        merged.push({
          venue_name: locationDetail.venue_name,
          address: locationDetail.address || '',
          events: [{
            day_of_week: locationDetail.day_of_week || '',
            start_time: locationDetail.time || '',
            event_type: locationDetail.event_type || 'trivia',
            host: locationDetail.host || '',
            prize_info: locationDetail.prize_info || ''
          }],
          provider: this.provider,
          scraped_at: new Date().toISOString()
        });
        processedNames.add(locationDetail.venue_name.toLowerCase());
      }
    }

    return merged;
  }

  findBestMatch(venueName, locationDetails) {
    const cleanVenueName = venueName.toLowerCase().replace(/[^\w\s]/g, '');
    
    for (const detail of locationDetails) {
      const cleanDetailName = detail.venue_name.toLowerCase().replace(/[^\w\s]/g, '');
      
      // Exact match
      if (cleanVenueName === cleanDetailName) {
        return detail;
      }
      
      // Partial match (contains)
      if (cleanVenueName.includes(cleanDetailName) || cleanDetailName.includes(cleanVenueName)) {
        return detail;
      }
      
      // Word overlap match
      const venueWords = cleanVenueName.split(/\s+/);
      const detailWords = cleanDetailName.split(/\s+/);
      const overlap = venueWords.filter(word => detailWords.includes(word));
      
      if (overlap.length >= 2) {
        return detail;
      }
    }
    
    return null;
  }

  isSystemText(text) {
    const systemElements = [
      'home', 'about', 'contact', 'menu', 'privacy', 'terms', 'cookie',
      'facebook', 'twitter', 'instagram', 'social', 'follow', 'like',
      'javascript', 'function', 'var ', 'const ', 'let ', 'return',
      'gform', 'jquery', 'document', 'window', 'undefined', 'null',
      'error', 'warning', 'debug', 'console', 'alert',
      'http', 'https', 'www.', '.com', '.org', '.net',
      'copyright', '©', 'all rights reserved',
      'required field', 'form', 'submit', 'button', 'input',
      'loading', 'please wait', 'redirecting'
    ];
    
    const lowerText = text.toLowerCase();
    return systemElements.some(element => lowerText.includes(element)) ||
           text.length < 3 ||
           text.length > 200 ||
           /^\d+$/.test(text) ||
           /^[^a-zA-Z]*$/.test(text);
  }

  looksLikeVenueData(text) {
    return /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(text) &&
           text.length > 10 &&
           text.length < 200 &&
           !this.isSystemText(text);
  }

  parseVenueFromText(text) {
    const dayMatch = text.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
    if (!dayMatch) return null;

    const day = dayMatch[1];
    const venueName = text.replace(dayMatch[0], '').replace(/[(),]/g, '').trim();
    
    if (this.isValidVenueName(venueName)) {
      return {
        venue_name: this.cleanVenueName(venueName),
        day_of_week: day
      };
    }
    
    return null;
  }

  isValidVenueName(name) {
    if (!name || typeof name !== 'string') return false;
    
    const invalid = [
      'tn brew works', 'find a game', 'find by state', 'hire nerdy talk',
      'home', 'about', 'contact', 'menu', 'privacy', 'terms',
      'loading', 'error', 'undefined', 'null', 'function'
    ];
    
    const lowerName = name.toLowerCase();
    return !invalid.some(inv => lowerName.includes(inv)) &&
           name.length >= 3 &&
           name.length <= 100 &&
           /[a-zA-Z]/.test(name);
  }

  cleanVenueName(name) {
    return name
      .replace(/^\W+|\W+$/g, '') // Remove leading/trailing non-word chars
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
  }

  deduplicateVenues(venues) {
    const seen = new Set();
    return venues.filter(venue => {
      const key = `${venue.venue_name.toLowerCase()}_${venue.day_of_week?.toLowerCase() || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  formatForOutput() {
    return this.scraped_data.map(venue => ({
      venueInfo: {
        url: this.weeklyCluesUrl,
        venueTitle: venue.venue_name,
        venueAddress: venue.address,
        venueLinks: {
          website: null,
          social: []
        },
        shows: venue.events,
        provider: this.provider,
        scrapedAt: venue.scraped_at,
        originalData: venue
      }
    }));
  }

  async saveToFile(filename = 'nerdytalk-comprehensive.json') {
    const filepath = `/home/jason/code/trivia/trivia-backend/${filename}`;
    
    const output = {
      provider: this.provider,
      scraped_at: new Date().toISOString(),
      total_locations: this.scraped_data.length,
      locations: this.formatForOutput(),
      raw_venue_data: this.scraped_data
    };

    fs.writeFileSync(filepath, JSON.stringify(output, null, 2));
    console.log(`Data saved to ${filepath}`);
    return filepath;
  }
}

// Main execution
async function main() {
  const scraper = new ComprehensiveNerdyTalkScraper();
  
  try {
    console.log('Starting comprehensive NerdyTalk Trivia scraper...');
    const data = await scraper.scrapeComprehensive();
    
    console.log(`Successfully scraped ${data.length} venues`);
    console.log('\nSample venues:');
    data.slice(0, 5).forEach(venue => {
      console.log(`- ${venue.venue_name} (${venue.events[0]?.day_of_week || 'No day'}) - ${venue.address || 'No address'}`);
    });
    
    // Save to file
    const filepath = await scraper.saveToFile();
    
    console.log('\nScraping completed successfully!');
    console.log(`Output file: ${filepath}`);
    
  } catch (error) {
    console.error('Scraping failed:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default ComprehensiveNerdyTalkScraper;