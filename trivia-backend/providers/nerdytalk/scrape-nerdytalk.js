import fs from 'fs';
import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * NerdyTalk Trivia Scraper
 * Scrapes location data from http://nerdytalktrivia.com/locations
 * Based on CE_Scraper logic but adapted for NerdyTalk structure
 */

class NerdyTalkScraper {
  constructor() {
    this.baseUrl = 'http://nerdytalktrivia.com';
    this.locationsUrl = 'http://nerdytalktrivia.com/locations';
    this.scraped_data = [];
    this.provider = 'NerdyTalk Trivia';
  }

  async scrapeLocations() {
    try {
      console.log('Fetching locations page...');
      const response = await axios.get(this.locationsUrl, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      
      // Look for location sections - typically organized by state
      const locations = [];
      
      // Try to find state sections or location containers
      $('div, section, p').each((index, element) => {
        const $element = $(element);
        const text = $element.text().trim();
        
        // Look for patterns that indicate venue information
        if (this.isVenueInfo(text)) {
          const venueData = this.extractVenueData($element, $);
          if (venueData) {
            locations.push(venueData);
          }
        }
      });

      // If no locations found with basic approach, try more aggressive parsing
      if (locations.length === 0) {
        console.log('No locations found with basic approach, trying comprehensive parsing...');
        locations.push(...this.parseLocationsSections($));
      }

      console.log(`Found ${locations.length} locations`);
      
      // Format data to match CE scraper output structure
      const formattedData = locations.map(location => ({
        venueInfo: {
          url: this.locationsUrl,
          venueTitle: location.venue_name,
          venueAddress: location.address,
          venueLinks: {
            website: location.website || null,
            social: []
          },
          shows: location.events || [],
          provider: this.provider,
          scrapedAt: new Date().toISOString(),
          originalData: location
        }
      }));

      this.scraped_data = formattedData;
      return formattedData;

    } catch (error) {
      console.error('Error scraping locations:', error.message);
      throw error;
    }
  }

  isVenueInfo(text) {
    // Look for patterns that indicate venue information
    const venuePatterns = [
      /\w+\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
      /\d{1,2}:\d{2}\s?(am|pm)/i,
      /\$\d+/,
      /trivia|bingo|quiz/i,
      /\d+\s+\w+\s+(st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane)/i
    ];
    
    return venuePatterns.some(pattern => pattern.test(text));
  }

  extractVenueData($element, $) {
    const text = $element.text().trim();
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    
    if (lines.length < 2) return null;

    const venueData = {
      venue_name: '',
      address: '',
      events: [],
      day_of_week: '',
      time: '',
      event_type: 'trivia',
      prize_info: ''
    };

    // Try to extract venue name (usually the first substantial line)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip common website elements
      if (line.includes('Home') || line.includes('About') || line.includes('Contact') || 
          line.includes('Menu') || line.includes('©') || line.length < 5) {
        continue;
      }

      // Look for venue name patterns
      if (!venueData.venue_name && line.length > 5 && line.length < 100) {
        // Check if this looks like a venue name
        if (!/^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i.test(line) &&
            !/^\d{1,2}:\d{2}/.test(line) &&
            !/^\$\d+/.test(line)) {
          venueData.venue_name = line;
          continue;
        }
      }

      // Look for day and time information
      const dayMatch = line.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
      if (dayMatch) {
        venueData.day_of_week = dayMatch[1];
        
        // Look for time in the same line
        const timeMatch = line.match(/\d{1,2}:\d{2}\s?(am|pm)/i);
        if (timeMatch) {
          venueData.time = timeMatch[0];
        }
      }

      // Look for address patterns
      const addressMatch = line.match(/\d+\s+[\w\s]+(st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane)/i);
      if (addressMatch && !venueData.address) {
        venueData.address = line;
      }

      // Look for prize information
      const prizeMatch = line.match(/\$\d+/);
      if (prizeMatch) {
        venueData.prize_info = line;
      }
    }

    // Create event object if we have enough information
    if (venueData.venue_name && (venueData.day_of_week || venueData.time)) {
      venueData.events.push({
        date: venueData.day_of_week || 'Unknown',
        time: venueData.time || 'Unknown',
        game: venueData.event_type,
        prize: venueData.prize_info
      });
    }

    return venueData.venue_name ? venueData : null;
  }

  parseLocationsSections($) {
    const locations = [];
    
    // Look for text content that might contain location data
    const textContent = $('body').text();
    const lines = textContent.split('\n').map(line => line.trim()).filter(line => line);
    
    let currentLocation = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip short lines or common website elements
      if (line.length < 5 || line.includes('Home') || line.includes('About') || 
          line.includes('Contact') || line.includes('Menu') || line.includes('©')) {
        continue;
      }

      // Look for state headers (Tennessee, Indiana, Kentucky, North Carolina)
      if (/^(Tennessee|Indiana|Kentucky|North Carolina)$/i.test(line)) {
        // State header found, upcoming lines should be locations
        continue;
      }

      // Try to parse as location data
      const locationData = this.parseLocationLine(line);
      if (locationData) {
        locations.push(locationData);
      }
    }

    return locations;
  }

  parseLocationLine(line) {
    // More aggressive parsing for location information
    const parts = line.split(/\s{2,}|\t/).map(part => part.trim()).filter(part => part);
    
    if (parts.length < 2) return null;

    const location = {
      venue_name: '',
      address: '',
      events: [],
      day_of_week: '',
      time: '',
      event_type: 'trivia',
      prize_info: ''
    };

    // Try to identify different parts
    for (const part of parts) {
      // Day of week
      if (/^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i.test(part)) {
        location.day_of_week = part.split(' ')[0];
        
        // Time might be in the same part
        const timeMatch = part.match(/\d{1,2}:\d{2}\s?(am|pm)/i);
        if (timeMatch) {
          location.time = timeMatch[0];
        }
      }
      
      // Address
      else if (/\d+\s+[\w\s]+(st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane)/i.test(part)) {
        location.address = part;
      }
      
      // Prize information
      else if (/\$\d+/.test(part)) {
        location.prize_info = part;
      }
      
      // Venue name (if not already set and doesn't match other patterns)
      else if (!location.venue_name && part.length > 5 && part.length < 100) {
        location.venue_name = part;
      }
    }

    // Create event if we have enough data
    if (location.venue_name && (location.day_of_week || location.time)) {
      location.events.push({
        date: location.day_of_week || 'Unknown',
        time: location.time || 'Unknown',
        game: location.event_type,
        prize: location.prize_info
      });
    }

    return location.venue_name ? location : null;
  }

  async saveToFile(filename = 'nerdytalk-trivia-data.json') {
    const filepath = `/home/jason/code/trivia/trivia-backend/${filename}`;
    
    const output = {
      provider: this.provider,
      scraped_at: new Date().toISOString(),
      total_locations: this.scraped_data.length,
      locations: this.scraped_data
    };

    fs.writeFileSync(filepath, JSON.stringify(output, null, 2));
    console.log(`Data saved to ${filepath}`);
    return filepath;
  }
}

// Main execution
async function main() {
  const scraper = new NerdyTalkScraper();
  
  try {
    console.log('Starting NerdyTalk Trivia scraper...');
    const data = await scraper.scrapeLocations();
    
    console.log(`Successfully scraped ${data.length} locations`);
    
    // Save to file
    const filepath = await scraper.saveToFile();
    
    console.log('Scraping completed successfully!');
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

export default NerdyTalkScraper;