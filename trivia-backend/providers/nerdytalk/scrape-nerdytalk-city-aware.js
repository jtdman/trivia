import fs from 'fs';
import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * City-Aware NerdyTalk Trivia Scraper
 * Properly associates venues with their cities from the weekly-clues page
 */

class CityAwareNerdyTalkScraper {
  constructor() {
    this.baseUrl = 'http://nerdytalktrivia.com';
    this.locationsUrl = 'http://nerdytalktrivia.com/locations';
    this.weeklyCluesUrl = 'https://nerdytalktrivia.com/weekly-clues/';
    this.scraped_data = [];
    this.provider = 'NerdyTalk Trivia';
  }

  async scrapeComprehensive() {
    try {
      console.log('Starting city-aware NerdyTalk scraping...');
      
      // Step 1: Get venue names with city context from weekly clues page
      const weeklyVenues = await this.scrapeWeeklyCluesWithCities();
      console.log(`Found ${weeklyVenues.length} venues from weekly clues with city context`);
      
      // Step 2: Get detailed venue info from locations page
      const locationDetails = await this.scrapeLocationDetails();
      console.log(`Found ${locationDetails.length} location details`);
      
      // Step 3: Cross-reference and merge data
      const mergedData = this.mergeVenueData(weeklyVenues, locationDetails);
      console.log(`Merged data: ${mergedData.length} complete venues`);
      
      this.scraped_data = mergedData;
      return mergedData;

    } catch (error) {
      console.error('Error in city-aware scraping:', error.message);
      throw error;
    }
  }

