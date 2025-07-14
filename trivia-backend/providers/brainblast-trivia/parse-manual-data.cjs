const fs = require('fs');
const path = require('path');

class BrainBlastManualParser {
  constructor() {
    this.venues = [];
    this.events = [];
    this.errors = [];
    this.stateAbbr = {
      'ALABAMA': 'AL',
      'GEORGIA': 'GA',
      'INDIANA': 'IN',
      'KENTUCKY': 'KY',
      'TENNESSEE': 'TN'
    };
  }

  parseTime(timeStr) {
    if (!timeStr) return null;
    
    // Clean up time string
    let cleaned = timeStr.trim();
    
    // Handle "(central time)" notation
    cleaned = cleaned.replace(/\(.*?\)/g, '').trim();
    
    // Ensure proper format
    if (!cleaned.includes('am') && !cleaned.includes('pm')) {
      // Assume PM for evening times
      const hour = parseInt(cleaned.split(':')[0]);
      if (hour >= 6 && hour <= 11) {
        cleaned = cleaned + 'pm';
      }
    }
    
    return cleaned;
  }

  parseManualData() {
    const filePath = path.join(__dirname, 'manual-data.txt');
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Split by lines
    const lines = content.split('\n').map(line => line.trim());
    
    let currentState = null;
    let currentStateAbbr = null;
    let currentCity = null;
    let lineIndex = 0;
    
    while (lineIndex < lines.length) {
      const line = lines[lineIndex];
      
      // Skip empty lines and headers
      if (!line || line.includes('===') || line.includes('Day\tTime\tLocation')) {
        lineIndex++;
        continue;
      }
      
      // Check if this is a state header
      if (this.stateAbbr[line]) {
        currentState = line;
        currentStateAbbr = this.stateAbbr[line];
        console.log(`\n📍 Processing ${currentState}`);
        lineIndex++;
        continue;
      }
      
      // Check if this looks like a city (no tabs, not a day of week)
      const days = ['Mon', 'Tues', 'Wed', 'Thurs', 'Fri', 'Sat', 'Sun', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const firstWord = line.split(/\s+/)[0];
      
      if (!line.includes('\t') && !days.includes(firstWord)) {
        currentCity = line;
        console.log(`  🏙️  ${currentCity}`);
        lineIndex++;
        continue;
      }
      
      // Parse venue/event data
      if (line.includes('\t') && currentState && currentCity) {
        const parts = line.split('\t');
        
        if (parts.length >= 5) {
          const [day, time, location, phone, showType] = parts;
          
          // Skip if location is empty or invalid
          if (!location || location.trim() === '') {
            lineIndex++;
            continue;
          }
          
          // Generate unique IDs
          const venueId = `brainblast_${currentStateAbbr}_${currentCity.replace(/\s+/g, '_')}_${location.replace(/\s+/g, '_')}`.toLowerCase();
          const eventId = `${venueId}_${day.replace(/\s+/g, '_')}_${showType.replace(/\s+/g, '_')}`.toLowerCase();
          
          // Check if venue already exists
          if (!this.venues.find(v => v.id === venueId)) {
            this.venues.push({
              id: venueId,
              name_original: location,
              address_original: `${currentCity}, ${currentStateAbbr}`,
              city: currentCity,
              state: currentStateAbbr,
              provider: 'Brain Blast Trivia',
              source_url: 'https://brainblasttrivia.com/where-to-play',
              raw_data: line
            });
          }
          
          // Add event
          this.events.push({
            id: eventId,
            venue_id: venueId,
            provider: 'Brain Blast Trivia',
            event_type: showType || 'Trivia',
            day_of_week: this.normalizeDayOfWeek(day),
            start_time: this.parseTime(time),
            frequency: 'weekly',
            is_active: true,
            source_url: 'https://brainblasttrivia.com/where-to-play',
            notes: line.includes('On summer break') ? 'On summer break' : null
          });
        } else {
          console.warn(`⚠️  Could not parse line: ${line}`);
          this.errors.push({
            line: line,
            error: 'Insufficient fields',
            state: currentState,
            city: currentCity
          });
        }
      }
      
      lineIndex++;
    }
  }

  normalizeDayOfWeek(day) {
    const dayMap = {
      'Mon': 'Monday',
      'Tues': 'Tuesday',
      'Wed': 'Wednesday',
      'Thurs': 'Thursday',
      'Fri': 'Friday',
      'Sat': 'Saturday',
      'Sun': 'Sunday',
      'Monday': 'Monday',
      'Tuesday': 'Tuesday',
      'Wednesday': 'Wednesday',
      'Thursday': 'Thursday',
      'Friday': 'Friday',
      'Saturday': 'Saturday',
      'Sunday': 'Sunday'
    };
    
    return dayMap[day] || day;
  }

  generateReport() {
    console.log('\n📊 PARSING REPORT');
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
    
    // Cities breakdown
    const cityBreakdown = {};
    this.venues.forEach(venue => {
      const key = `${venue.city}, ${venue.state}`;
      cityBreakdown[key] = (cityBreakdown[key] || 0) + 1;
    });
    
    console.log('\nTop cities:');
    Object.entries(cityBreakdown)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([city, count]) => {
        console.log(`  ${city}: ${count} venues`);
      });
    
    // Errors
    if (this.errors.length > 0) {
      console.log('\n❌ Parsing errors:');
      this.errors.slice(0, 5).forEach(error => {
        console.log(`  ${error.city}, ${error.state}: ${error.error}`);
      });
      if (this.errors.length > 5) {
        console.log(`  ... and ${this.errors.length - 5} more errors`);
      }
    }
  }

  saveData() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputDir = path.join(__dirname);
    
    // Save venues
    const venuesFile = path.join(outputDir, `brainblast-venues-manual-${timestamp}.json`);
    fs.writeFileSync(venuesFile, JSON.stringify(this.venues, null, 2));
    console.log(`\n💾 Venues saved: ${venuesFile}`);
    
    // Save events  
    const eventsFile = path.join(outputDir, `brainblast-events-manual-${timestamp}.json`);
    fs.writeFileSync(eventsFile, JSON.stringify(this.events, null, 2));
    console.log(`💾 Events saved: ${eventsFile}`);
    
    // Save errors if any
    if (this.errors.length > 0) {
      const errorsFile = path.join(outputDir, `brainblast-errors-manual-${timestamp}.json`);
      fs.writeFileSync(errorsFile, JSON.stringify(this.errors, null, 2));
      console.log(`💾 Errors saved: ${errorsFile}`);
    }
    
    // Save combined data for import
    const combinedData = {
      provider: 'Brain Blast Trivia',
      scraped_at: new Date().toISOString(),
      source_url: 'Manual data entry from brainblasttrivia.com/where-to-play',
      venues: this.venues,
      events: this.events,
      errors: this.errors,
      stats: {
        total_venues: this.venues.length,
        total_events: this.events.length,
        states_count: Object.keys(this.stateAbbr).length,
        errors_count: this.errors.length
      }
    };
    
    const combinedFile = path.join(outputDir, `brainblast-combined-manual-${timestamp}.json`);
    fs.writeFileSync(combinedFile, JSON.stringify(combinedData, null, 2));
    console.log(`💾 Combined data saved: ${combinedFile}`);
  }

  run() {
    console.log('🚀 Starting Brain Blast manual data parser...');
    this.parseManualData();
    this.generateReport();
    this.saveData();
    console.log('\n✅ Parsing complete!');
  }
}

// Run the parser
if (require.main === module) {
  const parser = new BrainBlastManualParser();
  parser.run();
}

module.exports = BrainBlastManualParser;