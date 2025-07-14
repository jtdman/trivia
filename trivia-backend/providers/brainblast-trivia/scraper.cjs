const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

class BrainBlastScraper {
  constructor() {
    this.baseUrl = 'https://brainblasttrivia.com/where-to-play';
    this.states = ['alabama']; // Test with just one state first
    this.stateAbbr = {
      'alabama': 'AL',
      'georgia': 'GA', 
      'indiana': 'IN',
      'kentucky': 'KY',
      'tennessee': 'TN'
    };
    this.venues = [];
    this.events = [];
    this.errors = [];
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  parseDay(dayStr) {
    if (!dayStr) return null;
    
    const dayMap = {
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
    };

    const cleaned = dayStr.toLowerCase().trim();
    return dayMap[cleaned] || dayStr;
  }

  parseTime(timeStr) {
    if (!timeStr) return null;
    
    // Handle various time formats
    let cleaned = timeStr.toLowerCase().trim();
    
    // Remove extra spaces and normalize
    cleaned = cleaned.replace(/\s+/g, ' ');
    
    // Convert common formats to HH:MM format
    if (cleaned.includes('pm') || cleaned.includes('am')) {
      return cleaned;
    }
    
    // Add pm if time looks like evening hour without am/pm
    if (/^\d{1,2}(:\d{2})?$/.test(cleaned)) {
      const hour = parseInt(cleaned.split(':')[0]);
      if (hour >= 6 && hour <= 11) {
        return cleaned + ' pm';
      }
    }
    
    return timeStr;
  }

  parseShowType(showTypeStr) {
    if (!showTypeStr) return 'Trivia';
    
    const cleaned = showTypeStr.trim();
    
    // Map to standard show types
    const typeMap = {
      'trivia': 'Trivia',
      'survey time showdown': 'Survey Time Showdown', 
      'bingo': 'Bingo',
      'singo': 'Singo',
      'music bingo': 'Music Bingo'
    };
    
    const lower = cleaned.toLowerCase();
    return typeMap[lower] || cleaned;
  }

  cleanVenueName(nameStr) {
    if (!nameStr) return null;
    
    // Remove phone numbers, addresses, and extra info
    let cleaned = nameStr.replace(/\d{3}[.-]?\d{3}[.-]?\d{4}/g, ''); // Remove phone numbers
    cleaned = cleaned.replace(/\([^)]*\)/g, ''); // Remove parenthetical info
    cleaned = cleaned.replace(/\s+/g, ' ').trim(); // Normalize spaces
    
    return cleaned || null;
  }

  parseVenueData(rawText, city, state) {
    const lines = rawText.split('\n').map(line => line.trim()).filter(line => line);
    const venues = [];
    
    let currentVenue = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip obvious headers or city names
      if (line.toLowerCase().includes(city.toLowerCase()) && lines.length > 3) {
        continue;
      }
      
      // Check if this looks like a day (Monday, Tuesday, etc)
      const dayPattern = /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)/i;
      
