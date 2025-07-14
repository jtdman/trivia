import { supabase } from '../../supabase/config/supabase.js'
import fs from 'fs/promises'
import path from 'path'

interface BrainBlastVenue {
  id: string
  name_original: string
  address_original: string
  city: string
  state: string
  provider: string
  source_url: string
  raw_data: string
}

interface BrainBlastEvent {
  id: string
  venue_id: string
  provider: string
  event_type: string
  day_of_week: string
  start_time: string | null
  frequency: string
  is_active: boolean
  source_url: string
  notes?: string | null
}

interface BrainBlastData {
  provider: string
  scraped_at: string
  source_url: string
  venues: BrainBlastVenue[]
  events: BrainBlastEvent[]
  errors: any[]
  stats: any
}

interface ImportOptions {
  dryRun?: boolean
  dataFile?: string
}

class BrainBlastImporter {
  private brainBlastProviderId: string | null = null

  private parseTimeToPostgres(timeStr: string | null): string | null {
    if (!timeStr) return null
    
    // Clean the time string
    let cleaned = timeStr.toLowerCase().trim()
    
    // Handle special cases
    if (cleaned.includes('on summer break') || cleaned.includes('bi-weekly')) {
      return null
    }
    
    // Extract just the time part (remove any extra text)
    const timeMatch = cleaned.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)/i)
    if (!timeMatch) {
      // Try to match just hour with am/pm
      const hourMatch = cleaned.match(/(\d{1,2})\s*(am|pm)/i)
      if (hourMatch) {
        const hour = parseInt(hourMatch[1])
        const ampm = hourMatch[2].toLowerCase()
        const hour24 = ampm === 'pm' && hour !== 12 ? hour + 12 : 
                      ampm === 'am' && hour === 12 ? 0 : hour
        return `${hour24.toString().padStart(2, '0')}:00:00`
      }
      return null
    }
    
    const hour = parseInt(timeMatch[1])
    const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0
    const ampm = timeMatch[3].toLowerCase()
    
    // Convert to 24-hour format
    let hour24 = hour
    if (ampm === 'pm' && hour !== 12) {
      hour24 = hour + 12
    } else if (ampm === 'am' && hour === 12) {
      hour24 = 0
    }
    
    return `${hour24.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`
  }

  async getBrainBlastProviderId(): Promise<string> {
    if (this.brainBlastProviderId) return this.brainBlastProviderId

    // Check if Brain Blast Trivia provider exists
    const { data: existing } = await supabase
      .from('trivia_providers')
      .select('id')
      .eq('name', 'Brain Blast Trivia')
      .single()

    if (existing) {
      this.brainBlastProviderId = existing.id
      return existing.id
    }

    // Create the provider if it doesn't exist
    const { data, error } = await supabase
      .from('trivia_providers')
      .insert({
        name: 'Brain Blast Trivia',
        website: 'https://brainblasttrivia.com',
        contact_info: {
          website: 'https://brainblasttrivia.com/where-to-play',
          description: 'Brain Blast Trivia provides trivia, bingo, and music-based entertainment across multiple states.',
          service_areas: ['AL', 'GA', 'IN', 'KY', 'TN']
        },
        is_active: true
      })
      .select('id')
      .single()

    if (error) {
      throw new Error(`Failed to create Brain Blast Trivia provider: ${error.message}`)
    }

    this.brainBlastProviderId = data.id
    console.log(`✅ Created Brain Blast Trivia provider with ID: ${data.id}`)
    return data.id
  }

  async loadBrainBlastData(filePath: string): Promise<BrainBlastData> {
    try {
      const fileContent = await fs.readFile(filePath, 'utf-8')
      return JSON.parse(fileContent)
    } catch (error) {
      throw new Error(`Failed to load Brain Blast data from ${filePath}: ${error}`)
    }
  }

  async importVenues(venues: BrainBlastVenue[], options: ImportOptions = {}): Promise<number> {
    const providerId = await this.getBrainBlastProviderId()
    let importedCount = 0
    let skippedCount = 0

    console.log(`\n📍 Importing ${venues.length} venues...`)

    for (const venue of venues) {
      // Check if venue already exists
      const { data: existing } = await supabase
        .from('venues')
        .select('id')
        .eq('name_original', venue.name_original)
        .eq('address_original', venue.address_original)
        .single()

      if (existing) {
        console.log(`  ⏭️  Skipping existing venue: ${venue.name_original}`)
        skippedCount++
        continue
      }

      if (options.dryRun) {
        console.log(`  🔍 [DRY RUN] Would import: ${venue.name_original} in ${venue.city}, ${venue.state}`)
        importedCount++
        continue
      }

      // Import new venue
      const { error } = await supabase
        .from('venues')
        .insert({
          name_original: venue.name_original,
          address_original: venue.address_original,
          verification_status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (error) {
        console.error(`  ❌ Failed to import venue ${venue.name_original}: ${error.message}`)
        continue
      }

      console.log(`  ✅ Imported: ${venue.name_original} in ${venue.city}, ${venue.state}`)
      importedCount++
    }

    console.log(`\n📊 Venue Import Summary:`)
    console.log(`  ✅ Imported: ${importedCount}`)
    console.log(`  ⏭️  Skipped (existing): ${skippedCount}`)
    console.log(`  📍 Total processed: ${venues.length}`)

    return importedCount
  }

  async importEvents(events: BrainBlastEvent[], venues: BrainBlastVenue[], options: ImportOptions = {}): Promise<number> {
    console.log(`\n🎯 Importing ${events.length} events...`)
    let importedCount = 0
    let skippedCount = 0
    let errorCount = 0

    // Create a mapping of venue IDs to venue names for lookup
    const venueMap = new Map<string, string>()
    venues.forEach(venue => {
      venueMap.set(venue.id, venue.name_original)
    })

    for (const event of events) {
      // Get the venue name from our venue mapping
      const venueName = venueMap.get(event.venue_id)
      if (!venueName) {
        console.error(`  ❌ Venue mapping not found for event: ${event.id}`)
        errorCount++
        continue
      }

      // Get the venue ID from the database
      const { data: venue } = await supabase
        .from('venues')
        .select('id')
        .eq('name_original', venueName)
        .single()

      if (!venue) {
        console.error(`  ❌ Venue not found in database: ${venueName}`)
        errorCount++
        continue
      }

      // Check if event already exists
      const { data: existing } = await supabase
        .from('events')
        .select('id')
        .eq('venue_id', venue.id)
        .eq('event_type', event.event_type)
        .eq('day_of_week', event.day_of_week)
        .single()

      if (existing) {
        skippedCount++
        continue
      }

      if (options.dryRun) {
        console.log(`  🔍 [DRY RUN] Would import: ${event.event_type} on ${event.day_of_week} at ${event.start_time}`)
        importedCount++
        continue
      }

      // Parse the time to PostgreSQL format
      const parsedTime = this.parseTimeToPostgres(event.start_time)
      
      if (!parsedTime) {
        console.warn(`  ⚠️  Skipping event with invalid time: ${event.start_time}`)
        continue
      }

      // Import new event
      const { error } = await supabase
        .from('events')
        .insert({
          venue_id: venue.id,
          provider_id: await this.getBrainBlastProviderId(),
          event_type: event.event_type,
          day_of_week: event.day_of_week,
          start_time: parsedTime,
          frequency: event.frequency,
          is_active: event.is_active,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (error) {
        console.error(`  ❌ Failed to import event: ${error.message}`)
        errorCount++
        continue
      }

      importedCount++
    }

    console.log(`\n📊 Event Import Summary:`)
    console.log(`  ✅ Imported: ${importedCount}`)
    console.log(`  ⏭️  Skipped (existing): ${skippedCount}`)
    console.log(`  ❌ Errors: ${errorCount}`)
    console.log(`  🎯 Total processed: ${events.length}`)

    return importedCount
  }

  async run(options: ImportOptions = {}) {
    console.log('🚀 Starting Brain Blast Trivia import...')

    // Find the most recent combined data file
    const dataDir = path.dirname(new URL(import.meta.url).pathname)
    const files = await fs.readdir(dataDir)
    const combinedFiles = files
      .filter(f => f.startsWith('brainblast-combined-manual-') && f.endsWith('.json'))
      .sort()
      .reverse()

    if (combinedFiles.length === 0) {
      throw new Error('No Brain Blast combined data files found. Run the manual parser first.')
    }

    const dataFile = options.dataFile || path.join(dataDir, combinedFiles[0])
    console.log(`📂 Loading data from: ${dataFile}`)

    const data = await this.loadBrainBlastData(dataFile)
    
    console.log(`\n📊 Data Summary:`)
    console.log(`  📍 Venues: ${data.venues.length}`)
    console.log(`  🎯 Events: ${data.events.length}`)
    console.log(`  📅 Scraped: ${data.scraped_at}`)
    console.log(`  🌐 Source: ${data.source_url}`)

    if (options.dryRun) {
      console.log(`\n🔍 DRY RUN MODE - No changes will be made`)
    }

    // Import venues first
    await this.importVenues(data.venues, options)

    // Import events
    await this.importEvents(data.events, data.venues, options)

    console.log(`\n✅ Brain Blast Trivia import complete!`)
    
    if (!options.dryRun) {
      console.log(`\n🔍 Next steps:`)
      console.log(`  1. Run Google validation: pnpm validate-places validate --pending --limit 50`)
      console.log(`  2. Review validation results`)
      console.log(`  3. Process any failed validations manually`)
    }
  }
}

// CLI handling
const args = process.argv.slice(2)
const options: ImportOptions = {
  dryRun: args.includes('--dry-run'),
  dataFile: args.find(arg => arg.startsWith('--file='))?.split('=')[1]
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  const importer = new BrainBlastImporter()
  importer.run(options).catch(error => {
    console.error('Import failed:', error)
    process.exit(1)
  })
}

export default BrainBlastImporter