  async scrapeWeeklyCluesWithCities() {
    console.log('Fetching weekly clues page with city context...');
    const response = await axios.get(this.weeklyCluesUrl, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const venues = [];
    
    // Extract all text content and parse city sections
    const textContent = $('body').text();
    const lines = textContent.split('\\n').map(line => line.trim()).filter(line => line);
    
    let currentCity = null;
    
    // City patterns like "Nashville, TN" or "Franklin, TN"
    const cityPattern = /^([A-Za-z\\s]+),\\s*(TN|Tennessee)\\s*$/;
    
    // Venue patterns like "Monday, Venue Name" or "Tuesday, Casa Mexicana (Battle Bingo)"
    const venuePatterns = [
      /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\\s+(.+)$/i,
      /^(.+?)\\s*\\((Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\\)$/i,
    ];

    for (const line of lines) {
      // Skip obvious system text
      if (this.isSystemText(line)) continue;
      
      // Check if this line is a city header
      const cityMatch = line.match(cityPattern);
      if (cityMatch) {
        currentCity = cityMatch[1].trim() + ', ' + cityMatch[2];
        console.log(`Found city section: ${currentCity}`);
        continue;
      }
      
      // Check if this line contains a venue
      for (const pattern of venuePatterns) {
        const match = line.match(pattern);
        if (match) {
          let day, venueName;
          
          if (pattern.source.startsWith('^(Monday')) {
            // Day first format: "Monday, Venue Name"
            day = match[1];
            venueName = match[2];
          } else {
            // Venue first format: "Venue Name (Monday)"
            venueName = match[1];
            day = match[2];
          }
          
          venueName = this.cleanVenueName(venueName);
          
          if (this.isValidVenueName(venueName) && currentCity) {
            venues.push({
              venue_name: venueName,
              city: currentCity,
              day_of_week: day,
              source: 'weekly_clues_with_city'
            });
            console.log(`  -> ${day}: ${venueName} in ${currentCity}`);
          }
          break;
        }
      }
    }

    return this.deduplicateVenuesByCity(venues);
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

    // Look for venue blocks on the locations page
    const textContent = $('body').text();
    const chunks = textContent.split(/\\n\\n+/).filter(chunk => chunk.trim().length > 50);

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
    const lines = text.split('\\n').map(line => line.trim()).filter(line => line);
    
    let venueName = null;
    let address = '';
    let dayOfWeek = '';
    let time = '';
    let eventType = 'trivia';
    let host = '';
    let prizeInfo = '';

    for (const line of lines) {
      // Skip system text
      if (this.isSystemText(line)) continue;

      // First substantial line is usually the venue name
      if (!venueName && this.isValidVenueName(line)) {
        venueName = this.cleanVenueName(line);
        continue;
      }

      // Look for address patterns
      if (/\\d+.*(?:st|street|ave|avenue|rd|road|blvd|boulevard|pkwy|parkway|dr|drive|ln|lane|way|circle|cir|ct|court)/i.test(line)) {
        address = line;
      }

      // Look for day patterns
      const dayMatch = line.match(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/i);
      if (dayMatch && !dayOfWeek) {
        dayOfWeek = dayMatch[1];
      }

      // Look for time patterns
      const timeMatch = line.match(/(\\d{1,2}:?\\d{0,2}\\s*(?:AM|PM))/i);
      if (timeMatch) {
        time = timeMatch[1];
      }

      // Look for event type
      if (/bingo/i.test(line) && !/battle/i.test(line)) {
        eventType = 'bingo';
      } else if (/battle.*bingo/i.test(line)) {
        eventType = 'bingo';
        prizeInfo = 'Battle Bingo';
      }

      // Look for host info
      const hostMatch = line.match(/hosted by\\s+(\\w+)/i);
      if (hostMatch) {
        host = hostMatch[1];
      }

      // Look for prize info
      if (/prizes?:/i.test(line)) {
        prizeInfo = line.replace(/prizes?:\\s*/i, '').trim();
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
    const processedKeys = new Set();

    // Process venues from weekly clues (with city context)
    for (const weeklyVenue of weeklyVenues) {
      const key = `${weeklyVenue.venue_name.toLowerCase()}|${weeklyVenue.city.toLowerCase()}`;
      if (processedKeys.has(key)) continue;
      
      // Find matching location details
      const locationMatch = this.findBestMatch(weeklyVenue.venue_name, locationDetails);
      
      const mergedVenue = {
        venue_name: weeklyVenue.venue_name,
        address: this.buildAddress(locationMatch?.address, weeklyVenue.city),
        events: [{
          day_of_week: weeklyVenue.day_of_week || locationMatch?.day_of_week || '',
          start_time: locationMatch?.time || '7:00 PM', // Default time
          event_type: locationMatch?.event_type || 'trivia',
          host: locationMatch?.host || '',
          prize_info: locationMatch?.prize_info || ''
        }],
        provider: this.provider,
        scraped_at: new Date().toISOString()
      };

      merged.push(mergedVenue);
      processedKeys.add(key);
      
      console.log(`Merged: ${mergedVenue.venue_name} (${weeklyVenue.city}) - ${weeklyVenue.day_of_week}`);
    }

    return merged;
  }

  buildAddress(venueAddress, city) {
    if (venueAddress && venueAddress.includes(city.split(',')[0])) {
      // Address already contains city
      return venueAddress;
    } else if (venueAddress) {
      // Add city to existing address
      return `${venueAddress}, ${city}`;
    } else {
      // Just use city
      return city;
    }
  }

  deduplicateVenuesByCity(venues) {
    const seen = new Map();
    const deduplicated = [];
    
    for (const venue of venues) {
      const key = `${venue.venue_name.toLowerCase()}|${venue.city.toLowerCase()}|${venue.day_of_week.toLowerCase()}`;
      
      if (!seen.has(key)) {
        seen.set(key, venue);
        deduplicated.push(venue);
      } else {
        console.log(`Removed duplicate: ${venue.venue_name} in ${venue.city} on ${venue.day_of_week}`);
      }
    }
    
    return deduplicated;
  }

  findBestMatch(venueName, locationDetails) {
    const cleanVenueName = venueName.toLowerCase().replace(/[^\\w\\s]/g, '');
    
    for (const detail of locationDetails) {
      const cleanDetailName = detail.venue_name.toLowerCase().replace(/[^\\w\\s]/g, '');
      
      // Exact match
      if (cleanVenueName === cleanDetailName) {
        return detail;
      }
      
      // Base name match (remove parenthetical content)
      const baseVenueName = cleanVenueName.split('(')[0].trim();
      const baseDetailName = cleanDetailName.split('(')[0].trim();
      
      if (baseVenueName === baseDetailName) {
        return detail;
      }
      
      // Partial match for key words
      const venueWords = baseVenueName.split(/\\s+/).filter(word => word.length > 2);
      const detailWords = baseDetailName.split(/\\s+/).filter(word => word.length > 2);
      
      const matchCount = venueWords.filter(word => detailWords.includes(word)).length;
      if (matchCount >= Math.min(venueWords.length, detailWords.length) * 0.6) {
        return detail;
      }
    }
    
    return null;
  }

  cleanVenueName(name) {
    return name
      .replace(/^[\\s,\\-]+/, '') // Remove leading punctuation
      .replace(/[\\s,\\-]+$/, '') // Remove trailing punctuation
      .replace(/\\s+/g, ' ') // Normalize spaces
      .trim();
  }

  isValidVenueName(name) {
    if (!name || name.length < 3) return false;
    
    // Skip system text patterns
    const skipPatterns = [
      /^(home|about|contact|login|register|search|menu|nav)/i,
      /^(click|select|choose|enter|submit)/i,
      /^(page|section|content|header|footer)/i,
      /^(javascript|css|html|php)/i,
      /^\\d+$/,
      /^[\\s\\-_]+$/
    ];
    
    return !skipPatterns.some(pattern => pattern.test(name));
  }

  isSystemText(text) {
    const systemPatterns = [
      /weekly clues/i,
      /select a state/i,
      /choose location/i,
      /javascript/i,
      /loading/i,
      /please wait/i,
      /error/i,
      /404/i,
      /not found/i,
      /copyright/i,
      /all rights reserved/i,
      /terms of service/i,
      /privacy policy/i,
      /cookies/i,
      /^\\s*$/, // Empty or whitespace only
      /^[\\d\\s\\-\\.]+$/ // Numbers, spaces, dashes, dots only
    ];
    
    return systemPatterns.some(pattern => pattern.test(text));
  }

  async saveData(filename = 'nerdytalk-city-aware-data.json') {
    const outputData = {
      provider: this.provider,
      scraped_at: new Date().toISOString(),
      total_venues: this.scraped_data.length,
      venues: this.scraped_data,
      google_places_format: this.scraped_data.map(venue => ({
        name_original: venue.venue_name,
        address_original: venue.address,
        provider: venue.provider,
        events: venue.events
      }))
    };

    const outputPath = `/home/jason/code/trivia/trivia-backend/providers/nerdytalk/${filename}`;
    await fs.promises.writeFile(outputPath, JSON.stringify(outputData, null, 2));
    console.log(`\\nData saved to: ${outputPath}`);
    console.log(`Total venues scraped: ${this.scraped_data.length}`);
    
    return outputPath;
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const scraper = new CityAwareNerdyTalkScraper();
  
  scraper.scrapeComprehensive()
    .then(() => scraper.saveData())
    .then(() => {
      console.log('City-aware NerdyTalk scraping completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Scraping failed:', error);
      process.exit(1);
    });
}

export default CityAwareNerdyTalkScraper;