      if (dayPattern.test(line)) {
        // This starts a new venue entry
        const parts = line.split(/\s+/);
        const day = this.parseDay(parts[0]);
        
        // Try to extract time, venue name from the rest
        const remaining = parts.slice(1).join(' ');
        const timePattern = /(\d{1,2}:\d{2}\s?(?:am|pm)|\d{1,2}\s?(?:am|pm))/i;
        const timeMatch = remaining.match(timePattern);
        
        let venueName = remaining;
        let time = null;
        
        if (timeMatch) {
          time = this.parseTime(timeMatch[0]);
          venueName = remaining.replace(timeMatch[0], '').trim();
        }
        
        // Clean up venue name
        venueName = this.cleanVenueName(venueName);
        
        if (venueName) {
          currentVenue = {
            name: venueName,
            city: city,
            state: state,
            day: day,
            time: time,
            showType: 'Trivia', // Default
            rawText: line
          };
          venues.push(currentVenue);
        }
      } else if (currentVenue && line.toLowerCase().includes('bingo')) {
        currentVenue.showType = this.parseShowType(line);
      } else if (currentVenue && (line.toLowerCase().includes('survey') || line.toLowerCase().includes('showdown'))) {
        currentVenue.showType = 'Survey Time Showdown';
      }
    }
    
    return venues;
  }

  async scrapeState(stateName) {
    console.log(`\n📍 Scraping ${stateName.toUpperCase()}...`);
    
    try {
      const url = `${this.baseUrl}/${stateName}/`;
      console.log(`Fetching: ${url}`);
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none'
        },
        timeout: 15000
      });
      
      const $ = cheerio.load(response.data);
      const stateAbbr = this.stateAbbr[stateName];
      
      // Find the main content area - try multiple selectors
      let contentArea = $('.entry-content').first();
      if (!contentArea.length) contentArea = $('.content').first();
      if (!contentArea.length) contentArea = $('.main-content').first();
      if (!contentArea.length) contentArea = $('.page-content').first();
      if (!contentArea.length) contentArea = $('#content').first();
      if (!contentArea.length) contentArea = $('.post-content').first();
      if (!contentArea.length) contentArea = $('main').first();
      if (!contentArea.length) contentArea = $('.single-content').first();
      if (!contentArea.length) contentArea = $('body').first(); // Last resort
      
      // Removed debug logging and HTML file generation
      
      if (!contentArea.length) {
        console.error(`⚠️  Could not find any content area for ${stateName}`);
        this.errors.push({
          state: stateName,
          error: 'Content area not found',
          url: url
        });
        return;
      }
      
      // Extract all text and try to parse venue information
      const rawText = contentArea.text();
      
      // Split by common city indicators or large gaps
      const sections = rawText.split(/\n\s*\n/);
      
      let venueCount = 0;
      
      for (const section of sections) {
        if (section.trim().length < 10) continue;
        
        // Try to identify city name (usually appears before venue listings)
        const lines = section.split('\n').map(line => line.trim()).filter(line => line);
        
        if (lines.length === 0) continue;
        
        // Look for patterns that suggest this is a city section
        let cityName = null;
        
        // First line might be the city name if it's short and doesn't contain day/time info
        const firstLine = lines[0];
        if (firstLine.length < 30 && !firstLine.match(/monday|tuesday|wednesday|thursday|friday|saturday|sunday/i)) {
          cityName = firstLine;
        }
        
        // If no clear city found, try to extract from context
        if (!cityName) {
          // Look for capitalized words that might be city names
          for (const line of lines.slice(0, 3)) {
            const words = line.split(' ');
            for (const word of words) {
              if (word.match(/^[A-Z][a-z]+$/) && word.length > 3) {
                cityName = word;
                break;
              }
            }
            if (cityName) break;
          }
        }
        
        if (!cityName) {
          cityName = `Unknown City ${Math.random().toString(36).substr(2, 5)}`;
        }
        
        // Parse venue data from this section
        const sectionVenues = this.parseVenueData(section, cityName, stateAbbr);
        
        for (const venue of sectionVenues) {
          // Generate unique IDs
          const venueId = `brainblast_${stateName}_${venue.city.replace(/\s+/g, '_')}_${venue.name.replace(/\s+/g, '_')}`.toLowerCase();
          const eventId = `${venueId}_${venue.day}_${venue.showType.replace(/\s+/g, '_')}`.toLowerCase();
          
          // Add to venues array
          this.venues.push({
            id: venueId,
            name_original: venue.name,
            address_original: `${venue.city}, ${venue.state}`, // Will be enhanced by Google
            city: venue.city,
            state: venue.state,
            provider: 'Brain Blast Trivia',
            source_url: url,
            raw_data: venue.rawText
          });
          
          // Add to events array
          this.events.push({
            id: eventId,
            venue_id: venueId,
            provider: 'Brain Blast Trivia',
            event_type: venue.showType,
            day_of_week: venue.day,
            start_time: venue.time,
            frequency: 'weekly',
            is_active: true,
            source_url: url
          });
          
          venueCount++;
        }
      }
      
      console.log(`✅ ${stateName}: Found ${venueCount} venues`);
      
      // Rate limiting
      await this.delay(1000);
      
    } catch (error) {
      console.error(`❌ Error scraping ${stateName}:`, error.message);
      this.errors.push({
        state: stateName,
        error: error.message,
        url: `${this.baseUrl}/${stateName}/`
      });
    }
  }

  async scrapeAll() {
    console.log('🚀 Starting Brain Blast Trivia scraper...');
    console.log(`Scraping ${this.states.length} states: ${this.states.join(', ')}`);
    
    for (const state of this.states) {
      await this.scrapeState(state);
    }
    
    this.generateReport();
    this.saveData();
  }

  generateReport() {
    console.log('\n📊 SCRAPING REPORT');
    console.log('==================');
    console.log(`Total venues found: ${this.venues.length}`);
    console.log(`Total events found: ${this.events.length}`);
    console.log(`Errors encountered: ${this.errors.length}`);
    
    // Breakdown by state
    const stateBreakdown = {};
    this.venues.forEach(venue => {
      stateBreakdown[venue.state] = (stateBreakdown[venue.state] || 0) + 1;
    });
    
    console.log('\nVenues by state:');
    Object.entries(stateBreakdown).forEach(([state, count]) => {
      console.log(`  ${state}: ${count} venues`);
    });
    
    // Show types breakdown
    const showTypes = {};
    this.events.forEach(event => {
      showTypes[event.event_type] = (showTypes[event.event_type] || 0) + 1;
    });
    
    console.log('\nShow types:');
    Object.entries(showTypes).forEach(([type, count]) => {
      console.log(`  ${type}: ${count} events`);
    });
    
    // Errors
    if (this.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.errors.forEach(error => {
        console.log(`  ${error.state}: ${error.error}`);
      });
    }
    
    // Validation concerns
    const concerns = [];
    
    // Check for venues without proper names
    const noNameVenues = this.venues.filter(v => !v.name_original || v.name_original.length < 3);
    if (noNameVenues.length > 0) {
      concerns.push(`${noNameVenues.length} venues with questionable names`);
    }
    
    // Check for events without times
    const noTimeEvents = this.events.filter(e => !e.start_time);
    if (noTimeEvents.length > 0) {
      concerns.push(`${noTimeEvents.length} events without start times`);
    }
    
    // Check for events without days
    const noDayEvents = this.events.filter(e => !e.day_of_week);
    if (noDayEvents.length > 0) {
      concerns.push(`${noDayEvents.length} events without day of week`);
    }
    
    if (concerns.length > 0) {
      console.log('\n⚠️  Validation concerns:');
      concerns.forEach(concern => console.log(`  ${concern}`));
    } else {
      console.log('\n✅ Data validation looks good!');
    }
  }

  saveData() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputDir = path.join(__dirname);
    
    // Save venues
    const venuesFile = path.join(outputDir, `brainblast-venues-${timestamp}.json`);
    fs.writeFileSync(venuesFile, JSON.stringify(this.venues, null, 2));
    console.log(`\n💾 Venues saved: ${venuesFile}`);
    
    // Save events  
    const eventsFile = path.join(outputDir, `brainblast-events-${timestamp}.json`);
    fs.writeFileSync(eventsFile, JSON.stringify(this.events, null, 2));
    console.log(`💾 Events saved: ${eventsFile}`);
    
    // Save errors report
    if (this.errors.length > 0) {
      const errorsFile = path.join(outputDir, `brainblast-errors-${timestamp}.json`);
      fs.writeFileSync(errorsFile, JSON.stringify(this.errors, null, 2));
      console.log(`💾 Errors saved: ${errorsFile}`);
    }
    
    // Save combined data for import
    const combinedData = {
      provider: 'Brain Blast Trivia',
      scraped_at: new Date().toISOString(),
      source_url: 'https://brainblasttrivia.com/where-to-play',
      venues: this.venues,
      events: this.events,
      errors: this.errors,
      stats: {
        total_venues: this.venues.length,
        total_events: this.events.length,
        states_scraped: this.states.length,
        errors_count: this.errors.length
      }
    };
    
    const combinedFile = path.join(outputDir, `brainblast-combined-${timestamp}.json`);
    fs.writeFileSync(combinedFile, JSON.stringify(combinedData, null, 2));
    console.log(`💾 Combined data saved: ${combinedFile}`);
  }
}

// Run the scraper if called directly
if (require.main === module) {
  const scraper = new BrainBlastScraper();
  scraper.scrapeAll().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = BrainBlastScraper;