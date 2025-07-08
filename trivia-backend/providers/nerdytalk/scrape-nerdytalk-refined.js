import fs from 'fs';
import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * NerdyTalk Trivia Scraper - Refined Version
 * Targets specific venue data structure in http://nerdytalktrivia.com/locations
 */

class NerdyTalkScraperRefined {
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
      
      // Look for state-specific sections
      const locations = [];
      
      // Try to find accordion items or state-specific sections
      $('div[id*="accordion-item"], .accordion-item').each((index, element) => {
        const venueData = this.extractVenueFromAccordion($(element), $);
        if (venueData) {
          locations.push(venueData);
        }
      });

      // If no accordion items found, try parsing by state sections
      if (locations.length === 0) {
        console.log('No accordion items found, trying state-based parsing...');
        
        // Look for common state names in text
        const states = ['Tennessee', 'Indiana', 'Kentucky', 'North Carolina', 'Ohio', 'Georgia', 'Alabama', 'Virginia'];
        
        for (const state of states) {
          const stateLocations = this.extractLocationsByState($, state);
          locations.push(...stateLocations);
        }
      }

      // If still no locations, try the text-based approach with better filtering
      if (locations.length === 0) {
        console.log('No state sections found, trying text-based extraction...');
        locations.push(...this.extractFromText($));
      }

      console.log(`Found ${locations.length} locations`);
      
      // Format data to match expected structure
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

  extractVenueFromAccordion($element, $) {
    const text = $element.text().trim();
    
    // Look for venue name in headings
    const venueName = $element.find('h4, h3, h2').first().text().trim();
    
    if (!venueName || venueName.length < 5) return null;
    
    // Extract location information
    const locationMatch = text.match(/Location:\s*([^*]+?)(?:\*\*|$)/);
    const address = locationMatch ? locationMatch[1].trim() : '';
    
    // Extract day and time
    const dayMatch = text.match(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/i);
    const timeMatch = text.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
    
    // Extract prize information
    const prizeMatch = text.match(/Prizes:\s*([^*]+?)(?:\*\*|$)/);
    const prizeInfo = prizeMatch ? prizeMatch[1].trim() : '';
    
    return {
      venue_name: venueName,
      address: address,
      day_of_week: dayMatch ? dayMatch[1] : '',
      time: timeMatch ? timeMatch[1] : '',
      event_type: 'trivia',
      prize_info: prizeInfo,
      events: [{
        date: dayMatch ? dayMatch[1] : 'Unknown',
        time: timeMatch ? timeMatch[1] : 'Unknown',
        game: 'trivia',
        prize: prizeInfo
      }]
    };
  }

  extractLocationsByState($, state) {
    const locations = [];
    
    // Find text containing the state name
    const stateRegex = new RegExp(`\\b${state}\\b`, 'i');
    $('*').each((index, element) => {
      const $element = $(element);
      const text = $element.text();
      
      if (stateRegex.test(text)) {
        // Look for venue data in this element or its siblings
        const venueData = this.extractVenueFromElement($element, $);
        if (venueData) {
          locations.push(venueData);
        }
      }
    });
    
    return locations;
  }

  extractFromText($) {
    const locations = [];
    const bodyText = $('body').text();
    
    // Split by common delimiters and process each chunk
    const chunks = bodyText.split(/\n\n+|\r\n\r\n+/).filter(chunk => chunk.trim().length > 20);
    
    for (const chunk of chunks) {
      const location = this.parseLocationChunk(chunk);
      if (location && this.isValidVenue(location)) {
        locations.push(location);
      }
    }
    
    return locations;
  }

  parseLocationChunk(chunk) {
    const lines = chunk.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    if (lines.length < 3) return null;
    
    const location = {
      venue_name: '',
      address: '',
      day_of_week: '',
      time: '',
      event_type: 'trivia',
      prize_info: '',
      events: []
    };
    
    // Look for venue name (usually the first substantial line)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip common website elements
      if (this.isWebsiteElement(line)) continue;
      
      // Look for venue name
      if (!location.venue_name && line.length > 5 && line.length < 80) {
        // Check if this looks like a venue name
        if (!/^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i.test(line) &&
            !/^\d{1,2}:\d{2}/.test(line) &&
            !/^(prizes|location):/i.test(line)) {
          location.venue_name = line;
          continue;
        }
      }
      
      // Look for location/address
      if (/location:/i.test(line)) {
        location.address = line.replace(/location:\s*/i, '').trim();
      } else if (/\d+\s+[\w\s]+(st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane)/i.test(line)) {
        location.address = line;
      }
      
      // Look for day and time
      const dayMatch = line.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
      if (dayMatch) {
        location.day_of_week = dayMatch[1];
      }
      
      const timeMatch = line.match(/\d{1,2}:\d{2}\s*(?:am|pm)/i);
      if (timeMatch) {
        location.time = timeMatch[0];
      }
      
      // Look for prize information
      if (/prizes:/i.test(line)) {
        location.prize_info = line.replace(/prizes:\s*/i, '').trim();
      }
    }
    
    // Create event if we have enough information
    if (location.venue_name && (location.day_of_week || location.time)) {
      location.events.push({
        date: location.day_of_week || 'Unknown',
        time: location.time || 'Unknown',
        game: location.event_type,
        prize: location.prize_info
      });
    }
    
    return location;
  }

  isWebsiteElement(line) {
    const websiteElements = [
      'Home', 'About', 'Contact', 'Menu', 'Navigation', 'Footer',
      'Find a Game', 'Find by State', 'Hire Nerdy Talk', 'FIND A GAME',
      'FIND BY STATE', 'HIRE NERDY TALK', 'Privacy Policy', 'Terms of Service'
    ];
    
    return websiteElements.some(element => 
      line.toLowerCase().includes(element.toLowerCase())
    ) || line.length < 5 || line.includes('©');
  }

  isValidVenue(location) {
    return location.venue_name && 
           location.venue_name.length > 5 && 
           location.venue_name.length < 100 &&
           !this.isWebsiteElement(location.venue_name) &&
           (location.address || location.day_of_week || location.time);
  }

  extractVenueFromElement($element, $) {
    const text = $element.text().trim();
    
    // Skip if too short or looks like navigation
    if (text.length < 30 || this.isWebsiteElement(text)) {
      return null;
    }
    
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    
    if (lines.length < 2) return null;
    
    return this.parseLocationChunk(text);
  }

  async saveToFile(filename = 'nerdytalk-trivia-refined.json') {
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
  const scraper = new NerdyTalkScraperRefined();
  
  try {
    console.log('Starting NerdyTalk Trivia refined scraper...');
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

export default NerdyTalkScraperRefined;